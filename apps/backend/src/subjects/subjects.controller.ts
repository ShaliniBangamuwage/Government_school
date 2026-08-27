import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Subject, SubjectStatus } from '@edunexa/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AssignSubjectTeachersDto } from './dto/assign-teachers.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SubjectsService } from './subjects.service';

@Controller()
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get('subjects')
  @UseGuards(FirebaseAuthGuard)
  async getPublicSubjects() {
    return { subjects: await this.subjectsService.listPublicSubjects() };
  }

  @Get('subjects/public')
  @UseGuards(FirebaseAuthGuard)
  async getPublicSubjectsAlias() {
    return { subjects: await this.subjectsService.listPublicSubjects() };
  }

  @Get('subjects/:id')
  @UseGuards(FirebaseAuthGuard)
  async getSubjectById(@Param('id') id: string) {
    return { subject: await this.subjectsService.getSubjectById(id) };
  }

  @Get('admin/subjects')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  async getAdminSubjects(@Query('grade') grade?: string, @Query('medium') medium?: string, @Query('status') status?: string, @Query('search') search?: string) {
    const filters = {
      grade: grade ? Number(grade) : undefined,
      medium: medium as any,
      status: (status as SubjectStatus | 'all') || 'all',
      search,
    };
    return { subjects: await this.subjectsService.listAdminSubjects(filters) };
  }

  @Post('admin/subjects')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  async createSubject(@CurrentUser() user: { uid: string; email?: string | null }, @Body() body: CreateSubjectDto) {
    const subject = await this.subjectsService.createSubject(user.uid, user.email ?? null, body as any);
    return { subject };
  }

  @Patch('admin/subjects/:id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  async updateSubject(@CurrentUser() user: { uid: string; email?: string | null }, @Param('id') id: string, @Body() body: UpdateSubjectDto) {
    const subject = await this.subjectsService.updateSubject(user.uid, user.email ?? null, id, body as any);
    return { subject };
  }

  @Patch('admin/subjects/:id/status')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  async updateSubjectStatus(@CurrentUser() user: { uid: string; email?: string | null }, @Param('id') id: string, @Body() body: { status: SubjectStatus }) {
    const subject = await this.subjectsService.updateSubjectStatus(user.uid, user.email ?? null, id, body.status);
    return { subject };
  }

  @Patch('admin/subjects/:id/teachers')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  async assignTeachers(@CurrentUser() user: { uid: string; email?: string | null }, @Param('id') id: string, @Body() body: AssignSubjectTeachersDto) {
    const subject = await this.subjectsService.assignTeachers(user.uid, user.email ?? null, id, body as any);
    return { subject };
  }

  @Get('teacher/subjects')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('teacher', 'reviewer')
  async getTeacherSubjects(@CurrentUser() user: { uid: string; email?: string | null }) {
    return { subjects: await this.subjectsService.listTeacherSubjects(user.uid) };
  }
}
