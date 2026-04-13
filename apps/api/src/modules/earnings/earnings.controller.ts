import { Controller, Get, UseGuards, Request } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { EarningsService } from './earnings.service'

@Controller('earnings')
@UseGuards(JwtAuthGuard)
export class EarningsController {
  constructor(private readonly earningsService: EarningsService) {}

  @Get()
  getEarnings(@Request() req: any) {
    return this.earningsService.getEarnings(req.user.id)
  }
}
