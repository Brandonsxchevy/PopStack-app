import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionTier } from '@prisma/client';
import { DatabaseService } from '@/database/database.service';

@Injectable()
export class HelperRequestsService {
  constructor(private db: DatabaseService) {}

  async create(originalDevId: string, dto: {
    originalSessionId: string;
    questionId: string;
    role: string;
    scopeDescription?: string;
    tier: SessionTier;
  }) {
    const session = await this.prisma.session.findFirst({
      where: { id: dto.originalSessionId, developerId: originalDevId, status: 'ACTIVE' },
      include: { question: true },
    });
    if (!session) throw new NotFoundException('Active session not found');

    const existing = await this.prisma.helperRequest.findFirst({
      where: {
        originalSessionId: dto.originalSessionId,
        status: { in: ['OPEN', 'RESPONDED', 'ACCEPTED', 'PAID', 'ACTIVE'] },
      },
    });
    if (existing) throw new BadRequestException('An active helper request already exists for this session');

    return this.prisma.helperRequest.create({
      data: {
        originalSessionId: dto.originalSessionId,
        originalDevId,
        userId: session.question.userId,
        questionId: dto.questionId,
        role: dto.role as any,
        scopeDescription: dto.scopeDescription,
        tier: dto.tier,
        status: 'OPEN',
      },
    });
  }

  async getFeed(devId: string) {
    const requests = await this.prisma.helperRequest.findMany({
      where: { status: 'OPEN' },
      include: {
        question: { select: { id: true, title: true, description: true, techStack: true } },
        originalDev: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return requests.map(r => ({
      ...r,
      isHelperRequest: true,
      isOwnRequest: r.originalDevId === devId,
    }));
  }

  async respond(helperRequestId: string, helperDevId: string) {
    const req = await this.prisma.helperRequest.findUnique({ where: { id: helperRequestId } });
    if (!req) throw new NotFoundException('Helper request not found');
    if (req.status !== 'OPEN') throw new BadRequestException('Helper request is no longer open');
    if (req.originalDevId === helperDevId) throw new ForbiddenException('Cannot respond to your own helper request');
    return this.prisma.helperRequest.update({
      where: { id: helperRequestId },
      data: { status: 'RESPONDED', helperDevId },
    });
  }

  async accept(helperRequestId: string, userId: string) {
    const req = await this.prisma.helperRequest.findUnique({ where: { id: helperRequestId } });
    if (!req) throw new NotFoundException('Helper request not found');
    if (req.userId !== userId) throw new ForbiddenException('Not your request');
    if (req.status !== 'RESPONDED') throw new BadRequestException('No helper has responded yet');
    return this.prisma.helperRequest.update({
      where: { id: helperRequestId },
      data: { status: 'ACCEPTED' },
    });
  }

  async decline(helperRequestId: string, userId: string) {
    const req = await this.prisma.helperRequest.findUnique({ where: { id: helperRequestId } });
    if (!req) throw new NotFoundException('Helper request not found');
    if (req.userId !== userId) throw new ForbiddenException('Not your request');
    if (!['RESPONDED', 'ACCEPTED'].includes(req.status)) throw new BadRequestException('Cannot decline at this stage');
    return this.prisma.helperRequest.update({
      where: { id: helperRequestId },
      data: { status: 'DECLINED', helperDevId: null },
    });
  }

  async markPaid(helperRequestId: string, stripePaymentIntentId: string, helperSessionId: string) {
    return this.prisma.helperRequest.update({
      where: { id: helperRequestId },
      data: { status: 'PAID', stripePaymentIntentId, helperSessionId },
    });
  }

  async activate(helperRequestId: string) {
    return this.prisma.helperRequest.update({
      where: { id: helperRequestId },
      data: { status: 'ACTIVE' },
    });
  }

  async complete(helperRequestId: string, helperDevId: string) {
    const req = await this.prisma.helperRequest.findUnique({ where: { id: helperRequestId } });
    if (!req) throw new NotFoundException('Helper request not found');
    if (req.helperDevId !== helperDevId) throw new ForbiddenException('Not your helper request');
    if (req.status !== 'ACTIVE') throw new BadRequestException('Helper request is not active');
    return this.prisma.helperRequest.update({
      where: { id: helperRequestId },
      data: { status: 'COMPLETED' },
    });
  }

  async getBySession(originalSessionId: string) {
    return this.prisma.helperRequest.findFirst({
      where: { originalSessionId },
      include: {
        helperDev: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  async getMyHelperJobs(helperDevId: string) {
    return this.prisma.helperRequest.findMany({
      where: { helperDevId, status: { in: ['ACTIVE', 'COMPLETED', 'PAID'] } },
      include: {
        question: { select: { id: true, title: true } },
        originalDev: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
