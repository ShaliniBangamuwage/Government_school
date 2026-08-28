import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AppUser, UserRole, UserStatus } from '@edunexa/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin')
  async listUsers() {
    return { users: await this.usersService.listUsers() };
  }

  @Get(':uid')
  @Roles('admin')
  async getUserById(@Param('uid') uid: string) {
    const user = await this.usersService.listUsers();
    const match = user.find((entry) => entry.uid === uid);

    if (!match) {
      throw new BadRequestException('User not found.');
    }

    return { user: match };
  }

  @Post('staff')
  @Roles('admin')
  async createStaffUser(
    @Body()
    body: {
      fullName: string;
      email: string;
      password: string;
      role: UserRole;
      status?: UserStatus;
    },
  ) {
    const user = await this.usersService.createStaffUser({
      fullName: body.fullName,
      email: body.email,
      password: body.password,
      role: body.role,
      status: body.status,
    });

    return { user };
  }

  @Patch('me')
  async updateCurrentUser(
    @CurrentUser() user: { uid: string; profile: AppUser },
    @Body()
    body: {
      fullName?: string;
      email?: string;
      grade?: number;
      medium?: string;
      onboardingCompleted?: boolean;
      displayName?: string;
      mustChangePassword?: boolean;
      bio?: string;
      avatarUrl?: string;
      coverPhotoUrl?: string;
    },
  ) {
    return { user: await this.usersService.updateCurrentUser(user.uid, body) };
  }

  @Patch(':uid')
  @Roles('admin')
  async updateUser(
    @Param('uid') uid: string,
    @Body()
    body: {
      fullName?: string;
      email?: string;
      role?: UserRole;
      status?: UserStatus;
      mustChangePassword?: boolean;
    },
  ) {
    return { user: await this.usersService.updateUser(uid, body) };
  }

  @Patch('me/password')
  async completePasswordChange(@CurrentUser() user: { uid: string; profile: AppUser }) {
    const updated = await this.usersService.updateUser(user.uid, { mustChangePassword: false });
    return { success: true, user: updated };
  }
}
