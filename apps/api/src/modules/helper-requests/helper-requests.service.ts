import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '@/database/database.service';
import { SessionTier } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from '../payments/payments.service';
import Stripe from 'stripe';

@Injectable()
export class HelperRequestsService {
  private stripe: Stripe;

  constructor(
    private db: DatabaseService,
    private payments: PaymentsService,
    private config: ConfigService,
  ) {
    this.stripe = new Stripe(config.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-04-10',
    });
  }

  async create(originalDevId: string, dto: {
    originalSessionId: string;
    questionId: string;
    role: string;
    scopeDescription?: string;
    tier: SessionTier;
  }) {
    const session = await this.db.session.findFirst({
      where: { id: dto.originalSessionId, developerId: originalDevId, status: 'ACTIVE' },
      include: { question: true },
    });
    if (!session) throw new NotFoundException('Active session not found');

    const existing = await this.db.helperRequest.findFirst({
      where: {
        originalSessionId: dto.originalSessionId,
        status: { in: ['OPEN', 'RESPONDED', 'ACCEPTED', 'PAID', 'ACTIVE'] },
      },
    });
    if (existing) throw new BadRequestException('An active helper request already exists for this session');

    return this.db.helperRequest.create({
      data: {
        originalSessionId: dto.originalSessionId,
        originalDevId,
        userId: session.question.userId,
        questionId: dto.questionId,
        role: dto.role as any,
        scopeDescription: dto.scopeDescription,
        tier: dto.tier,
        status: 'OPEN',
      },
    });
  }

  async getFeed(devId: string) {
    const requests = await this.db.helperRequest.findMany({
      where: { status: 'OPEN' },
      include: {
      question: { select: { id: true, title: true, description: true, stackTags: true } },
        originalDev: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return requests.map(r => ({
      ...r,
      isHelperRequest: true,
      isOwnRequest: r.originalDevId === devId,
    }));
  }

  async respond(helperRequestId: string, helperDevId: string) {
    const req = await this.db.helperRequest.findUnique({ where: { id: helperRequestId } });
    if (!req) throw new NotFoundException('Helper request not found');
    if (req.status !== 'OPEN') throw new BadRequestException('Helper request is no longer open');
    if (req.originalDevId === helperDevId) throw new ForbiddenException('Cannot respond to your own helper request');
    return this.db.helperRequest.update({
      where: { id: helperRequestId },
      data: { status: 'RESPONDED', helperDevId },
    });
  }

 async accept(helperRequestId: string, userId: string) {
  const req = await this.db.helperRequest.findUnique({
    where: { id: helperRequestId },
    include: { question: { select: { title: true } } },
  });
  if (!req) throw new NotFoundException('Helper request not found');
  if (req.userId !== userId) throw new ForbiddenException('Not your request');
  if (req.status !== 'RESPONDED') throw new BadRequestException('No helper has responded yet');

  const TIER_AMOUNTS: Record<string, number> = {
    QUICK_FOLLOWUP: 750, FIFTEEN_MIN: 3000, FULL_SOLUTION: 7500,
    FIVE: 750, TWENTY: 3000, FIFTY_PLUS: 7500,
  }
  const amountCents = TIER_AMOUNTS[req.tier] || 3000

  const user = await this.db.user.findUnique({ where: { id: userId } })
  const customerId = await this.payments.getOrCreateCustomer(userId, user!.email)

  const session = await this.stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: amountCents,
        product_data: {
          name: `PopStack Helper Session`,
          description: `Helper for: ${req.question?.title || 'your session'}`,
        },
      },
      quantity: 1,
    }],
    mode: 'payment',
    payment_intent_data: {
      capture_method: 'manual',
      metadata: {
        type: 'helper_session',
        helperRequestId,
        userId,
        tier: req.tier,
      },
    },
    success_url: `${process.env.APP_URL}/threads/${req.originalSessionId}?helper=success`,
    cancel_url: `${process.env.APP_URL}/threads/${req.originalSessionId}?helper=cancelled`,
    metadata: {
      type: 'helper_session',
      helperRequestId,
      userId,
      tier: req.tier,
    },
  })

  return { checkoutUrl: session.url }
}

  async decline(helperRequestId: string, userId: string) {
    const req = await this.db.helperRequest.findUnique({ where: { id: helperRequestId } });
    if (!req) throw new NotFoundException('Helper request not found');
    if (req.userId !== userId) throw new ForbiddenException('Not your request');
    if (!['RESPONDED', 'ACCEPTED'].includes(req.status)) throw new BadRequestException('Cannot decline at this stage');
    return this.db.helperRequest.update({
      where: { id: helperRequestId },
      data: { status: 'DECLINED', helperDevId: null },
    });
  }

  async markPaid(helperRequestId: string, stripePaymentIntentId: string, helperSessionId: string) {
    return this.db.helperRequest.update({
      where: { id: helperRequestId },
      data: { status: 'PAID', stripePaymentIntentId, helperSessionId },
    });
  }

  async activate(helperRequestId: string) {
    return this.db.helperRequest.update({
      where: { id: helperRequestId },
      data: { status: 'ACTIVE' },
    });
  }

  async complete(helperRequestId: string, helperDevId: string) {
    const req = await this.db.helperRequest.findUnique({ where: { id: helperRequestId } });
    if (!req) throw new NotFoundException('Helper request not found');
    if (req.helperDevId !== helperDevId) throw new ForbiddenException('Not your helper request');
    if (req.status !== 'ACTIVE') throw new BadRequestException('Helper request is not active');
    return this.db.helperRequest.update({
      where: { id: helperRequestId },
      data: { status: 'COMPLETED' },
    });
  }

  async getBySession(originalSessionId: string) {
    return this.db.helperRequest.findFirst({
      where: { originalSessionId },
      include: {
        helperDev: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async getMyHelperJobs(helperDevId: string) {
    return this.db.helperRequest.findMany({
      where: { helperDevId, status: { in: ['ACTIVE', 'COMPLETED', 'PAID'] } },
      include: {
        question: { select: { id: true, title: true } },
        originalDev: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
