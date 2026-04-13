import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@/common/guards/auth.guard';
import { Roles, CurrentUser } from '@/common/decorators';
import { SwipesService } from './swipes.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('swipes')
export class SwipesController {
  constructor(private readonly swipesService: SwipesService) {}

  @Post()
  @Roles('DEVELOPER')
  swipe(@CurrentUser() user: any, @Body() body: { questionId: string; action: string }) {
    return this.swipesService.swipe(user.id, body.questionId, body.action);
  }
}
