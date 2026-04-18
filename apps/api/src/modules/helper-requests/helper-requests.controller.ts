import { Controller, Post, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '@/common/guards/auth.guard';
import { Roles, CurrentUser } from '@/common/decorators';
import { HelperRequestsService } from './helper-requests.service';
import { SessionTier } from '@prisma/client';

@ApiTags('HelperRequests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('helper-requests')
export class HelperRequestsController {
  constructor(private readonly helperRequestsService: HelperRequestsService) {}

  @Post()
  @Roles('DEVELOPER')
  create(@CurrentUser() user: any, @Body() body: {
    originalSessionId: string;
    questionId: string;
    role: string;
    scopeDescription?: string;
    tier: SessionTier;
  }) {
    return this.helperRequestsService.create(user.id, body);
  }

  @Get('feed')
  @Roles('DEVELOPER')
  getFeed(@CurrentUser() user: any) {
    return this.helperRequestsService.getFeed(user.id);
  }

  @Get('session/:sessionId')
  getBySession(@Param('sessionId') sessionId: string) {
    return this.helperRequestsService.getBySession(sessionId);
  }

  @Get('my-jobs')
  @Roles('DEVELOPER')
  getMyHelperJobs(@CurrentUser() user: any) {
    return this.helperRequestsService.getMyHelperJobs(user.id);
  }

  @Post(':id/respond')
  @Roles('DEVELOPER')
  respond(@Param('id') id: string, @CurrentUser() user: any) {
    return this.helperRequestsService.respond(id, user.id);
  }

  @Post(':id/accept')
  @Roles('USER')
  accept(@Param('id') id: string, @CurrentUser() user: any) {
    return this.helperRequestsService.accept(id, user.id);
  }

  @Post(':id/decline')
  @Roles('USER')
  decline(@Param('id') id: string, @CurrentUser() user: any) {
    return this.helperRequestsService.decline(id, user.id);
  }

  @Patch(':id/complete')
  @Roles('DEVELOPER')
  complete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.helperRequestsService.complete(id, user.id);
  }
}
