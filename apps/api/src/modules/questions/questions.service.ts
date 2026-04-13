import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '@/database/database.service';
import { FingerprintService } from '../fingerprint/fingerprint.service';
import { CreateQuestionDto } from './dto/create-question.dto';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly fingerprint: FingerprintService,
  ) {}

  async getMyQuestions(userId: string) {
    return this.db.question.findMany({
      where: { userId },
      include: {
        fingerprint: true,
        responses: {
          include: {
            developer: { select: { id: true, name: true, avgRating: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateQuestionDto) {
    if (!dto.url && (!dto.screenshotKeys || dto.screenshotKeys.length === 0)) {
      throw new BadRequestException(
        'Please add a link or screenshot so a Stacker can help you faster',
      );
    }

    const clarityScore = this.computeClarity({
      hasUrl: !!dto.url,
      screenshotCount: dto.screenshotKeys?.length || 0,
      descriptionWords: dto.description?.trim().split(/\s+/).filter(Boolean).length || 0,
      isDirectLink: !!dto.linkId,
      contextualLink: false,
    });

    const question = await this.db.question.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        stackTags: dto.stackTags || [],
        budgetTier: dto.budgetTier as any,
        urgency: dto.urgency as any,
        url: dto.url,
        screenshotKeys: dto.screenshotKeys || [],
        clarityScore: clarityScore.score,
        clarityBreakdown: clarityScore.breakdown as any,
        source: dto.linkId ? 'DIRECT_LINK' : 'MARKETPLACE',
        linkId: dto.linkId,
        preSelectedDevId: dto.preSelectedDevId,
        requiresAccess: dto.requiresAccess || false,
      },
    });

    if (dto.preSelectedDevId) {
      await this.db.thread.create({
        data: {
          userId,
          developerId: d
