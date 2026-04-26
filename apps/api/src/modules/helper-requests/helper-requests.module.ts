import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HelperRequestsService } from './helper-requests.service';
import { HelperRequestsController } from './helper-requests.controller';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [ConfigModule, PaymentsModule],
  controllers: [HelperRequestsController],
  providers: [HelperRequestsService],
  exports: [HelperRequestsService],
})
export class HelperRequestsModule {}
