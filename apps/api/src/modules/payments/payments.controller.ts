import { Controller, Post, Headers, Body, RawBodyRequest, Req, HttpCode } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { DatabaseService } from '@/database/database.service';

@ApiTags('Payments')
@Controller('webhooks')
export class PaymentsController {
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
    const event = this.payments.constructWebhookEvent(req.rawBody!, signature);

    switch (event.type) {
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as any);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as any);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancelled(event.data.object as any);
        break;
    }

    return { received: true };
  }

  private async handlePaymentFailed(pi: any) {
    // Find session by PI ID and notify user
    const session = await this.db.session.findFirst({
      where: { stripePaymentIntentId: pi.id },
    });
    if (session) {
      await this.db.session.update({
        where: { id: session.id },
        data: { status: 'CANCELLED', escrowStatus: 'REFUNDED' },
      });
    }
  }

  private async handleInvoicePaid(invoice: any) {
    // Retainer subscription renewed — reset usage counters
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
