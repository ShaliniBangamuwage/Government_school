import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateTextbookDto } from './dto/create-textbook.dto';
import { TextbookFilterDto } from './dto/textbook-filter.dto';
import { UpdateTextbookDto } from './dto/update-textbook.dto';
import { TextbooksService } from './textbooks.service';

@Controller()
export class TextbooksController {
  constructor(private readonly textbooksService: TextbooksService) {}

  @Get('textbooks')
  async listTextbooks(@Query() filters: TextbookFilterDto) {
    const items = await this.textbooksService.listTextbooks(filters);
    const page = Number(filters.page ?? 1);
    const limit = Number(filters.limit ?? (items.length || 50));
    return { items, total: items.length, page, limit };
  }

  @Get('admin/textbooks')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  async listAdminTextbooks(@Query() filters: TextbookFilterDto) {
    const items = await this.textbooksService.listTextbooks(filters);
    const page = Number(filters.page ?? 1);
    const limit = Number(filters.limit ?? (items.length || 50));
    return { items, total: items.length, page, limit };
  }

  @Get('textbooks/coverage')
  @UseGuards(FirebaseAuthGuard)
  async getCoverage() {
    return { summary: await this.textbooksService.getCoverageSummary() };
  }

  @Get('textbooks/:id')
  async getTextbook(@Param('id') id: string) {
    return { textbook: await this.textbooksService.getTextbookById(id) };
  }

  @Get('textbooks/:id/download')
  async download(
    @Req() request: { user?: { uid: string } },
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    try {
      const textbook = await this.textbooksService.getTextbookById(id);
      const redirectUrl = await this.textbooksService.getDownloadRedirectUrl(textbook);
      await this.textbooksService.incrementDownloadCount(id, request.user?.uid ?? 'anonymous');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none';");
      return res.redirect(302, redirectUrl);
    } catch (error) {
      if (error instanceof Error && 'status' in error) {
        const status = Number((error as { status?: number }).status ?? 500);
        const message = error instanceof Error ? error.message : 'Textbook download is unavailable.';
        res.status(status).json({ statusCode: status, message, error: status >= 500 ? 'Internal Server Error' : 'Bad Request' });
        return;
      }
      res.status(500).json({ statusCode: 500, message: 'Textbook download is unavailable.' });
      return;
    }
  }

  @Post('admin/textbooks')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  async createTextbook(@CurrentUser() user: { uid: string; email?: string | null }, @Body() body: CreateTextbookDto) {
    return { textbook: await this.textbooksService.createTextbook(user.uid, body) };
  }

  @Patch('admin/textbooks/:id')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  async updateTextbook(@CurrentUser() user: { uid: string; email?: string | null }, @Param('id') id: string, @Body() body: UpdateTextbookDto) {
    return { textbook: await this.textbooksService.updateTextbook(user.uid, id, body) };
  }

  @Patch('admin/textbooks/:id/verification')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  async updateVerification(@CurrentUser() user: { uid: string; email?: string | null }, @Param('id') id: string, @Body() body: { verificationStatus?: string; lastCheckedAt?: string }) {
    return { textbook: await this.textbooksService.updateVerificationStatus(user.uid, id, body) };
  }

  @Post('admin/textbooks/:id/check-link')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  async checkLink(@Param('id') id: string) {
    return { result: await this.textbooksService.checkOfficialLink(id) };
  }

  @Post('admin/textbooks/check-links')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  async checkLinks() {
    return { result: await this.textbooksService.checkAllLinks() };
  }

  @Get('staff/textbooks/:id/units')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('teacher', 'reviewer', 'admin')
  async listUnits(@Param('id') id: string) {
    return { units: await this.textbooksService.listUnits(id) };
  }

  @Post('staff/textbooks/:id/units')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('teacher', 'reviewer', 'admin')
  async createUnit(@CurrentUser() user: { uid: string }, @Param('id') id: string, @Body() body: { title: string; summary?: string; unitNumber?: number; sourcePageUrl?: string; sourceText?: string }) {
    return { unit: await this.textbooksService.createUnit(user.uid, id, body) };
  }

  @Patch('staff/textbook-units/:unitId')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('teacher', 'reviewer', 'admin')
  async updateUnit(@CurrentUser() user: { uid: string }, @Param('unitId') unitId: string, @Body() body: { title?: string; summary?: string; sourcePageUrl?: string; sourceText?: string }) {
    return { unit: await this.textbooksService.updateUnit(user.uid, unitId, body) };
  }
}
