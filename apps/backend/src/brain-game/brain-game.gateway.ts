import { UseGuards } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { BrainGameService } from './brain-game.service';
import { FirebaseAdminService } from '../infrastructure/firebase/firebase-admin.service';

@WebSocketGateway({ namespace: '/brain-game', cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:3000', credentials: true } })
@UseGuards()
export class BrainGameGateway {
  @WebSocketServer() server!: Server;

  constructor(private readonly game: BrainGameService, private readonly firebase: FirebaseAdminService) {}

  async handleConnection(socket: Socket) {
    try {
      const token = typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : '';
      const decoded = await this.firebase.verifyToken(token);
      socket.data.uid = decoded.uid;
    } catch { socket.disconnect(true); }
  }

  @SubscribeMessage('room:watch')
  watch(@ConnectedSocket() socket: Socket, @MessageBody() body: { roomId?: string }) {
    if (!socket.data.uid || !body.roomId) return;
    void socket.join(body.roomId);
    socket.emit('room:state', this.game.getRoom(body.roomId));
  }

  @SubscribeMessage('room:expression')
  expression(@ConnectedSocket() socket: Socket, @MessageBody() body: { roomId?: string; expression?: string }) {
    if (!socket.data.uid || !body.roomId) return;
    try { this.server.to(body.roomId).emit('room:state', this.game.updateRoomExpression(socket.data.uid, body.roomId, body.expression ?? '')); } catch (error) { socket.emit('room:error', error instanceof Error ? error.message : 'Unable to update puzzle.'); }
  }
}
