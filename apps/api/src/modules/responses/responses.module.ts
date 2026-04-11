// ─── Stub modules — all wired into AppModule, implement in order ─────────────
// Each follows the same pattern: Module → Service → Controller
// Build order: responses → contracts → jobs → ratings → threads → messages
//              → links → profiles → retainers → translation → users → moderation

// responses.module.ts
import { Module as NestModule } from '@nestjs/common';

// ─── RESPONSES ────────────────────────────────────────────────────────────────
import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@/common/guards/auth.guard';
import { Roles, CurrentUser } from '@/common/decorators';
import { DatabaseService } from '@/database/database.service';

@Injectable()
export class ResponsesService {
  constructor(private readonly db: DatabaseService) {}

  async create(developerId: string, questionId: string, dto: {
    blocks: any[];
    effortEstimate?: string;
    offerPriceCents?: number;
    offerTimeMinutes?: number;
  }) {
    // Enforce one response per dev per question (also enforced by DB unique constraint)
    const existing = await this.db.response.findFirst({
      where: { developerId, questionId },
    });
    if (existing) throw new ConflictException('You have already responded to this question');

    // Count chars in text blocks only
    const textCharCount = dto.blocks
      .filter(b => b.type === 'text')
      .reduce((sum, b) => {
        const text = typeof b.content === 'string' ? b.content
          : JSON.stringify(b.content);
        return sum + text.replace(/<[^>]*>/g, '').length;
      }, 0);

    if (textCharCount > 500) {
      throw new BadRequestException('Text blocks exceed 500 character limit');
    }

    const response = await this.db.response.create({
      data: {
        questionId, developerId,
        blocks: dto.blocks,
        textCharCount,
        effortEstimate: dto.effortEstimate,
        offerPriceCents: dto.offerPriceCents,
        offerTimeMinutes: dto.offerTimeMinutes,
      },
    });

    // Lock the question thread
    await this.db.question.update({
      where: { id: questionId },
      data: { status: 'LOCKED' },
    });

    // Create thread if one doesn't exist yet
    const question = await this.db.question.findUnique({ where: { id: questionId } });
    const existingThread = await this.db.thread.findUnique({ where: { questionId } });
    if (!existingThread && question) {
      await this.db.thread.create({
        data: {
          userId: question.userId,
          developerId,
          questionId,
          status: 'AWAITING_PAYMENT',
          devSection: 'NEW_REQUESTS',
          userSection: 'WAITING_ON_YOU',
        },
      });
    }

    return response;
  }

  async getForQuestion(questionId: string) {
    return this.db.response.findMany({
      where: { questionId },
      include: {
        developer: {
          select: { id: true, name: true, avgRating: true, badges: true, profile: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}

@Controller('questions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResponsesController {
  constructor(private readonly responses: ResponsesService) {}

  @Post(':id/response')
  @Roles('DEVELOPER')
  create(
    @Param('id') questionId: string,
    @CurrentUser() dev: any,
    @Body() dto: any,
  ) {
    return this.responses.create(dev.id, questionId, dto);
  }

  @Get(':id/responses')
  @Roles('USER')
  getForQuestion(@Param('id') questionId: string) {
    return this.responses.getForQuestion(questionId);
  }
}

@NestModule({ controllers: [ResponsesController], providers: [ResponsesService], exports: [ResponsesService] })
export class ResponsesModule {}
