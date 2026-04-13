import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/database/database.service';

@Injectable()
export class EarningsService {
  constructor(private db: DatabaseService) {}

  async getEarnings(developerId: string) {
    const sessions = await this.db.session.findMany({
      where: { developerId, status: { in: ['ENDED'] } },
      include: { question: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const TIER_AMOUNTS: Record<string, number> = {
      QUICK_FOLLOWUP: 750,
      FIFTEEN_MIN: 3000,
      FULL_SOLUTION: 7500,
    };

    const sessionsWithAmount = sessions.map(s => ({
      ...s,
      amountCents: TIER_AMOUNTS[s.tier] ?? 0,
    }));

    const released = sessionsWithAmount.filter(s => s.escrowStatus === 'RELEASED');
    const pending  = sessionsWithAmount.filter(s => s.escrowStatus === 'HELD');

    return {
      summary: {
        totalEarnedCents: released.reduce((sum, s) => sum + s.amountCents, 0),
        pendingCents: pending.reduce((sum, s) => sum + s.amountCents, 0),
        completedSessions: sessions.length,
      },
      sessions: sessionsWithAmount,
    };
  }
}
