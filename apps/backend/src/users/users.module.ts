import { Module } from '@nestjs/common';
import { FirebaseAdminService } from '../infrastructure/firebase/firebase-admin.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, FirebaseAdminService],
  exports: [UsersService, FirebaseAdminService],
})
export class UsersModule {}
