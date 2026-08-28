import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { BrainGameService } from './brain-game.service';

@Controller('brain-game')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('student')
export class BrainGameController {
  constructor(private readonly brainGame: BrainGameService) {}
  @Post('heartbeat') heartbeat(@CurrentUser() user: { uid: string }) { return this.brainGame.heartbeat(user.uid); }
  @Get('players') players(@CurrentUser() user: { uid: string }) { return this.brainGame.listPlayers(user.uid); }
  @Get('invites') invites(@CurrentUser() user: { uid: string }) { return this.brainGame.listInvites(user.uid); }
  @Post('invites') invite(@CurrentUser() user: { uid: string }, @Body() body: { opponentUid?: string }) { return this.brainGame.createInvite(user.uid, String(body.opponentUid ?? '')); }
  @Patch('invites/:id') respond(@CurrentUser() user: { uid: string }, @Param('id') id: string, @Body() body: { action?: 'accept' | 'decline' }) { return this.brainGame.respondInvite(user.uid, id, body.action === 'accept' ? 'accept' : 'decline'); }
  @Get('matches/:id') match(@CurrentUser() user: { uid: string }, @Param('id') id: string) { return this.brainGame.getMatch(user.uid, id); }
  @Post('matches/:id/moves') move(@CurrentUser() user: { uid: string }, @Param('id') id: string, @Body() body: { answer?: number }) { return this.brainGame.submitMove(user.uid, id, Number(body.answer)); }
  @Post('matches/:id/forfeit') forfeit(@CurrentUser() user: { uid: string }, @Param('id') id: string) { return this.brainGame.forfeitMatch(user.uid, id); }
  @Post('rooms') createRoom(@CurrentUser() user: { uid: string }) { return this.brainGame.createRoom(user.uid); }
  @Post('rooms/join') joinRoom(@CurrentUser() user: { uid: string }, @Body() body: { code?: string }) { return this.brainGame.joinRoom(user.uid, String(body.code ?? '')); }
  @Get('rooms') rooms(@CurrentUser() user: { uid: string }) { return this.brainGame.listWaitingRooms(user.uid); }
  @Get('rooms/:id') room(@Param('id') id: string) { return this.brainGame.getRoom(id); }
  @Post('rooms/:id/ready') ready(@CurrentUser() user: { uid: string }, @Param('id') id: string) { return this.brainGame.readyRoom(user.uid, id); }
  @Post('rooms/:id/start') start(@Param('id') id: string) { return this.brainGame.startRoom(id); }
  @Post('rooms/:id/submit') submit(@CurrentUser() user: { uid: string }, @Param('id') id: string, @Body() body: { expression?: string }) { return this.brainGame.submitRoomExpression(user.uid, id, body.expression); }
  @Post('rooms/:id/give-up') giveUp(@CurrentUser() user: { uid: string }, @Param('id') id: string) { return this.brainGame.giveUpRoom(user.uid, id); }
}
