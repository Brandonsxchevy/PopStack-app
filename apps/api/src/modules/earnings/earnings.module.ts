import { Module } from '@nestjs/common'
import { EarningsController } from './earnings.controller'
import { EarningsService } from './earnings.service'
import { PrismaModule } from '../../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [EarningsController],
  providers: [EarningsService],
})
export class EarningsModule {}
