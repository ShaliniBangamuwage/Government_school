import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { MathematicsCatalogService } from './mathematics-catalog.service';

@Controller('mathematics')
export class MathematicsCatalogController {
  constructor(private readonly service: MathematicsCatalogService) {}

  @Get('offerings')
  @UseGuards(FirebaseAuthGuard)
  async getOfferings() {
    return { items: await this.service.listOfferings() };
  }

  @Get('textbooks')
  @UseGuards(FirebaseAuthGuard)
  async getTextbooks(
    @Query('grade') grade?: string,
    @Query('medium') medium?: string,
    @Query('subjectId') subjectId?: string,
    @Query('approvalStatus') approvalStatus?: string,
  ) {
    const records = await this.service.listStudentTextbooks({
      grade: grade ? Number(grade) : undefined,
      medium: medium ? String(medium) : undefined,
      subjectId: subjectId ? String(subjectId) : undefined,
      approvalStatus: approvalStatus ? String(approvalStatus) : undefined,
    });

    return { items: records };
  }

  @Get('textbooks/:id/download')
  @UseGuards(FirebaseAuthGuard)
  async downloadTextbook(@Param('id') id: string, @Res() res: Response) {
    const textbook = await this.service.getTextbookById(id);
    const redirectUrl = this.service.getApprovedDownloadUrl(textbook);

    await this.service.incrementDownloadCount(id);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none';");
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(textbook.title || 'textbook')}.pdf"`);
    return res.redirect(302, redirectUrl);
  }

  @Post('seed')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  async seedCatalog() {
    return this.service.seedCanonicalCatalog();
  }

  @Patch('offerings/:id/visibility')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  async updateOfferingVisibility(@Param('id') id: string, @Body() body: { studentAccessEnabled?: boolean; teacherAccessEnabled?: boolean; textbookAccessEnabled?: boolean; quizAccessEnabled?: boolean; simulatorAccessEnabled?: boolean }) {
    const existing = await this.service.listOfferings();
    const record = existing.find((item) => item.id === id);
    if (!record) {
      return { success: false };
    }

    const updated = { ...record, ...body, updatedAt: new Date().toISOString() };
    await this.service.upsertOffering(updated);
    return { success: true, offering: updated };
  }
}
