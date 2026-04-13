import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '@/common/guards/auth.guard';
import { Roles, CurrentUser } from '@/common/decorators';
import { SessionsService } from './sessions.service';

@ApiTags('Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post('checkout')
  @Roles('USER')
  createCheckout(
    @CurrentUser() user: any,
    @Body() dto: { questionId: string; tier: string },
  ) {
    return this.sessions.createCheckoutSession(user.id, dto);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.sessions.getById(id);
  }

  @Post()
  @Roles('USER')
  create(@CurrentUser() user: any, @Body() dto: { questionId: string; tier: string; proposalId?: string }) {
    return this.sessions.create(user.id, dto);
  }

  @Post(':id/accept')
  @Roles('DEVELOPER')
  accept(@Param('id') id: string, @CurrentUser() user: any) {
    return this.sessions.accept(id, user.id);
  }

  @Post(':id/decline')
  @Roles('DEVELOPER')
  decline(@Param('id') id: string, @CurrentUser() user: any) {
    return this.sessions.decline(id, user.id);
  }

  @Post(':id/complete')
  @Roles('DEVELOPER')
  complete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.sessions.complete(id, user.id);
  }

  @Post(':id/approve')
  @Roles('USER')
  approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.sessions.approve(id, user.id);
  }

  @Post(':id/escalate')
  @Roles('DEVELOPER')
  escalate(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { trigger: string }) {
    return this.sessions.escalate(id, user.id, body.trigger);
  }
}
