import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@/database/database.service';
import { PaymentsService } from '../payments/payments.service';
import Stripe from 'stripe';
import { Cron, CronExpression } from '@nestjs/schedule'

const TIER_AMOUNTS: Record<string, number> = {
  QUICK_FOLLOWUP: 750,
  FIFTEEN_MIN:    3000,
  FULL_SOLUTION:  7500,
  FIVE:           750,
  TWENTY:         3000,
  FIFTY_PLUS:     7500,
}

const TIER_SECONDS: Record<string, number> = {
  QUICK_FOLLOWUP: 0,
  FIFTEEN_MIN:    900,
  FULL_SOLUTION:  0,
};

const TIER_LABELS: Record<string, string> = {
  QUICK_FOLLOWUP: 'Quick follow-up',
  FIFTEEN_MIN:    '15 min session',
  FULL_SOLUTION:  'Full solution',
  FIVE:           'Quick follow-up',
  TWENTY:         '15 min session',
  FIFTY_PLUS:     'Full solution',
}

@Injectable()
export class SessionsService {
  private stripe: Stripe;

  constructor(
    private readonly db: DatabaseService,
    private readonly payments: PaymentsService,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(config.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-04-10',
    });
  }

  // Add inside SessionsService class:
@Cron(CronExpression.EVERY_HOUR)
async autoReleaseExpiredSessions() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24h ago

  const expired = await this.db.session.findMany({
    where: {
      status: 'ENDED',
      endedAt: { lt: cutoff },
      escrowStatus: 'HELD',
    },
  })

  for (const session of expired) {
    try {
      await this.payments.transferToDeveloper(
        session.stripePaymentIntentId!,
        session.developerId,
        session.id,
      )
      await this.db.session.update({
        where: { id: session.id },
        data: { escrowStatus: 'RELEASED' },
      })
      await this.db.question.update({
        where: { id: session.questionId },
        data: { status: 'CLOSED' },
      })
    } catch (err) {
      console.error(`Auto-release failed for session ${session.id}:`, err)
    }
  }
}

  async createCheckoutSession(userId: string, dto: { questionId: string; tier: string }) {
    const question = await this.db.question.findUnique({
      where: { id: dto.questionId },
      include: { responses: { include: { developer: true } } },
    });
    if (!question) throw new NotFoundException('Question not found');
    if (question.status !== 'LOCKED') throw new BadRequestException('Question is not locked');

    const amountCents = TIER_AMOUNTS[dto.tier] || 3000;
    const response = question.responses?.[0];
    const devName = response?.developer?.name || 'a Stacker';

    const user = await this.db.user.findUnique({ where: { id: userId } });
    const customerId = await this.payments.getOrCreateCustomer(userId, user!.email);

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: `PopStack Session with ${devName}`,
            description: `${TIER_LABELS[dto.tier]} — ${question.title}`,
          },
        },
        quantity: 1,
      }],
      mode: 'payment',
      payment_intent_data: {
        capture_method: 'manual',
        metadata: {
          questionId: dto.questionId,
          userId,
          tier: dto.tier,
          type: 'session',
        },
      },
      success_url: `${process.env.APP_URL}/question/${dto.questionId}?session=success`,
      cancel_url: `${process.env.APP_URL}/question/${dto.questionId}?session=cancelled`,
      metadata: {
        questionId: dto.questionId,
        userId,
        tier: dto.tier,
      },
    });

    return { checkoutUrl: session.url };
  }

  async create(userId: string, dto: { questionId: string; tier: string; proposalId?: string }) {
    const question = await this.db.question.findUnique({ where: { id: dto.questionId } });
    if (!question) throw new NotFoundException('Question not found');
    if (question.status !== 'LOCKED') throw new BadRequestException('Question is not locked — no preview response yet');

    let amountCents = TIER_AMOUNTS[dto.tier] || 3000;
    if (dto.proposalId) {
      const proposal = await this.db.proposal.findUnique({ where: { id: dto.proposalId } });
      if (!proposal || proposal.status !== 'ACCEPTED') {
        throw new BadRequestException('Proposal must be accepted before creating session');
      }
      amountCents = proposal.totalPriceCents;
    }

    const pi = await this.payments.createHold(amountCents, {
      questionId: dto.questionId,
      userId,
      tier: dto.tier,
    });

    const session = await this.db.session.create({
      data: {
        questionId: dto.questionId,
        userId,
        developerId: question.preSelectedDevId || await this.getResponseDev(dto.questionId),
        tier: dto.tier as any,
        status: 'PENDING_ACCEPT',
        durationSeconds: TIER_SECONDS[dto.tier] || 0,
        stripePaymentIntentId: pi.id,
        escrowStatus: 'HELD',
        proposalId: dto.proposalId,
      },
    });

    await this.db.question.update({
      where: { id: dto.questionId },
      data: { status: 'AWAITING_ACCEPT' },
    });

    return session;
  }

  async getById(id: string) {
  return this.db.session.findUnique({
    where: { id },
    include: {
      question: { select: { id: true, title: true, url: true, fingerprint: true } },
      user: { select: { id: true, name: true, avgRating: true, badges: true } },
    },
  });
  }
  
  async accept(sessionId: string, developerId: string) {
  const session = await this.getSession(sessionId)
  if (session.developerId !== developerId) throw new ForbiddenException()
  if (session.status !== 'PENDING_ACCEPT') throw new BadRequestException('Session not awaiting acceptance')

  await this.payments.capture(session.stripePaymentIntentId!)

  await this.db.session.update({
    where: { id: sessionId },
    data: { status: 'ACTIVE', startedAt: new Date(), escrowStatus: 'HELD' },
  })

  await this.db.question.update({
    where: { id: session.questionId },
    data: { status: 'AWAITING_ACCEPT' },
  })

  await this.db.thread.updateMany({
    where: { sessionId },
    data: {
      devSection: 'ACTIVE_WORK',
      status: 'ACTIVE',
    },
  })

  return { message: 'Session accepted' }
}

  async decline(sessionId: string, developerId: string) {
    const session = await this.getSession(sessionId);
    if (session.developerId !== developerId) throw new ForbiddenException();
    if (session.status !== 'PENDING_ACCEPT') throw new BadRequestException();

    await this.payments.cancel(session.stripePaymentIntentId!);

    await this.db.session.update({
      where: { id: sessionId },
      data: { status: 'CANCELLED', escrowStatus: 'REFUNDED' },
    });

    await this.db.question.update({
      where: { id: session.questionId },
      data: { status: 'LOCKED' },
    });

    return { message: 'Session declined, question re-opened' };
  }

async complete(sessionId: string, developerId: string) {
  const session = await this.getSession(sessionId);
  if (session.developerId !== developerId) throw new ForbiddenException();
  if (session.status !== 'ACTIVE') throw new BadRequestException('Session is not active');

  // Enforce helper must complete first
  const pendingHelper = await this.db.helperRequest.findFirst({
    where: {
      originalSessionId: sessionId,
      status: { in: ['ACTIVE', 'PAID'] },
    },
  });
  if (pendingHelper) throw new BadRequestException('Helper must mark their work complete before you can complete the session');

  await this.db.session.update({
    where: { id: sessionId },
    data: { status: 'ENDED', endedAt: new Date() },
  });

    await this.db.thread.updateMany({
  where: { sessionId },
  data: {
    devSection: 'COMPLETED',
    status: 'COMPLETED',
  },
})

    return { message: 'Session complete — 24h review window started' };
  }

 async approve(sessionId: string, userId: string) {
  const session = await this.getSession(sessionId);
  if (session.userId !== userId) throw new ForbiddenException();
  if (session.status !== 'ENDED') throw new BadRequestException();

  await this.payments.transferToDeveloper(
    session.stripePaymentIntentId!,
    session.developerId,
    sessionId,
  );

  await this.db.session.update({
    where: { id: sessionId },
    data: { status: 'ENDED', escrowStatus: 'RELEASED' },
  });

  await this.db.question.update({
    where: { id: session.questionId },
    data: { status: 'CLOSED' },
  });

  return { message: 'Approved — payment released to developer' };
}

  async escalate(sessionId: string, developerId: string, trigger: string) {
    const session = await this.getSession(sessionId);
    if (session.developerId !== developerId) throw new ForbiddenException();

    await this.db.session.update({
      where: { id: sessionId },
      data: { status: 'ESCALATING' },
    });

    return { message: 'Session escalated — contract draft created', sessionId, trigger };
  }
  

  private async getSession(id: string) {
    const session = await this.db.session.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  private async getResponseDev(questionId: string): Promise<string> {
    const response = await this.db.response.findFirst({ where: { questionId } });
    if (!response) throw new BadRequestException('No developer has responded to this question');
    return response.developerId;
  }
}
