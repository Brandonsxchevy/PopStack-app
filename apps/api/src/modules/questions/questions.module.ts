// ─── questions.module.ts ──────────────────────────────────────────────────────
import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { FingerprintModule } from '../fingerprint/fingerprint.module';

@Module({
  imports: [FingerprintModule],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
