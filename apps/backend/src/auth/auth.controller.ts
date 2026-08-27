import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AppUser } from '@edunexa/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('verify-token')
  async verifyToken(@Body() body: { token: string }) {
    return this.authService.verifyToken(body.token);
  }

  @Post('register-profile')
  async registerProfile(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { fullName?: string; email?: string; grade?: number; medium?: string },
  ) {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

    if (!token) {
      throw new BadRequestException('Firebase token is required.');
    }

    return this.authService.registerProfile(token, body);
  }

  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  getCurrentUser(@CurrentUser() user: { profile: AppUser }) {
    return user.profile;
  }

  @Patch('email-verification')
  @UseGuards(FirebaseAuthGuard)
  async syncEmailVerification(@CurrentUser() user: { profile: AppUser; uid: string }) {
    return {
      success: true,
      user: user.profile,
    };
  }

  @Patch('change-password')
  @UseGuards(FirebaseAuthGuard)
  async changePassword(
    @CurrentUser() user: { uid: string; profile: AppUser },
    @Body() body: { mustChangePassword?: boolean },
  ) {
    const updated = await this.authService.changePasswordStatus(user.uid, body);
    return {
      success: true,
      user: updated,
    };
  }

  @Get('admin/health')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin')
  adminHealth(@CurrentUser() user: { profile: AppUser }) {
    return {
      status: 'ok',
      userId: user.profile.id,
      role: user.profile.role,
    };
  }
}
