import { Module } from '@nestjs/common';
import { HelperRequestsService } from './helper-requests.service';
import { HelperRequestsController } from './helper-requests.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HelperRequestsController],
  providers: [HelperRequestsService],
  exports: [HelperRequestsService],
})
export class HelperRequestsModule {}
