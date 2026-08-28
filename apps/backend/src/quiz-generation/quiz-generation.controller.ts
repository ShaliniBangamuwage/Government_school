import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { MathematicsCatalogService } from '../mathematics-catalog/mathematics-catalog.service';
import { QuizGenerationService } from './quiz-generation.service';

@Controller()
export class QuizGenerationController {
  constructor(
    private readonly quizGenerationService: QuizGenerationService,
    private readonly mathematicsCatalogService: MathematicsCatalogService,
  ) {}

  @Post('staff/quiz-generation/jobs')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('teacher', 'reviewer', 'admin')
  async createJob(@CurrentUser() user: { uid: string }, @Body() body: Record<string, unknown>) {
    return { job: await this.quizGenerationService.createGenerationJob(user.uid, body as any) };
  }

  @Get('staff/quiz-generation/jobs/:id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('teacher', 'reviewer', 'admin')
  async getJob(@Param('id') id: string) {
    return { job: await this.quizGenerationService.getGenerationJob(id) };
  }

  @Get('staff/question-bank')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('teacher', 'reviewer', 'admin')
  async getQuestionBank(@Query('status') status?: string) {
    return { questions: await this.quizGenerationService.listQuestionBank(status) };
  }

  @Patch('staff/question-bank/:id/review')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('teacher', 'reviewer', 'admin')
  async reviewQuestion(@CurrentUser() user: { uid: string }, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return { question: await this.quizGenerationService.reviewQuestion(user.uid, id, body as any) };
  }

  @Get('mathematics/catalog/rows')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('teacher', 'reviewer', 'admin')
  async listMathematicsCatalogRows(@Query('grade') grade?: string, @Query('medium') medium?: string) {
    const rows = await this.mathematicsCatalogService.listCatalogRows({
      grade: grade ? Number(grade) : undefined,
      medium: medium ? String(medium) : undefined,
    });
    return { items: rows };
  }

  @Get('mathematics/catalog/rows/:id/lessons')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('teacher', 'reviewer', 'admin')
  async listMathematicsLessons(@Param('id') id: string) {
    const lessons = await this.mathematicsCatalogService.listCatalogLessons(id);
    return { items: lessons };
  }

  @Post('mathematics/catalog/rows/:catalogId/lessons/:lessonId/generate-quiz')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('teacher', 'reviewer', 'admin')
  async generateMathematicsLessonQuiz(
    @Param('catalogId') catalogId: string,
    @Param('lessonId') lessonId: string,
    @Body() body: { grade?: number; medium?: string; lessonTitle?: string; sourceUrl?: string },
  ) {
    const questions = await this.quizGenerationService.generateQuestionsForMathematicsLesson({
      catalogId,
      lessonId,
      grade: Number(body.grade ?? 8),
      medium: String(body.medium ?? 'English'),
      lessonTitle: String(body.lessonTitle ?? 'Mathematics lesson'),
      sourceUrl: String(body.sourceUrl ?? 'https://e-thaksalawa.moe.gov.lk/lcms/course/view.php?id=342'),
    });

    return { questions };
  }

  @Post('quiz-generation/generate-from-prompt')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('teacher', 'reviewer', 'admin')
  async generateFromPrompt(@CurrentUser() user: { uid: string }, @Body() body: Record<string, unknown>) {
    return await this.quizGenerationService.generateFromPrompt(user.uid, body as any);
  }

  @Get('teacher/quizzes')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('teacher', 'reviewer', 'admin')
  async listTeacherQuizzes(@CurrentUser() user: { uid: string }) {
    try {
      const quizzes = await this.quizGenerationService.listTeacherQuizzes(user.uid);
      return { quizzes };
    } catch (err) {
      console.error('Error listing teacher quizzes (returning empty list):', err);
      return { quizzes: [] };
    }
  }

  @Get('admin/quizzes')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  async listAdminQuizzes() {
    return this.quizGenerationService.listAdminQuizzes();
  }

  @Post('teacher/quizzes')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('teacher', 'reviewer', 'admin')
  async createTeacherQuiz(@CurrentUser() user: { uid: string }, @Body() body: Record<string, unknown>) {
    return await this.quizGenerationService.createTeacherQuiz(user.uid, body as any);
  }

  @Patch('teacher/quizzes/:quizId')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('teacher', 'reviewer', 'admin')
  async updateTeacherQuiz(@CurrentUser() user: { uid: string }, @Param('quizId') quizId: string, @Body() body: Record<string, unknown>) {
    return await this.quizGenerationService.updateTeacherQuiz(user.uid, quizId, body as any);
  }

  @Post('teacher/quizzes/:quizId/publish')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('teacher', 'reviewer', 'admin')
  async publishTeacherQuiz(@CurrentUser() user: { uid: string }, @Param('quizId') quizId: string) {
    return await this.quizGenerationService.publishTeacherQuiz(user.uid, quizId);
  }

  @Get('teacher/quizzes/:quizId/attempts')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('teacher', 'reviewer', 'admin')
  async getTeacherQuizAttempts(@CurrentUser() user: { uid: string }, @Param('quizId') quizId: string) {
    try {
      const attempts = await this.quizGenerationService.listTeacherQuizAttempts(user.uid, quizId);
      return { attempts };
    } catch (err) {
      console.error(`Error listing attempts for quiz ${quizId}:`, err);
      throw new BadRequestException('Unable to load quiz attempts.');
    }
  }

  @Delete('teacher/quizzes/:quizId')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('teacher', 'reviewer', 'admin')
  async deleteTeacherQuiz(@CurrentUser() user: { uid: string }, @Param('quizId') quizId: string) {
    return await this.quizGenerationService.deleteTeacherQuiz(user.uid, quizId);
  }

  @Get('student/quizzes')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('student')
  async listStudentQuizzes(@CurrentUser() user?: { profile?: { grade?: number; medium?: string } }) {
    return { quizzes: await this.quizGenerationService.listStudentQuizzes(user?.profile ?? undefined) };
  }

  @Get('student/progress')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('student')
  async getStudentProgress(@CurrentUser() user: { uid: string }) {
    return this.quizGenerationService.getStudentProgress(user.uid);
  }

  @Get('student/quizzes/:id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('student')
  async getStudentQuiz(@Param('id') id: string, @CurrentUser() user?: { profile?: { grade?: number; medium?: string } }) {
    return { quiz: await this.quizGenerationService.getStudentQuiz(id, user?.profile ?? undefined) };
  }

  @Post('student/quizzes/:id/attempts')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('student')
  async createAttempt(@CurrentUser() user: { uid: string }, @Param('id') id: string) {
    return { attempt: await this.quizGenerationService.createAttempt(user.uid, id) };
  }

  @Post('student/quizzes/:id/submit')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('student')
  async submitAttempt(@CurrentUser() user: { uid: string }, @Param('id') id: string, @Body() body: { answers?: Record<string, string> }) {
    const attemptId = String(body.answers?.attemptId ?? '');
    return { result: await this.quizGenerationService.submitAttempt(user.uid, id, attemptId, body.answers ?? {}) };
  }

  @Get('student/quiz-attempts/:attemptId')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('student')
  async getAttempt(@CurrentUser() user: { uid: string }, @Param('attemptId') attemptId: string) {
    return { attempt: await this.quizGenerationService.getAttempt(user.uid, attemptId) };
  }
}
