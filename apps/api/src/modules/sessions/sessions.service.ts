import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@/database/database.service';
import { PaymentsService } from '../payments/payments.service';

const TIER_AMOUNTS: Record<string, number> = {
  QUICK_FOLLOWUP: 750,   // $7.50
  FIFTEEN_MIN:    3000,  // $30.00
  FULL_SOLUTION:  7500,  // $75.00
};

const TIER_SECONDS: Record<string, number> = {
  QUICK_FOLLOWUP: 0,
  FIFTEEN_MIN:    900,
  FULL_SOLUTION:  0,
};

@Injectable()
export class SessionsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly payments: PaymentsService,
  ) {}

  async create(userId: string, dto: { questionId: string; tier: string; proposalId?: string }) {
    const question = await this.db.question.findUnique({ where: { id: dto.questionId } });
    if (!question) throw new NotFoundException('Question not found');
    if (question.status !== 'LOCKED') throw new BadRequestException('Question is not locked — no preview response yet');

    // Determine price (use proposal total if premium pricing)
    let amountCents = TIER_AMOUNTS[dto.tier] || 3000;
    if (dto.proposalId) {
      const proposal = await this.db.proposal.findUnique({ where: { id: dto.proposalId } });
      if (!proposal || proposal.status !== 'ACCEPTED') {
        throw new BadRequestException('Proposal must be accepted before creating session');
      }
      amountCents = proposal.totalPriceCents;
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

  const TIER_LABELS: Record<string, string> = {
    QUICK_FOLLOWUP: 'Quick follow-up',
    FIFTEEN_MIN:    '15 min session',
    FULL_SOLUTION:  'Full solution',
  };

  // Get or create Stripe customer
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

    // Create Stripe PaymentIntent with manual capture
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

    // Update question status
    await this.db.question.update({
      where: { id: dto.questionId },
      data: { status: 'AWAITING_ACCEPT' },
    });

    // Enqueue 10-min stale hold canceller
    // (In MVP, handle via cron; in production use BullMQ)

    return session;
  }

  async accept(sessionId: string, developerId: string) {
    const session = await this.getSession(sessionId);
    if (session.developerId !== developerId) throw new ForbiddenException();
    if (session.status !== 'PENDING_ACCEPT') throw new BadRequestException('Session not awaiting acceptance');

    // Capture payment immediately on accept
    await this.payments.capture(session.stripePaymentIntentId!);

    const updated = await this.db.session.update({
      where: { id: sessionId },
      data: { status: 'ACTIVE', startedAt: new Date(), escrowStatus: 'HELD' },
    });

    await this.db.question.update({
      where: { id: session.questionId },
      data: { status: 'AWAITING_ACCEPT' }, // stays locked until session ends
    });

    return updated;
  }

  async decline(sessionId: string, developerId: string) {
    const session = await this.getSession(sessionId);
    if (session.developerId !== developerId) throw new ForbiddenException();
    if (session.status !== 'PENDING_ACCEPT') throw new BadRequestException();

    // Cancel PI — free cancel before capture
    await this.payments.cancel(session.stripePaymentIntentId!);

    await this.db.session.update({
      where: { id: sessionId },
      data: { status: 'CANCELLED', escrowStatus: 'REFUNDED' },
    });

    // Re-open question for other developers
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

    await this.db.session.update({
      where: { id: sessionId },
      data: { status: 'ENDED', endedAt: new Date() },
    });

    // Schedule auto-release at 24h (MVP: store timestamp, check via cron)
    // Production: BullMQ job with 24h delay

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
      data: { escrowStatus: 'RELEASED' },
    });

    await this.db.question.update({ where: { id: session.questionId }, data: { status: 'CLOSED' } });

    // Open rating window (48h)
    return { message: 'Approved — payment released to developer' };
  }

  async escalate(sessionId: string, developerId: string, trigger: string) {
    const session = await this.getSession(sessionId);
    if (session.developerId !== developerId) throw new ForbiddenException();

    await this.db.session.update({ where: { id: sessionId }, data: { status: 'ESCALATING' } });

    return {
      message: 'Session escalated — contract draft created',
      sessionId,
      trigger,
    };
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
