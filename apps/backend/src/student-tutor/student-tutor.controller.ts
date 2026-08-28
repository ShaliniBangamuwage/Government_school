import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { StudentTutorService } from './student-tutor.service';
import { TavusTutorService } from './tavus-tutor.service';

@Controller('student/tutor')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('student')
export class StudentTutorController {
  constructor(
    private readonly studentTutorService: StudentTutorService,
    private readonly tavusTutorService: TavusTutorService,
  ) {}

  @Post('answer')
  answer(@CurrentUser() user: { profile?: { grade?: number; medium?: string } }, @Body() body: Record<string, unknown>) {
    return this.studentTutorService.answer({
      ...body,
      grade: body.grade ?? user.profile?.grade,
      medium: body.medium ?? user.profile?.medium,
      question: body.question,
    });
  }

  @Post('live/start')
  startLive(@CurrentUser() user: { profile?: { grade?: number; medium?: string } }, @Body() body: Record<string, unknown>) {
    return this.tavusTutorService.createConversation({
      ...body,
      grade: body.grade ?? user.profile?.grade,
      medium: body.medium ?? user.profile?.medium,
    });
  }
}
