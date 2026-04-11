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

  async create(userId: string, dto: CreateQuestionDto) {
    // Must have URL or screenshot
    if (!dto.url && (!dto.screenshotKeys || dto.screenshotKeys.length === 0)) {
      throw new BadRequestException(
        'Please add a link or screenshot so a Stacker can help you faster',
      );
    }

    // Compute clarity score
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
        budgetTier: dto.budgetTier,
        urgency: dto.urgency,
        url: dto.url,
        screenshotKeys: dto.screenshotKeys || [],
        clarityScore: clarityScore.score,
        clarityBreakdown: clarityScore.breakdown,
        source: dto.linkId ? 'DIRECT_LINK' : 'MARKETPLACE',
        linkId: dto.linkId,
        preSelectedDevId: dto.preSelectedDevId,
        requiresAccess: dto.requiresAccess || false,
      },
    });

    // Create thread immediately
    if (dto.preSelectedDevId) {
      await this.db.thread.create({
        data: {
          userId,
          developerId: dto.preSelectedDevId,
          questionId: question.id,
          devSection: 'NEW_REQUESTS',
          userSection: 'ACTIVE_WORK',
        },
      });
    }

    // Enqueue fingerprint job async (non-blocking)
    if (dto.url) {
      this.fingerprint.enqueue(question.id, dto.url);
    }

    return question;
  }

  async getFeed(developerId: string, filters: any) {
    const where: any = {
      status: 'OPEN',
      preSelectedDevId: null, // general marketplace only
    };

    if (filters.platform) where.fingerprint = { platform: filters.platform.toUpperCase() };
    if (filters.minClarity) where.clarityScore = { gte: parseFloat(filters.minClarity) };
    if (filters.budgetTier) where.budgetTier = filters.budgetTier;

    // Exclude already-swiped questions
    const swiped = await this.db.swipe.findMany({
      where: { developerId },
      select: { questionId: true },
    });
    const swipedIds = swiped.map(s => s.questionId);
    if (swipedIds.length > 0) where.id = { notIn: swipedIds };

    return this.db.question.findMany({
      where,
      include: {
        fingerprint: true,
        user: { select: { id: true, name: true, avgRating: true, badges: true } },
      },
      orderBy: [{ clarityScore: 'desc' }, { createdAt: 'desc' }],
      take: filters.limit ? parseInt(filters.limit) : 20,
      skip: filters.offset ? parseInt(filters.offset) : 0,
    });
  }

  async getById(id: string) {
    return this.db.question.findUnique({
      where: { id },
      include: {
        fingerprint: true,
        user: { select: { id: true, name: true, avgRating: true, badges: true, profile: true } },
        responses: { include: { developer: { select: { id: true, name: true, avgRating: true, badges: true } } } },
      },
    });
  }

  computeClarity(input: {
    hasUrl: boolean;
    screenshotCount: number;
    descriptionWords: number;
    isDirectLink: boolean;
    contextualLink: boolean;
    fingerprintConfidence?: number;
  }) {
    let urlPts = 0;
    if (input.hasUrl) {
      urlPts = 2.5 + ((input.fingerprintConfidence || 0) / 100) * 1.5;
    }

    let ssPts = 0;
    if (input.screenshotCount === 1) ssPts = 2.5;
    else if (input.screenshotCount >= 2) ssPts = 3.0;

    let descPts = 0;
    const w = input.descriptionWords;
    if (w >= 5)  descPts = 0.5;
    if (w >= 15) descPts = 1.5;
    if (w >= 30) descPts = 2.5;
    if (w >= 50) descPts = 3.0;

    let linkBonus = 0;
    if (input.isDirectLink) linkBonus = input.contextualLink ? 1.5 : 0.5;

    const score = Math.min(urlPts + ssPts + descPts + linkBonus, 10);
    return {
      score: parseFloat(score.toFixed(2)),
      breakdown: { urlPts: parseFloat(urlPts.toFixed(2)), ssPts, descPts, linkBonus },
      label: score >= 8 ? 'high' : score >= 5 ? 'medium' : 'low',
    };
  }
}
