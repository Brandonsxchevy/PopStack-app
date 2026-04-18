import { Module } from '@nestjs/common';
import { HelperRequestsService } from './helper-requests.service';
import { HelperRequestsController } from './helper-requests.controller';

@Module({
  imports: [],
  controllers: [HelperRequestsController],
  providers: [HelperRequestsService],
  exports: [HelperRequestsService],
})
export class HelperRequestsModule {}
