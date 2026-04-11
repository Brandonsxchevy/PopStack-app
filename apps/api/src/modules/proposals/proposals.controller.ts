import { Controller, Post, Patch, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '@/common/guards/auth.guard';
import { Roles, CurrentUser } from '@/common/decorators';
import { ProposalsService } from './proposals.service';

@ApiTags('Proposals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('proposals')
export class ProposalsController {
  constructor(private readonly proposals: ProposalsService) {}

  @Post()
  @Roles('DEVELOPER')
  create(@CurrentUser() dev: any, @Body() dto: any) {
    return this.proposals.create(dev.id, dto);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    // Return proposal with itemized breakdown
    return this.proposals['db'].proposal.findUnique({ where: { id } });
  }

  @Patch(':id/accept')
  @Roles('USER')
  accept(@Param('id') id: string, @CurrentUser() user: any) {
    return this.proposals.accept(id, user.id);
  }

  @Patch(':id/reject')
  @Roles('USER')
  reject(@Param('id') id: string, @CurrentUser() user: any) {
    return this.proposals.reject(id, user.id);
  }
}
