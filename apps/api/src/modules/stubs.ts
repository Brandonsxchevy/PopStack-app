import { Module } from '@nestjs/common';
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Injectable } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@/common/guards/auth.guard';
import { Roles, CurrentUser } from '@/common/decorators';
import { DatabaseService } from '@/database/database.service';

// ─── USERS ────────────────────────────────────────────────────────────────────
@Injectable() export class UsersService {
  constructor(private readonly db: DatabaseService) {}
  findById(id: string) { return this.db.user.findUnique({ where: { id }, include: { profile: true } }); }
}
@Controller('users') @UseGuards(JwtAuthGuard) export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get(':id/badges') getBadges(@Param('id') id: string) { return this.users.findById(id); }
  @Get(':id/ratings') getRatings(@Param('id') id: string) {
    return (this.users as any).db.rating.findMany({ where: { rateeId: id, isVisible: true }, orderBy: { createdAt: 'desc' } });
  }
}
@Module({ controllers: [UsersController], providers: [UsersService], exports: [UsersService] })
export class UsersModule {}

// ─── CONTRACTS ────────────────────────────────────────────────────────────────
@Injectable() export class ContractsService {
  constructor(private readonly db: DatabaseService) {}
  create(userId: string, dto: any) { return this.db.contract.create({ data: { ...dto, userId, status: 'DRAFT' } }); }
  update(id: string, dto: any) { return this.db.contract.update({ where: { id }, data: dto }); }
  sign(id: string, _userId: string) { return this.db.contract.update({ where: { id }, data: { status: 'SIGNED' } }); }
}
@Controller('contracts') @UseGuards(JwtAuthGuard, RolesGuard) export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}
  @Post() @Roles('USER') create(@CurrentUser() u: any, @Body() dto: any) { return this.contracts.create(u.id, dto); }
  @Patch(':id') @Roles('DEVELOPER') update(@Param('id') id: string, @Body() dto: any) { return this.contracts.update(id, dto); }
  @Post(':id/sign') sign(@Param('id') id: string, @CurrentUser() u: any) { return this.contracts.sign(id, u.id); }
}
@Module({ controllers: [ContractsController], providers: [ContractsService], exports: [ContractsService] })
export class ContractsModule {}

// ─── JOBS ─────────────────────────────────────────────────────────────────────
@Injectable() export class JobsService {
  constructor(private readonly db: DatabaseService) {}
  addTask(jobId: string, dto: any) { return this.db.task.create({ data: { jobId, ...dto } }); }
  updateTask(taskId: string, dto: any) { return this.db.task.update({ where: { id: taskId }, data: dto }); }
  submitJob(jobId: string, dto: any) { return this.db.job.update({ where: { id: jobId }, data: { status: 'PENDING_REVIEW', finalizationType: dto.finalizationType } }); }
  approveJob(jobId: string) { return this.db.job.update({ where: { id: jobId }, data: { status: 'CLOSED' } }); }
}
@Controller('jobs') @UseGuards(JwtAuthGuard, RolesGuard) export class JobsController {
  constructor(private readonly jobs: JobsService) {}
  @Post(':id/tasks') @Roles('DEVELOPER') addTask(@Param('id') id: string, @Body() dto: any) { return this.jobs.addTask(id, dto); }
  @Patch(':id/tasks/:taskId') @Roles('DEVELOPER') updateTask(@Param('taskId') tid: string, @Body() dto: any) { return this.jobs.updateTask(tid, dto); }
  @Post(':id/submit') @Roles('DEVELOPER') submit(@Param('id') id: string, @Body() dto: any) { return this.jobs.submitJob(id, dto); }
  @Post(':id/approve') @Roles('USER') approve(@Param('id') id: string) { return this.jobs.approveJob(id); }
}
@Module({ controllers: [JobsController], providers: [JobsService], exports: [JobsService] })
export class JobsModule {}

// ─── PARTICIPANTS (COLLABORATION) ─────────────────────────────────────────────
@Injectable() export class ParticipantsService {
  constructor(private readonly db: DatabaseService) {}
  getForContract(contractId: string) { return this.db.participant.findMany({ where: { contractId }, include: { user: { select: { id: true, name: true, avgRating: true } } } }); }
}
@Module({ providers: [ParticipantsService], exports: [ParticipantsService] })
export class ParticipantsModule {}

// ─── RATINGS ─────────────────────────────────────────────────────────────────
@Injectable() export class RatingsService {
  constructor(private readonly db: DatabaseService) {}
  async submit(raterId: string, sessionId: string, dto: any) {
    const existing = await this.db.rating.findFirst({ where: { sessionId, raterId } });
    if (existing) throw new Error('Already rated');
    const session = await this.db.session.findUnique({ where: { id: sessionId } });
    const rateeId = raterId === session!.userId ? session!.developerId : session!.userId;
    return this.db.rating.create({ data: { sessionId, raterId, rateeId, ...dto, isVisible: false } });
  }
}
@Controller('sessions') @UseGuards(JwtAuthGuard) export class RatingsController {
  constructor(private readonly ratings: RatingsService) {}
  @Post(':id/rating') submit(@Param('id') id: string, @CurrentUser() u: any, @Body() dto: any) { return this.ratings.submit(u.id, id, dto); }
}
@Module({ controllers: [RatingsController], providers: [RatingsService], exports: [RatingsService] })
export class RatingsModule {}

// ─── THREADS ─────────────────────────────────────────────────────────────────
@Injectable() export class ThreadsService {
  constructor(private readonly db: DatabaseService) {}
  getInbox(userId: string, role: string, section?: string) {
    const field = role === 'DEVELOPER' ? 'developerId' : 'userId';
    const where: any = { [field]: userId };
    if (section) {
      if (role === 'DEVELOPER') where.devSection = section.toUpperCase();
      else where.userSection = section.toUpperCase();
    }
   return this.db.thread.findMany({ where, include: { question: { select: { title: true, clarityScore: true, fingerprint: true } } }, orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }] });  }
  getThread(id: string) { return this.db.thread.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: 'asc' }, take: 30 }, user: { select: { id: true, name: true } }, developer: { select: { id: true, name: true } }, question: { select: { id: true, title: true, url: true } } } }); }
  getCounts(userId: string, role: string) {
  const field = role === 'DEVELOPER' ? 'developerId' : 'userId';
  const unreadField = role === 'DEVELOPER' ? 'devUnreadCount' : 'userUnreadCount';
  return Promise.all([
    this.db.thread.count({ where: { [field]: userId, [unreadField]: { gt: 0 } } }),
    this.db.thread.count({ where: { developerId: userId, devSection: 'NEW_REQUESTS' } }),
  ]).then(([unread, pending]) => ({ unread, pending }));
}
}
@Controller('threads') @UseGuards(JwtAuthGuard) export class ThreadsController {
  constructor(private readonly threads: ThreadsService) {}
  @Get(':id') getOne(@Param('id') id: string) { return this.threads.getThread(id); }
}
@Controller('inbox') @UseGuards(JwtAuthGuard) export class InboxController {
  constructor(private readonly threads: ThreadsService) {}
  @Get() getInbox(@CurrentUser() u: any) { return this.threads.getInbox(u.id, u.role); }
  @Get('counts') getCounts(@CurrentUser() u: any) { return this.threads.getCounts(u.id, u.role); }
}
@Module({ controllers: [ThreadsController, InboxController], providers: [ThreadsService], exports: [ThreadsService] })
export class ThreadsModule {}

// ─── MESSAGES ────────────────────────────────────────────────────────────────
@Injectable() export class MessagesService {
  constructor(private readonly db: DatabaseService) {}
  send(threadId: string, senderId: string, dto: any) {
  const textContent = (dto.blocks || []).filter((b: any) => b.type === 'text').map((b: any) => typeof b.content === 'string' ? b.content : '').join(' ');
  return this.db.threadMessage.create({ data: { threadId, senderId, type: dto.type || 'PAID_MESSAGE', blocks: dto.blocks || [], channel: dto.channel || 'EXTERNAL', originalText: textContent || null } });
}
  getMessages(threadId: string, limit = 30) {
    return this.db.threadMessage.findMany({ where: { threadId, visibleToUser: true }, orderBy: { createdAt: 'asc' }, take: limit });
  }
}
@Controller('threads') @UseGuards(JwtAuthGuard) export class MessagesController {
  constructor(private readonly messages: MessagesService) {}
  @Post(':id/messages') send(@Param('id') tid: string, @CurrentUser() u: any, @Body() dto: any) { return this.messages.send(tid, u.id, dto); }
  @Get(':id/messages') getMessages(@Param('id') tid: string) { return this.messages.getMessages(tid); }
}
@Module({ controllers: [MessagesController], providers: [MessagesService], exports: [MessagesService] })
export class MessagesModule {}

// ─── LINKS ────────────────────────────────────────────────────────────────────
@Injectable() export class LinksService {
  constructor(private readonly db: DatabaseService) {}
  async create(developerId: string, dto: any) {
    const { customAlphabet } = await import('nanoid');
    const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);
    return this.db.devLink.create({ data: { developerId, shortcode: nanoid(), ...dto } });
  }
  findByShortcode(shortcode: string) { return this.db.devLink.findUnique({ where: { shortcode }, include: { developer: { select: { id: true, name: true, avgRating: true, badges: true, profile: true } } } }); }
  findByUsername(username: string) { return this.db.user.findFirst({ where: { name: username }, include: { devLinks: { where: { type: 'GENERAL', isActive: true } } } }); }
  listForDev(developerId: string) { return this.db.devLink.findMany({ where: { developerId }, orderBy: { createdAt: 'desc' } }); }
  update(id: string, dto: any) { return this.db.devLink.update({ where: { id }, data: dto }); }
}
@Controller() @UseGuards(JwtAuthGuard, RolesGuard) export class LinksController {
  constructor(private readonly links: LinksService) {}
  @Post('dev-links') @Roles('DEVELOPER') create(@CurrentUser() u: any, @Body() dto: any) { return this.links.create(u.id, dto); }
  @Get('dev-links') @Roles('DEVELOPER') list(@CurrentUser() u: any) { return this.links.listForDev(u.id); }
  @Patch('dev-links/:id') @Roles('DEVELOPER') update(@Param('id') id: string, @Body() dto: any) { return this.links.update(id, dto); }
}
@Controller() export class PublicLinksController {
  constructor(private readonly links: LinksService) {}
  @Get('r/:shortcode') resolve(@Param('shortcode') sc: string) { return this.links.findByShortcode(sc); }
  @Get('dev/:username') resolveUsername(@Param('username') u: string) { return this.links.findByUsername(u); }
}
@Module({ controllers: [LinksController, PublicLinksController], providers: [LinksService], exports: [LinksService] })
export class LinksModule {}

// ─── PROFILES ────────────────────────────────────────────────────────────────
@Injectable() export class ProfilesService {
  constructor(private readonly db: DatabaseService) {}
  getPublic(username: string) { return this.db.user.findFirst({ where: { name: username, role: 'DEVELOPER' }, include: { profile: true, ratingsReceived: { where: { isVisible: true }, orderBy: { createdAt: 'desc' }, take: 10 } } }); }
  update(userId: string, dto: any) { return this.db.profile.upsert({ where: { userId }, update: dto, create: { userId, ...dto } }); }
}
@Controller('profiles') export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}
  @Get(':username') getPublic(@Param('username') u: string) { return this.profiles.getPublic(u); }
  @Patch('me') @UseGuards(JwtAuthGuard) updateMe(@CurrentUser() u: any, @Body() dto: any) { return this.profiles.update(u.id, dto); }
}
@Module({ controllers: [ProfilesController], providers: [ProfilesService], exports: [ProfilesService] })
export class ProfilesModule {}

// ─── RETAINERS ────────────────────────────────────────────────────────────────
@Injectable() export class RetainersService {
  constructor(private readonly db: DatabaseService) {}
  getForUser(userId: string) { return this.db.retainer.findFirst({ where: { userId, isActive: true } }); }
  getForDev(developerId: string) { return this.db.retainer.findMany({ where: { developerId, isActive: true }, include: { user: { select: { id: true, name: true, email: true } } } }); }
  cancel(retainerId: string) { return this.db.retainer.update({ where: { id: retainerId }, data: { isActive: false, cancelledAt: new Date() } }); }
  updateSettings(retainerId: string, dto: any) { return this.db.retainer.update({ where: { id: retainerId }, data: dto }); }
}
@Controller('retainers') @UseGuards(JwtAuthGuard, RolesGuard) export class RetainersController {
  constructor(private readonly retainers: RetainersService) {}
  @Get(':userId') @Roles('USER') getForUser(@Param('userId') id: string) { return this.retainers.getForUser(id); }
  @Post('cancel') @Roles('USER') cancel(@Body() body: { retainerId: string }) { return this.retainers.cancel(body.retainerId); }
  @Get('dev/:developerId') @Roles('DEVELOPER') getForDev(@Param('developerId') id: string) { return this.retainers.getForDev(id); }
  @Patch(':id/settings') @Roles('DEVELOPER') updateSettings(@Param('id') id: string, @Body() dto: any) { return this.retainers.updateSettings(id, dto); }
}
@Module({ controllers: [RetainersController], providers: [RetainersService], exports: [RetainersService] })
export class RetainersModule {}

// ─── TRANSLATION ─────────────────────────────────────────────────────────────
@Injectable() export class TranslationService {
  constructor(private readonly db: DatabaseService) {}
  async translate(messageId: string, targetLang: string) {
  const msg = await this.db.threadMessage.findUnique({ where: { id: messageId } });
  if (!msg?.originalText) return { message: 'No translatable text found' };
  if (msg.translationStatus === 'GENERATED' && msg.translationTargetLang === targetLang) {
    return { translatedText: msg.translatedText, cached: true };
  }
  try {
    const deeplLangMap: Record<string, string> = {
      en: 'EN', es: 'ES', fr: 'FR', pt: 'PT', zh: 'ZH', ja: 'JA', ar: 'AR', hi: 'HI'
    };
    const targetCode = deeplLangMap[targetLang] || targetLang.toUpperCase();
    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: { 'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: [msg.originalText], target_lang: targetCode }),
    });
    const data = await response.json();
    const translatedText = data.translations?.[0]?.text || msg.originalText;
    await this.db.threadMessage.update({ where: { id: messageId }, data: { translatedText, translationStatus: 'GENERATED', translationTargetLang: targetLang } });
    return { translatedText, cached: false };
  } catch {
    return { message: 'Translation failed' };
  }
}

  }

@Controller('messages') @UseGuards(JwtAuthGuard) export class TranslationController {
  constructor(private readonly translation: TranslationService) {}
  @Post(':id/translate') translate(@Param('id') id: string, @Body() body: { targetLang: string }) { return this.translation.translate(id, body.targetLang); }
}
@Module({ controllers: [TranslationController], providers: [TranslationService], exports: [TranslationService] })
export class TranslationModule {}

// ─── MODERATION ──────────────────────────────────────────────────────────────
@Injectable() export class ModerationService {
  private readonly PASSWORD_PATTERN = /password[\s:=]+\S+/i;
  private readonly CONTACT_PATTERN = /\b[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}\b|\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/;

  async check(text: string): Promise<{ flagged: boolean; reason?: string }> {
    if (this.PASSWORD_PATTERN.test(text)) return { flagged: true, reason: 'password_sharing' };
    if (this.CONTACT_PATTERN.test(text)) return { flagged: true, reason: 'off_platform_contact' };
    // In production: call Google Perspective API for toxicity
    return { flagged: false };
  }
}
@Module({ providers: [ModerationService], exports: [ModerationService] })
export class ModerationModule {}
