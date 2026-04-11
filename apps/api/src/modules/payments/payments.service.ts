import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { DatabaseService } from '@/database/database.service';

const PLATFORM_FEE_PCT = 0.15;

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
  ) {
    this.stripe = new Stripe(config.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-04-10',
    });
  }

  // Step 1: Create hold (manual capture)
  async createHold(amountCents: number, metadata: Record<string, string>) {
    return this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      capture_method: 'manual',
      metadata,
    });
  }

  // Step 2: Capture on developer accept
  async capture(paymentIntentId: string) {
    return this.stripe.paymentIntents.capture(paymentIntentId);
  }

  // Step 3: Transfer to developer (called on approve / auto-release)
  async transferToDeveloper(paymentIntentId: string, developerId: string, transferGroup: string) {
    const dev = await this.db.user.findUnique({ where: { id: developerId } });
    if (!dev?.stripeAccountId) {
      this.logger.warn(`Developer ${developerId} has no Stripe account — queuing for retry`);
      return null;
    }

    const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    const grossAmount = pi.amount_received;
    const fee = Math.round(grossAmount * PLATFORM_FEE_PCT);
    const netAmount = grossAmount - fee;

    return this.stripe.transfers.create({
      amount: netAmount,
      currency: 'usd',
      destination: dev.stripeAccountId,
      transfer_group: transferGroup,
      metadata: { developerId, paymentIntentId },
    });
  }

  // Cancel PI — free if before capture
  async cancel(paymentIntentId: string) {
    return this.stripe.paymentIntents.cancel(paymentIntentId);
  }

  // Full refund after capture
  async refund(paymentIntentId: string) {
    return this.stripe.refunds.create({ payment_intent: paymentIntentId });
  }

  // Create Stripe subscription for retainer
  async createSubscription(customerId: string, developerName: string, metadata: Record<string, string>) {
    return this.stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price_data: {
          currency: 'usd',
          unit_amount: 30000, // $300/month
          recurring: { interval: 'month' },
          product_data: { name: `Priority Access — ${developerName}` },
        },
      }],
      metadata,
    });
  }

  async cancelSubscription(subscriptionId: string) {
    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  // Create or retrieve Stripe customer
  async getOrCreateCustomer(userId: string, email: string): Promise<string> {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (user?.stripeCustomerId) return user.stripeCustomerId;

    const customer = await this.stripe.customers.create({ email, metadata: { userId } });
    await this.db.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });
    return customer.id;
  }

  // Validate Stripe webhook signature
  constructWebhookEvent(payload: Buffer, signature: string) {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.config.get('STRIPE_WEBHOOK_SECRET')!,
    );
  }
}
