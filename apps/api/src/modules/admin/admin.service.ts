import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/database/database.service';

@Injectable()
export class AdminService {
  constructor(private readonly db: DatabaseService) {}

  async getStats() {
    const [users, developers, questions, sessions, revenue] = await Promise.all([
      this.db.user.count({ where: { role: 'USER' } }),
      this.db.user.count({ where: { role: 'DEVELOPER' } }),
      this.db.question.count(),
      this.db.session.count(),
      this.db.session.findMany({
        where: { escrowStatus: 'RELEASED' },
        select: { tier: true },
      }),
    ]);

    const TIER_AMOUNTS: Record<string, number> = {
      QUICK_FOLLOWUP: 750, FIFTEEN_MIN: 3000, FULL_SOLUTION: 7500,
    };
    const totalRevenueCents = revenue.reduce((sum, s) => sum + (TIER_AMOUNTS[s.tier] || 0), 0);

    return { users, developers, questions, sessions, totalRevenueCents };
  }

  async getUsers(role?: string, search?: string) {
    return this.db.user.findMany({
      where: {
        ...(role && { role: role as any }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { profile: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUser(id: string) {
    return this.db.user.findUnique({
      where: { id },
      include: {
        profile: true,
        questionsAsked: { orderBy: { createdAt: 'desc' }, take: 10 },
        sessionsAsDev: { orderBy: { createdAt: 'desc' }, take: 10 },
        sessionsAsUser: { orderBy: { createdAt: 'desc' }, take: 10 },
        ratingsReceived: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
  }

  async updateUser(id: string, dto: any) {
    return this.db.user.update({ where: { id }, data: dto });
  }

  async suspendUser(id: string, status: string) {
    return this.db.user.update({
      where: { id },
      data: { suspensionStatus: status as any, isActive: status === 'ACTIVE' },
    });
  }

  async getQuestions(status?: string, search?: string) {
    return this.db.question.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(search && { title: { contains: search, mode: 'insensitive' } }),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        fingerprint: true,
        responses: {
          include: { developer: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getSessions(status?: string) {
    return this.db.session.findMany({
      where: { ...(status && { status: status as any }) },
      include: {
        user: { select: { id: true, name: true, email: true } },
        developer: { select: { id: true, name: true, email: true } },
        question: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getFlags() {
    return this.db.flag.findMany({
      where: { status: 'PENDING' },
      include: {
        rating: {
          include: {
            rater: { select: { id: true, name: true } },
            ratee: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveFlag(id: string, status: string, adminNote?: string) {
    return this.db.flag.update({
      where: { id },
      data: { status, adminNote },
    });
  }
}
