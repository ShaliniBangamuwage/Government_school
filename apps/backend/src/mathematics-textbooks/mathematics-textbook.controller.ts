import { BadRequestException, Controller, Get, Param, Post, Body } from '@nestjs/common';
import { MathematicsTextbookService } from './mathematics-textbook.service';

@Controller('mathematics')
export class MathematicsTextbookController {
  constructor(private readonly textbookService: MathematicsTextbookService) {}

  @Get('textbooks/:grade/:medium/lessons')
  async getLessons(@Param('grade') grade: string, @Param('medium') medium: string) {
    const gradeNumber = Number(grade);
    if (!Number.isInteger(gradeNumber) || gradeNumber < 6 || gradeNumber > 13) {
      throw new BadRequestException('Grade must be an integer between 6 and 13.');
    }
    return this.textbookService.getLessonsForGradeAndMedium(gradeNumber, medium);
  }

  @Post('quizzes/generate')
  async generateQuiz(@Body() body: { grade: number; medium: string; lessonId: string }) {
    const grade = Number(body.grade);
    const medium = String(body.medium ?? '').trim();
    const lessonId = String(body.lessonId ?? '').trim();

    if (!lessonId) {
      throw new BadRequestException('lessonId is required.');
    }

    const result = await this.textbookService.generateQuizForLesson(grade, medium, lessonId);
    return { questions: result.questions };
  }
}
