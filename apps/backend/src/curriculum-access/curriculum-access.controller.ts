import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurriculumAccessService } from './curriculum-access.service';

@Controller()
export class CurriculumAccessController {
  constructor(private readonly curriculumAccessService: CurriculumAccessService) {}

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/curriculum-access')
  async getAdminCurriculumAccess(
    @Query('grade') grade?: string,
    @Query('medium') medium?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.curriculumAccessService.listAdminAccess({
      grade: grade ? Number(grade) : undefined,
      medium: medium ? String(medium) : undefined,
      subjectId: subjectId ? String(subjectId) : undefined,
    });
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('admin/curriculum-access/:offeringId')
  async updateAdminCurriculumAccess(
    @Param('offeringId') offeringId: string,
    @Body() body: { accessEnabled?: boolean; updatedBy?: string; medium?: string; stream?: string; sourceUrl?: string },
    @CurrentUser() user?: { uid?: string },
  ) {
    const updatedBy = body.updatedBy ?? user?.uid ?? 'system';
    return this.curriculumAccessService.updateOfferingAccess(offeringId, {
      accessEnabled: body.accessEnabled,
      updatedBy,
      medium: body.medium,
      stream: body.stream,
      sourceUrl: body.sourceUrl,
    });
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/curriculum-access/bulk')
  async bulkUpdateAdminCurriculumAccess(
    @Body() body: { updates?: Array<{ id: string; accessEnabled?: boolean; medium?: string; stream?: string; sourceUrl?: string }> },
    @CurrentUser() user?: { uid?: string },
  ) {
    return this.curriculumAccessService.bulkUpdateAccess(body.updates ?? [], user?.uid ?? 'system');
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/curriculum-access/sync')
  async syncCurriculumCatalog(@CurrentUser() user?: { uid?: string }) {
    return this.curriculumAccessService.syncCatalogFromJson(user?.uid ?? 'system');
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('curriculum-access/available')
  async getStudentAvailableOfferings(
    @Req() req: any,
    @Query('grade') grade?: string,
    @Query('medium') medium?: string,
    @Query('stream') stream?: string,
  ) {
    const profile = req.user?.profile ?? {};
    const studentGrade = Number(grade ?? profile.grade ?? 6);
    const studentMedium = (medium ?? profile.medium ?? 'English').toString();
    const requestedStream = stream ? String(stream) : undefined;

    return this.curriculumAccessService.listStudentAvailableOfferings({
      grade: studentGrade,
      medium: studentMedium,
      stream: requestedStream,
    });
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('curriculum-access/public')
  async getPublicCurriculumAccess(
    @Query('grade') grade?: string,
    @Query('medium') medium?: string,
    @Query('stream') stream?: string,
  ) {
    return this.curriculumAccessService.listStudentAvailableOfferings({
      grade: Number(grade ?? 6),
      medium: String(medium ?? 'English'),
      stream: stream ? String(stream) : undefined,
    });
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('curriculum-access/offerings')
  async listOfferings(
    @Query('grade') grade?: string,
    @Query('medium') medium?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.listAdminCurriculumAccess(grade, medium, subjectId);
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('curriculum-access/offerings/:id/access')
  async updateOfferingAccessLegacy(
    @Param('id') id: string,
    @Body() body: { accessEnabled?: boolean; updatedBy?: string },
    @CurrentUser() user?: { uid?: string },
  ) {
    const updatedBy = body.updatedBy ?? user?.uid ?? 'system';
    return this.curriculumAccessService.updateOfferingAccess(id, { accessEnabled: body.accessEnabled, updatedBy });
  }

  private async listAdminCurriculumAccess(grade?: string, medium?: string, subjectId?: string) {
    return this.curriculumAccessService.listAdminAccess({
      grade: grade ? Number(grade) : undefined,
      medium: medium ? String(medium) : undefined,
      subjectId: subjectId ? String(subjectId) : undefined,
    });
  }
}
