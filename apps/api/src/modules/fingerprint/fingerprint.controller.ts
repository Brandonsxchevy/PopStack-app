import { Controller, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/auth.guard';
import { FingerprintService } from './fingerprint.service';

@ApiTags('Fingerprint')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fingerprint')
export class FingerprintController {
  constructor(private readonly fp: FingerprintService) {}

  @Post('rerun')
  rerun(@Body() body: { questionId: string; url: string }) {
    return this.fp.run(body.questionId, body.url);
  }

  @Patch(':id/override')
  override(@Param('id') id: string, @Body() body: { platform: string }) {
    return this.fp.override(id, body.platform);
  }
}
