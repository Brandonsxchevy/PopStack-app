import { Controller, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '@/common/guards/auth.guard';
import { Roles } from '@/common/decorators';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  getStats() { return this.admin.getStats(); }

  @Get('users')
  getUsers(@Query('role') role?: string, @Query('search') search?: string) {
    return this.admin.getUsers(role, search);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) { return this.admin.getUser(id); }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: any) {
    return this.admin.updateUser(id, dto);
  }

  @Patch('users/:id/suspend')
  suspendUser(@Param('id') id: string, @Body() body: { status: string }) {
    return this.admin.suspendUser(id, body.status);
  }

  @Get('questions')
  getQuestions(@Query('status') status?: string, @Query('search') search?: string) {
    return this.admin.getQuestions(status, search);
  }

  @Get('sessions')
  getSessions(@Query('status') status?: string) {
    return this.admin.getSessions(status);
  }

  @Get('flags')
  getFlags() { return this.admin.getFlags(); }

  @Patch('flags/:id')
  resolveFlag(@Param('id') id: string, @Body() body: { status: string; adminNote?: string }) {
    return this.admin.resolveFlag(id, body.status, body.adminNote);
  }
}
