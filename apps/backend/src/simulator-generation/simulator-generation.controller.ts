import { Body, Controller, Post, UseGuards, Get, Patch, Param } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SimulatorGenerationService } from './simulator-generation.service';

@Controller()
export class SimulatorGenerationController {
  constructor(private readonly simulatorService: SimulatorGenerationService) {}

  @Post('simulator-generation/generate-from-prompt')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('teacher', 'reviewer', 'admin')
  async generateFromPrompt(@CurrentUser() user: { uid: string }, @Body() body: Record<string, unknown>) {
    return await this.simulatorService.generateFromPrompt(user.uid, body as any);
  }

  @Get('teacher/simulators')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('teacher', 'reviewer', 'admin')
  async listTeacherSimulators(@CurrentUser() user: { uid: string }) {
    const items = await this.simulatorService.listTeacherSimulators(user.uid);
    return { simulators: items };
  }

  @Get('admin/simulators')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  async listAdminSimulators() {
    return this.simulatorService.listAdminSimulators();
  }

  @Patch('teacher/simulators/:id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('teacher', 'reviewer', 'admin')
  async updateTeacherSimulator(@CurrentUser() user: { uid: string }, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return { simulator: await this.simulatorService.updateSimulator(user.uid, id, body) };
  }

  @Post('teacher/simulators/:id/publish')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('teacher', 'reviewer', 'admin')
  async publishTeacherSimulator(@CurrentUser() user: { uid: string }, @Param('id') id: string) {
    return { simulator: await this.simulatorService.publishSimulator(user.uid, id) };
  }

  @Get('teacher/simulators/:id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('teacher', 'reviewer', 'admin')
  async getTeacherSimulator(@CurrentUser() user: { uid: string }, @Param('id') id: string) {
    const simulator = await this.simulatorService.getTeacherSimulatorById(user.uid, id);
    return { simulator };
  }

  @Get('student/simulators')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('student')
  async listStudentSimulators() {
    const items = await this.simulatorService.listStudentSimulators();
    return { simulators: items };
  }

  @Get('simulators/:id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('student', 'teacher', 'reviewer', 'admin')
  async getSimulatorById(@Param('id') id: string) {
    const simulator = await this.simulatorService.getPublishedSimulatorById(id);
    return { simulator };
  }
}
