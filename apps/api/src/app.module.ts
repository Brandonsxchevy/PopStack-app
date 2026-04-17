import { ThreadsModule } from './modules/threads/threads.module';
import { UploadsModule } from './modules/uploads/uploads.module';
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
import { EarningsModule } from './modules/earnings/earnings.module';
import { SwipesModule } from './modules/swipes/swipes.module';
import { AdminModule } from './modules/admin/admin.module';
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
    AuthModule,
    QuestionsModule,
    FingerprintModule,
    ResponsesModule,
    SessionsModule,
    PaymentsModule,
    ProposalsModule,
    EarningsModule,
    SwipesModule,
    UploadsModule,
    AdminModule,
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
    ThreadsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
