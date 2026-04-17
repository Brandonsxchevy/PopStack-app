import { Module } from '@nestjs/common';
import { ThreadsController } from './threads.controller';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ThreadsController],
})
export class ThreadsModule {}
