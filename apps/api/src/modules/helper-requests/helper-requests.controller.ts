import { Controller, Post, Get, Patch, Param, Body, Req, UseGuards } from '@nestjs/common';
import { HelperRequestsService } from './helper-requests.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SessionTier } from '@prisma/client';

@Controller('helper-requests')
@UseGuards(JwtAuthGuard)
export class HelperRequestsController {
  constructor(private readonly helperRequestsService: HelperRequestsService) {}

  @Post()
  create(@Req() req, @Body() body: {
    originalSessionId: string;
    questionId: string;
    role: string;
    scopeDescription?: string;
    tier: SessionTier;
  }) {
    return this.helperRequestsService.create(req.user.id, body);
  }

  @Get('feed')
  getFeed(@Req() req) {
    return this.helperRequestsService.getFeed(req.user.id);
  }

  @Get('session/:sessionId')
  getBySession(@Param('sessionId') sessionId: string) {
    return this.helperRequestsService.getBySession(sessionId);
  }

  @Get('my-jobs')
  getMyHelperJobs(@Req() req) {
    return this.helperRequestsService.getMyHelperJobs(req.user.id);
  }

  @Post(':id/respond')
  respond(@Param('id') id: string, @Req() req) {
    return this.helperRequestsService.respond(id, req.user.id);
  }

  @Post(':id/accept')
  accept(@Param('id') id: string, @Req() req) {
    return this.helperRequestsService.accept(id, req.user.id);
  }

  @Post(':id/decline')
  decline(@Param('id') id: string, @Req() req) {
    return this.helperRequestsService.decline(id, req.user.id);
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string, @Req() req) {
    return this.helperRequestsService.complete(id, req.user.id);
  }
}
