import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@/common/guards/auth.guard';
import { Roles, CurrentUser } from '@/common/decorators';
import { UploadsService } from './uploads.service';

@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get('screenshot')
  @Roles('USER')
  getScreenshotUploadUrl(@CurrentUser() user: any) {
    return this.uploadsService.getScreenshotUploadUrl(user.id);
  }
}
