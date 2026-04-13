import { Controller, Get, UseGuards, Request } from '@nestjs/common'
import { JwtAuthGuard, RolesGuard } from '@/common/guards/auth.guard';
import { Roles, CurrentUser } from '@/common/decorators';
import { EarningsService } from './earnings.service'

@Controller('earnings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EarningsController {
  constructor(private readonly earningsService: EarningsService) {}

  @Get()
  @Roles('DEVELOPER')
  getEarnings(@CurrentUser() user: any) {
    return this.earningsService.getEarnings(user.id)
  }
}
