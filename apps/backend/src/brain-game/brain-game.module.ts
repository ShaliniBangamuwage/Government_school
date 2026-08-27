import { Module } from '@nestjs/common';
import { FirebaseAdminService } from '../infrastructure/firebase/firebase-admin.service';
import { BrainGameController } from './brain-game.controller';
import { BrainGameService } from './brain-game.service';
import { BrainGameGateway } from './brain-game.gateway';

@Module({
  controllers: [BrainGameController],
  providers: [BrainGameService, FirebaseAdminService, BrainGameGateway],
})
export class BrainGameModule {}
