import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/database/database.service';

@Injectable()
export class EarningsService {
  constructor(private db: DatabaseService) {}

  async getEarnings(developerId: string) {
    const sessions = await this.db.session.findMany({
      where: { developerId, status: { in: ['ENDED', 'ACTIVE'] } },
      include: { question: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const ratings = await this.db.rating.findMany({
      where: { rateeId: developerId, isVisible: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const TIER_AMOUNTS: Record<string, number> = {
      QUICK_FOLLOWUP: 750,
      FIFTEEN_MIN:    3000,
      FULL_SOLUTION:  7500,
      FIVE:           750,
      TWENTY:         3000,
      FIFTY_PLUS:     7500,
    };

    const FEE_PCT = 0.15;

    const sessionsWithAmount = sessions.map(s => {
      const grossCents = TIER_AMOUNTS[s.tier] ?? 0;
      const feeCents = Math.round(grossCents * FEE_PCT);
      const netCents = grossCents - feeCents;
      return { ...s, amountCents: grossCents, feeCents, netCents };
    });

    const released = sessionsWithAmount.filter(s => s.escrowStatus === 'RELEASED');
    const pending  = sessionsWithAmount.filter(s => s.escrowStatus === 'HELD');

    const avgRating = ratings.length
      ? ratings.reduce((sum, r) => sum + r.overall, 0) / ratings.length
      : null;

    return {
      summary: {
        totalEarnedCents: released.reduce((sum, s) => sum + s.netCents, 0),
        pendingCents: pending.reduce((sum, s) => sum + s.netCents, 0),
        completedSessions: released.length,
        pendingSessions: pending.length,
        avgRating,
        ratingCount: ratings.length,
      },
      sessions: sessionsWithAmount,
      ratings,
    };
  }
}
