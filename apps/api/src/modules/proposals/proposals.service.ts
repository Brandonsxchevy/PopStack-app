import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@/database/database.service';

@Injectable()
export class ProposalsService {
  constructor(private readonly db: DatabaseService) {}

  async create(developerId: string, dto: {
    userId: string;
    sessionId?: string;
    contractId?: string;
    basePriceCents: number;
    expedited: boolean;
    expeditedSlaMinutes?: number;
    complexityReasons: string[];
    impactLevel: string;
    impactNote?: string;
    whyMoreExpensive?: string;
  }) {
    const premiums = this.computePremiums({
      basePriceCents: dto.basePriceCents,
      expedited: dto.expedited,
      expeditedSlaMinutes: dto.expeditedSlaMinutes,
      complexityReasons: dto.complexityReasons,
      impactLevel: dto.impactLevel,
      impactNote: dto.impactNote,
    });

    return this.db.proposal.create({
      data: {
        developerId,
        userId: dto.userId,
        sessionId: dto.sessionId,
        contractId: dto.contractId,
        basePriceCents: dto.basePriceCents,
        expedited: dto.expedited,
        expeditedSlaMinutes: dto.expeditedSlaMinutes,
        complexityReasons: dto.complexityReasons,
        impactLevel: dto.impactLevel as any,
        impactNote: dto.impactNote,
        whyMoreExpensive: dto.whyMoreExpensive,
        expeditedPremiumCents: premiums.expeditedPremiumCents,
        complexityPremiumCents: premiums.complexityPremiumCents,
        impactPremiumCents: premiums.impactPremiumCents,
        totalPriceCents: premiums.totalPriceCents,
        status: 'PRESENTED',
        presentedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    });
  }

  async accept(proposalId: string, userId: string) {
    const proposal = await this.db.proposal.findUnique({ where: { id: proposalId } });
    if (!proposal) throw new NotFoundException('Proposal not found');
    if (proposal.userId !== userId) throw new BadRequestException('Not your proposal');
    if (proposal.status !== 'PRESENTED') throw new BadRequestException('Proposal is not in presented state');
    if (proposal.expiresAt && proposal.expiresAt < new Date()) {
      await this.db.proposal.update({ where: { id: proposalId }, data: { status: 'EXPIRED' } });
      throw new BadRequestException('Proposal has expired');
    }

    return this.db.proposal.update({
      where: { id: proposalId },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });
  }

  async reject(proposalId: string, userId: string) {
    const proposal = await this.db.proposal.findUnique({ where: { id: proposalId } });
    if (!proposal) throw new NotFoundException();
    if (proposal.userId !== userId) throw new BadRequestException();

    return this.db.proposal.update({
      where: { id: proposalId },
      data: { status: 'REJECTED' },
    });
  }

  computePremiums(input: {
    basePriceCents: number;
    expedited: boolean;
    expeditedSlaMinutes?: number;
    complexityReasons: string[];
    impactLevel: string;
    impactNote?: string;
  }) {
    const base = input.basePriceCents;
    const cap = base * 3;

    // Expedited: 50–150% based on SLA tightness
    let expeditedPremiumCents = 0;
    if (input.expedited && input.expeditedSlaMinutes) {
      const factor = input.expeditedSlaMinutes <= 15 ? 1.5
                   : input.expeditedSlaMinutes <= 30 ? 1.0
                   : 0.5;
      expeditedPremiumCents = Math.round(base * factor);
    }

    // Complexity: 25% per reason, capped at 200%
    let complexityPremiumCents = 0;
    if (input.complexityReasons.length > 0) {
      const pct = Math.min(input.complexityReasons.length * 0.25, 2.0);
      complexityPremiumCents = Math.round(base * pct);
    }

    // Impact: medium = 50%, high = 200%, note required
    let impactPremiumCents = 0;
    if (input.impactLevel !== 'NONE' && input.impactLevel !== 'none') {
      if (!input.impactNote) throw new BadRequestException('Impact note is required when impact level is set');
      const pct = input.impactLevel.toUpperCase() === 'MEDIUM' ? 0.5 : 2.0;
      impactPremiumCents = Math.round(base * pct);
    }

    const rawTotal = base + expeditedPremiumCents + complexityPremiumCents + impactPremiumCents;
    const totalPriceCents = Math.min(rawTotal, cap);

    return {
      basePriceCents: base,
      expeditedPremiumCents,
      complexityPremiumCents,
      impactPremiumCents,
      totalPriceCents,
      cappedAt3x: rawTotal > cap,
      breakdown: {
        base: (base / 100).toFixed(2),
        expedited: (expeditedPremiumCents / 100).toFixed(2),
        complexity: (complexityPremiumCents / 100).toFixed(2),
        impact: (impactPremiumCents / 100).toFixed(2),
        total: (totalPriceCents / 100).toFixed(2),
      },
    };
  }
}
