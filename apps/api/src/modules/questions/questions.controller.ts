import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '@/common/guards/auth.guard';
import { Roles, CurrentUser } from '@/common/decorators';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';

@ApiTags('Questions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @Roles('USER')
  create(@CurrentUser() user: any, @Body() dto: CreateQuestionDto) {
    return this.questionsService.create(user.id, dto);
  }

  @Get('feed')
  @Roles('DEVELOPER')
  getFeed(@CurrentUser() user: any, @Query() query: any) {
    return this.questionsService.getFeed(user.id, query);
  }

  @Get('my')
  @Roles('USER')
  getMyQuestions(@CurrentUser() user: any) {
    return this.questionsService.getMyQuestions(user.id);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.questionsService.getById(id);
  }

  @Delete(':id')
  @Roles('USER')
  deleteQuestion(@Param('id') id: string, @CurrentUser() user: any) {
    return this.questionsService.deleteQuestion(id, user.id);
  }
}
