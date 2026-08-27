import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { evaluate } from 'mathjs';
import { FirebaseAdminService } from '../infrastructure/firebase/firebase-admin.service';

type Player = { uid: string; name: string; score: number; streak: number };
type Puzzle = { id: string; round: number; mode: string; numbers: number[]; operators: string[]; target: number; solution?: string };
type RoomPlayer = Player & { ready: boolean; expression: string; moves: number; submitted: boolean };
type Room = { id: string; code: string; status: 'waiting' | 'countdown' | 'active' | 'finished'; round: number; totalRounds: 5; puzzle?: Puzzle; players: RoomPlayer[]; createdAt: number; roundStartedAt?: number; winnerUid?: string | null; winnerName?: string | null };

@Injectable()
export class BrainGameService {
  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private readonly rooms = new Map<string, Room>();

  private firestore() { return this.firebaseAdmin.getFirestore(); }
  private async profile(uid: string) {
    const user = await this.firebaseAdmin.getUserProfile(uid);
    if (!user || user.role !== 'student' || user.status !== 'active') throw new BadRequestException('Student is not available.');
    return { uid, name: user.fullName || user.displayName || 'Student' };
  }
  private challenge(round: number) {
    const max = Math.min(9 + round, 20);
    const cards = Array.from({ length: 4 }, () => Math.floor(Math.random() * max) + 1);
    return { cards, target: cards[0] + cards[1] + cards[2] * cards[3] };
  }

  private roomCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(''); while ([...this.rooms.values()].some((room) => room.code === code));
    return code;
  }

  private puzzle(round: number): Puzzle {
    const sets: Array<Omit<Puzzle, 'id' | 'round'>> = [
      { mode: 'Exact target', numbers: [2, 3, 4, 6], operators: ['+', '-', '×', '÷'], target: 24, solution: '6 × 4' },
      { mode: 'Use every tile', numbers: [2, 3, 4, 6], operators: ['+', '-', '×', '÷'], target: 20, solution: '6 × 3 + 4 - 2' },
      { mode: 'Limited operators', numbers: [3, 5, 7, 8], operators: ['+', '×'], target: 40, solution: '5 × 7 + 3' },
      { mode: 'Missing tile', numbers: [2, 4, 6, 8], operators: ['+', '-', '×'], target: 18, solution: '8 + 6 + 4' },
      { mode: 'Final puzzle', numbers: [2, 3, 5, 9], operators: ['+', '-', '×', '÷'], target: 45, solution: '9 × 5' },
    ];
    return { id: `puzzle-${round}-${Date.now()}-${Math.random().toString(36).slice(2)}`, round, ...sets[(round - 1) % sets.length] };
  }

  private publicRoom(room: Room) {
    return { ...room, players: room.players.map(({ uid, name, score, streak, ready, expression, moves, submitted }) => ({ uid, name, score, streak, ready, placedTiles: expression ? expression.split(' ').filter(Boolean).length : 0, moves, submitted, expression: room.status === 'finished' ? expression : undefined })) };
  }

  async createRoom(uid: string) {
    const profile = await this.profile(uid);
    const room: Room = { id: `room-${Date.now()}-${Math.random().toString(36).slice(2)}`, code: this.roomCode(), status: 'waiting', round: 1, totalRounds: 5, players: [{ ...profile, score: 0, streak: 0, ready: false, expression: '', moves: 0, submitted: false }], createdAt: Date.now() };
    this.rooms.set(room.id, room);
    return this.publicRoom(room);
  }

  async joinRoom(uid: string, code: string) {
    const room = [...this.rooms.values()].find((item) => item.code === code.trim().toUpperCase());
    if (!room) throw new NotFoundException('Room not found.');
    if (room.players.some((player) => player.uid === uid)) return this.publicRoom(room);
    if (room.players.length >= 2 || room.status !== 'waiting') throw new BadRequestException('This room is no longer available.');
    const profile = await this.profile(uid);
    room.players.push({ ...profile, score: 0, streak: 0, ready: false, expression: '', moves: 0, submitted: false });
    return this.publicRoom(room);
  }

  getRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) throw new NotFoundException('Room not found.');
    this.expireRound(room);
    return this.publicRoom(room);
  }

  readyRoom(uid: string, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) throw new NotFoundException('Room not found.');
    const player = room.players.find((item) => item.uid === uid);
    if (!player) throw new BadRequestException('You are not in this room.');
    player.ready = true;
    if (room.players.length === 2 && room.players.every((item) => item.ready)) { room.status = 'countdown'; room.puzzle = this.puzzle(room.round); }
    return this.publicRoom(room);
  }

  updateRoomExpression(uid: string, roomId: string, expression: string) {
    const room = this.rooms.get(roomId);
    if (!room) throw new NotFoundException('Room not found.');
    const player = room.players.find((item) => item.uid === uid);
    if (!player || room.status !== 'active') throw new BadRequestException('The round is not active.');
    if (!/^[0-9+*/()\-\s×÷]*$/.test(expression) || expression.length > 100) throw new BadRequestException('Invalid expression.');
    player.expression = expression.replaceAll('×', '*').replaceAll('÷', '/');
    player.moves += 1;
    return this.publicRoom(room);
  }

  submitRoomExpression(uid: string, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || !room.puzzle) throw new BadRequestException('The round is not ready.');
    this.expireRound(room);
    if (room.status !== 'active') throw new BadRequestException('This round has ended.');
    const player = room.players.find((item) => item.uid === uid);
    if (!player) throw new BadRequestException('You are not in this room.');
    if (player.submitted) throw new BadRequestException('You can submit only once per round.');
    player.submitted = true;
    const tokens = player.expression.match(/\d+(?:\.\d+)?/g) ?? [];
    const allowed = [...room.puzzle.numbers].sort((a, b) => a - b).join(',');
    if (!tokens.length || [...tokens].sort((a, b) => Number(a) - Number(b)).join(',') !== allowed && room.puzzle.mode === 'Use every tile') throw new BadRequestException('Use every supplied number.');
    let result: number;
    try { result = Number(evaluate(player.expression)); } catch { throw new BadRequestException('That expression is not valid.'); }
    if (!Number.isFinite(result) || Math.abs(result - room.puzzle.target) > 0.0001) throw new BadRequestException('That expression does not reach the target.');
    player.score += room.round === 5 ? 200 : 100;
    if (room.players.every((item) => item.submitted)) this.finishRound(room);
    return this.publicRoom(room);
  }

  startRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'countdown') throw new BadRequestException('Both students must be ready.');
    room.status = 'active';
    room.roundStartedAt = Date.now();
    return this.publicRoom(room);
  }

  private finishRound(room: Room) {
    if (room.round >= room.totalRounds) {
      room.status = 'finished';
      room.roundStartedAt = undefined;
      room.winnerUid = room.players[0].score === room.players[1].score ? null : room.players[0].score > room.players[1].score ? room.players[0].uid : room.players[1].uid;
      room.winnerName = room.players.find((player) => player.uid === room.winnerUid)?.name ?? null;
      return;
    }
    room.round += 1;
    room.puzzle = this.puzzle(room.round);
    room.status = 'active';
    room.roundStartedAt = Date.now();
    room.players.forEach((player) => { player.expression = ''; player.moves = 0; player.submitted = false; player.ready = false; });
  }

  private expireRound(room: Room) {
    if (room.status === 'active' && room.roundStartedAt && Date.now() - room.roundStartedAt >= 45_000) this.finishRound(room);
  }

  giveUpRoom(uid: string, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) throw new NotFoundException('Room not found.');
    const player = room.players.find((item) => item.uid === uid);
    if (!player) throw new BadRequestException('You are not in this room.');
    if (room.status === 'finished') return this.publicRoom(room);
    const winner = room.players.find((item) => item.uid !== uid);
    room.status = 'finished';
    room.roundStartedAt = undefined;
    room.winnerUid = winner?.uid ?? null;
    room.winnerName = winner?.name ?? null;
    return this.publicRoom(room);
  }

  async heartbeat(uid: string) {
    await this.firestore().collection('brainGamePresence').doc(uid).set({ uid, lastSeenAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true };
  }

  async listPlayers(uid: string) {
    const snapshot = await this.firestore().collection('users').where('role', '==', 'student').limit(100).get();
    const presence = await this.firestore().collection('brainGamePresence').get();
    const lastSeen = new Map(presence.docs.map((doc) => [doc.id, doc.data().lastSeenAt]));
    const now = Date.now();
    return snapshot.docs.map((doc) => ({ uid: doc.id, name: String(doc.data().fullName ?? doc.data().displayName ?? 'Student'), online: doc.id !== uid && this.isRecent(lastSeen.get(doc.id), now) })).filter((player) => player.uid !== uid);
  }

  private isRecent(value: unknown, now: number) {
    const millis = value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis: () => number }).toMillis === 'function' ? (value as { toMillis: () => number }).toMillis() : 0;
    return millis > now - 90_000;
  }

  async createInvite(uid: string, opponentUid: string) {
    if (!opponentUid || opponentUid === uid) throw new BadRequestException('Choose another student.');
    const [sender, opponent] = await Promise.all([this.profile(uid), this.profile(opponentUid)]);
    const existing = await this.firestore().collection('brainGameInvites').where('challengerUid', '==', uid).where('opponentUid', '==', opponentUid).where('status', '==', 'pending').limit(1).get();
    if (!existing.empty) return { invite: { id: existing.docs[0].id, ...existing.docs[0].data() } };
    const ref = this.firestore().collection('brainGameInvites').doc();
    const invite = { id: ref.id, challengerUid: sender.uid, challengerName: sender.name, opponentUid: opponent.uid, opponentName: opponent.name, status: 'pending', createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    await ref.set(invite);
    return { invite };
  }

  async listInvites(uid: string) {
    const [incoming, outgoing] = await Promise.all([
      this.firestore().collection('brainGameInvites').where('opponentUid', '==', uid).limit(20).get(),
      this.firestore().collection('brainGameInvites').where('challengerUid', '==', uid).limit(20).get(),
    ]);
    const incomingInvites = incoming.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Array<Record<string, unknown> & { id: string }>;
    const outgoingInvites = outgoing.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Array<Record<string, unknown> & { id: string }>;
    return { incoming: incomingInvites.filter((invite) => invite.status === 'pending'), outgoing: outgoingInvites.filter((invite) => invite.status === 'pending' || invite.status === 'accepted' || invite.status === 'declined') };
  }

  async respondInvite(uid: string, inviteId: string, action: 'accept' | 'decline') {
    const ref = this.firestore().collection('brainGameInvites').doc(inviteId);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new NotFoundException('Invitation not found.');
    const invite = snapshot.data() as Record<string, unknown>;
    if (invite.opponentUid !== uid || invite.status !== 'pending') throw new BadRequestException('This invitation is no longer available.');
    if (action === 'decline') { await ref.update({ status: 'declined', updatedAt: admin.firestore.FieldValue.serverTimestamp() }); return { invite: { id: inviteId, ...invite, status: 'declined' } }; }
    const challenger = await this.profile(String(invite.challengerUid));
    const opponent = await this.profile(uid);
    const players: Player[] = [{ ...challenger, score: 0, streak: 0 }, { ...opponent, score: 0, streak: 0 }];
    const matchRef = this.firestore().collection('brainGameMatches').doc();
    const match = { id: matchRef.id, players, status: 'active', round: 1, totalRounds: 8, turnUid: challenger.uid, ...this.challenge(1), createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    await matchRef.set(match);
    await ref.update({ status: 'accepted', matchId: matchRef.id, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return { invite: { id: inviteId, ...invite, status: 'accepted', matchId: matchRef.id }, match };
  }

  async getMatch(uid: string, matchId: string) {
    const snapshot = await this.firestore().collection('brainGameMatches').doc(matchId).get();
    if (!snapshot.exists) throw new NotFoundException('Match not found.');
    const match = snapshot.data() as Record<string, unknown>;
    const players = Array.isArray(match.players) ? match.players as Player[] : [];
    if (!players.some((player) => player.uid === uid)) throw new BadRequestException('You are not part of this match.');
    return { id: snapshot.id, ...match };
  }

  async submitMove(uid: string, matchId: string, answer: number) {
    const ref = this.firestore().collection('brainGameMatches').doc(matchId);
    const result = await this.firestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new NotFoundException('Match not found.');
      const match = snapshot.data() as Record<string, any>;
      const players = Array.isArray(match.players) ? match.players as Player[] : [];
      if (!players.some((player) => player.uid === uid)) throw new BadRequestException('You are not part of this match.');
      if (match.status !== 'active') return match;
      if (match.turnUid !== uid) throw new BadRequestException('Wait for your turn.');
      const correct = Number(answer) === Number(match.target);
      const playerIndex = players.findIndex((player) => player.uid === uid);
      const points = correct ? 10 + players[playerIndex].streak * 2 : 0;
      players[playerIndex] = { ...players[playerIndex], score: players[playerIndex].score + points, streak: correct ? players[playerIndex].streak + 1 : 0 };
      const nextRound = Number(match.round) + (players.findIndex((player) => player.uid === uid) === 1 ? 1 : 0);
      const nextTurn = players.find((player) => player.uid !== uid)?.uid;
      const update: Record<string, unknown> = { players, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
      if (nextRound > Number(match.totalRounds)) {
        update.status = 'finished';
        update.winnerUid = players[0].score === players[1].score ? null : players[0].score > players[1].score ? players[0].uid : players[1].uid;
      } else { Object.assign(update, { round: nextRound, turnUid: nextTurn, ...this.challenge(nextRound) }); }
      transaction.update(ref, update as any);
      return { ...match, ...update, correct, points };
    });
    return { match: result };
  }

  async forfeitMatch(uid: string, matchId: string) {
    const ref = this.firestore().collection('brainGameMatches').doc(matchId);
    const result = await this.firestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new NotFoundException('Match not found.');
      const match = snapshot.data() as Record<string, any>;
      const players = Array.isArray(match.players) ? match.players as Player[] : [];
      if (!players.some((player) => player.uid === uid)) throw new BadRequestException('You are not part of this match.');
      if (match.status !== 'active') return match;
      const opponent = players.find((player) => player.uid !== uid);
      const update = {
        status: 'finished',
        winnerUid: opponent?.uid ?? null,
        forfeitedBy: uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      transaction.update(ref, update);
      return { ...match, ...update };
    });
    return { match: result };
  }
}
