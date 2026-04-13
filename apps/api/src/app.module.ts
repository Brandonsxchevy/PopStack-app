import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { FingerprintModule } from './modules/fingerprint/fingerprint.module';
import { ResponsesModule } from './modules/responses/responses.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProposalsModule } from './modules/proposals/proposals.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { EarningsModule } from './modules/earnings/earnings.module'
import { SwipesModule } from './modules/swipes/swipes.module';

// Stub modules — split into own files as you implement each feature
import {
  UsersModule, ContractsModule, JobsModule, RatingsModule,
  ThreadsModule, MessagesModule, LinksModule, ProfilesModule,
  RetainersModule, TranslationModule, ModerationModule,
} from './modules/stubs';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    // Core flow — fully scaffolded
    AuthModule,
    QuestionsModule,
    FingerprintModule,
    ResponsesModule,
    SessionsModule,
    PaymentsModule,
    ProposalsModule,
    EarningsModule,
    SwipesModule,
    // Stub modules — implement in order listed in README
    UsersModule,
    ContractsModule,
    JobsModule,
    RatingsModule,
    ThreadsModule,
    MessagesModule,
    LinksModule,
    ProfilesModule,
    RetainersModule,
    TranslationModule,
    ModerationModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
