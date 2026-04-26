import { Controller, Post, Headers, RawBodyRequest, Req, HttpCode, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { DatabaseService } from '@/database/database.service';

const TIER_SECONDS: Record<string, number> = {
  QUICK_FOLLOWUP: 0,
  FIFTEEN_MIN: 900,
  FULL_SOLUTION: 0,
};

@ApiTags('Payments')
@Controller('webhooks')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly payments: PaymentsService,
    private readonly db: DatabaseService,
  ) {}

  @Post('stripe')
@HttpCode(200)
async handleStripeWebhook(
  @Req() req: RawBodyRequest<Request>,
  @Headers('stripe-signature') signature: string,
) {
  const payload = req.rawBody
  
  this.logger.log(`Webhook hit - payload size: ${payload?.length}, sig: ${!!signature}`)

  if (!payload) {
    this.logger.error('No raw body available')
    return { received: true }
  }

  let event: any
  try {
    event = this.payments.constructWebhookEvent(payload, signature)
  } catch (err: any) {
    this.logger.error(`Webhook verification failed: ${err.message}`)
    return { received: true }
  }

  this.logger.log(`Stripe webhook: ${event.type}`)

  switch (event.type) {
    case 'checkout.session.completed':
      await this.handleCheckoutCompleted(event.data.object as any)
      break
    case 'payment_intent.payment_failed':
      await this.handlePaymentFailed(event.data.object as any)
      break
    case 'invoice.paid':
      await this.handleInvoicePaid(event.data.object as any)
      break
    case 'customer.subscription.deleted':
      await this.handleSubscriptionCancelled(event.data.object as any)
      break
  }

  return { received: true }
}

private async handleCheckoutCompleted(checkoutSession: any) {
  const metadata = checkoutSession.metadata ?? {}
  const paymentIntentId = checkoutSession.payment_intent

  // ─── Helper session payment ───────────────────────────────────────────────
  if (metadata.type === 'helper_session') {
    const { helperRequestId, userId } = metadata
    if (!helperRequestId) {
      this.logger.warn('Helper session completed but missing helperRequestId')
      return
    }

    const existing = await this.db.helperRequest.findUnique({ where: { id: helperRequestId } })
    if (!existing || existing.status === 'PAID' || existing.status === 'ACTIVE') {
      this.logger.log(`Helper request ${helperRequestId} already processed`)
      return
    }

    // Capture the payment
    const Stripe = require('stripe')
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })
    await stripe.paymentIntents.capture(paymentIntentId)

    await this.db.helperRequest.update({
      where: { id: helperRequestId },
      data: {
        status: 'ACTIVE',
        stripePaymentIntentId: paymentIntentId,
      },
    })

    this.logger.log(`Helper request ${helperRequestId} is now ACTIVE`)
    return
  }

  // ─── Regular session payment ──────────────────────────────────────────────
  const { questionId, userId, tier: rawTier } = metadata

  const TIER_MAP: Record<string, string> = {
    FIVE: 'QUICK_FOLLOWUP',
    TWENTY: 'FIFTEEN_MIN',
    FIFTY_PLUS: 'FULL_SOLUTION',
    QUICK_FOLLOWUP: 'QUICK_FOLLOWUP',
    FIFTEEN_MIN: 'FIFTEEN_MIN',
    FULL_SOLUTION: 'FULL_SOLUTION',
  }
  const tier = TIER_MAP[rawTier] || 'FIFTEEN_MIN'

  if (!questionId || !userId || !rawTier) {
    this.logger.warn('Checkout completed but missing metadata', checkoutSession.id)
    return
  }

  const existing = await this.db.session.findFirst({
    where: { questionId, userId, status: 'PENDING_ACCEPT' },
  })
  if (existing) {
    this.logger.log(`Session already exists for question ${questionId}`)
    return
  }

  const question = await this.db.question.findUnique({
    where: { id: questionId },
    include: { responses: true },
  })
  if (!question) {
    this.logger.error(`Question ${questionId} not found`)
    return
  }

  const developerId = question.preSelectedDevId || question.responses?.[0]?.developerId
  if (!developerId) {
    this.logger.error(`No developer found for question ${questionId}`)
    return
  }

  const session = await this.db.session.create({
    data: {
      questionId,
      userId,
      developerId,
      tier: tier as any,
      status: 'PENDING_ACCEPT',
      durationSeconds: TIER_SECONDS[tier] || 0,
      stripePaymentIntentId: paymentIntentId,
      escrowStatus: 'HELD',
    },
  })

  await this.db.question.update({
    where: { id: questionId },
    data: { status: 'AWAITING_ACCEPT' },
  })

  const existingThread = await this.db.thread.findUnique({ where: { questionId } })
  if (existingThread) {
    await this.db.thread.update({
      where: { questionId },
      data: {
        sessionId: session.id,
        status: 'AWAITING_RESPONSE',
        devSection: 'AWAITING_PAYMENT',
        userSection: 'WAITING_ON_YOU',
      },
    })
  } else {
    await this.db.thread.create({
      data: {
        userId,
        developerId,
        questionId,
        sessionId: session.id,
        status: 'AWAITING_RESPONSE',
        devSection: 'AWAITING_PAYMENT',
        userSection: 'WAITING_ON_YOU',
      },
    })
  }

  this.logger.log(`Session created for question ${questionId} with developer ${developerId}`)
}

    const paymentIntentId = checkoutSession.payment_intent;

    // Create session record
    const session = await this.db.session.create({
      data: {
        questionId,
        userId,
        developerId,
        tier: tier as any,
        status: 'PENDING_ACCEPT',
        durationSeconds: TIER_SECONDS[tier] || 0,
        stripePaymentIntentId: paymentIntentId,
        escrowStatus: 'HELD',
      },
    });

    // Update question status
    await this.db.question.update({
      where: { id: questionId },
      data: { status: 'AWAITING_ACCEPT' },
    });

    // Create or update thread
    const existingThread = await this.db.thread.findUnique({ where: { questionId } });
    if (existingThread) {
      await this.db.thread.update({
        where: { questionId },
        data: {
          sessionId: session.id,
          status: 'AWAITING_RESPONSE',
          devSection: 'AWAITING_PAYMENT',
          userSection: 'WAITING_ON_YOU',
        },
      });
    } else {
      await this.db.thread.create({
        data: {
          userId,
          developerId,
          questionId,
          sessionId: session.id,
          status: 'AWAITING_RESPONSE',
          devSection: 'AWAITING_PAYMENT',
          userSection: 'WAITING_ON_YOU',
        },
      });
    }

    this.logger.log(`Session created for question ${questionId} with developer ${developerId}`);
  }

  private async handlePaymentFailed(pi: any) {
    const session = await this.db.session.findFirst({
      where: { stripePaymentIntentId: pi.id },
    });
    if (session) {
      await this.db.session.update({
        where: { id: session.id },
        data: { status: 'CANCELLED', escrowStatus: 'REFUNDED' },
      });
      await this.db.question.update({
        where: { id: session.questionId },
        data: { status: 'LOCKED' },
      });
    }
  }

  private async handleInvoicePaid(invoice: any) {
    const retainer = await this.db.retainer.findFirst({
      where: { stripeSubscriptionId: invoice.subscription },
    });
    if (retainer) {
      await this.db.retainer.update({
        where: { id: retainer.id },
        data: {
          requestsThisMonth: 0,
          periodStart: new Date(),
          isActive: true,
        },
      });
    }
  }

  private async handleSubscriptionCancelled(subscription: any) {
    const retainer = await this.db.retainer.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (retainer) {
      await this.db.retainer.update({
        where: { id: retainer.id },
        data: { isActive: false, cancelledAt: new Date() },
      });
    }
  }
}
