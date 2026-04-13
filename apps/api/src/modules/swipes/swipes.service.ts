import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/database/database.service';

@Injectable()
export class SwipesService {
  constructor(private readonly db: DatabaseService) {}

  async swipe(developerId: string, questionId: string, action: string) {
    return this.db.swipe.upsert({
      where: { developerId_questionId: { developerId, questionId } },
      update: { action },
      create: { developerId, questionId, action },
    });
  }
}
