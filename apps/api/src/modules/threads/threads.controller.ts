import { Controller, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@/common/guards/auth.guard';
import { Roles, CurrentUser } from '@/common/decorators';
import { DatabaseService } from '@/database/database.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('threads')
export class ThreadsController {
  constructor(private readonly db: DatabaseService) {}

  @Patch(':id/time')
  @Roles('DEVELOPER')
  async updateTime(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { totalSeconds: number; chatSeconds: number },
  ) {
    const thread = await this.db.thread.findUnique({ where: { id } })
    if (!thread || thread.developerId !== user.id) {
      return { message: 'Not authorized' }
    }

    return this.db.thread.update({
      where: { id },
      data: {
        devTotalTimeSeconds: { increment: body.totalSeconds },
        devChatTimeSeconds: { increment: body.chatSeconds },
      },
    })
  }

  @Patch(':id/time/reset')
  @Roles('DEVELOPER')
  async resetTime(@Param('id') id: string, @CurrentUser() user: any) {
    const thread = await this.db.thread.findUnique({ where: { id } })
    if (!thread || thread.developerId !== user.id) {
      return { message: 'Not authorized' }
    }
    return this.db.thread.update({
      where: { id },
      data: { devTotalTimeSeconds: 0, devChatTimeSeconds: 0 },
    })
  }
}
