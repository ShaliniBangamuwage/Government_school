"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { ProtectedRoute } from "@/lib/auth/route-guard";
import { fetchWithAuth } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { useLocale } from "@/lib/i18n/locale";

type Player = {
  uid: string;
  name: string;
  avatarUrl?: string;
  score: number;
  ready: boolean;
  placedTiles: number;
  moves: number;
  submitted: boolean;
  expression?: string;
};
type Puzzle = {
  id: string;
  round: number;
  mode: string;
  numbers: number[];
  operators: string[];
  target: number;
  clues: string[];
  tiles: number[];
};
type Room = {
  id: string;
  code: string;
  status: "waiting" | "countdown" | "active" | "finished";
  round: number;
  totalRounds: number;
  roundStartedAt?: number;
  winnerUid?: string | null;
  winnerName?: string | null;
  puzzle?: Puzzle;
  players: Player[];
};
type WaitingRoom = { id: string; code: string; hostName: string; status: "waiting" };

const apiBase = () =>
  (
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:5000"
  ).replace(/\/api\/?$/, "");

export default function BrainGamePage() {
  const { firebaseUser } = useAuth();
  const { t } = useLocale();
  const [room, setRoom] = useState<Room | null>(null);
  const [code, setCode] = useState("");
  const [expression, setExpression] = useState("");
  const [seconds, setSeconds] = useState(10);
  const [codeCopied, setCodeCopied] = useState(false);
  const [waitingRooms, setWaitingRooms] = useState<WaitingRoom[]>([]);
  const [message, setMessage] = useState(
    t("createRoomPrompt"),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitSucceeded, setSubmitSucceeded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRound, setSubmittedRound] = useState<number | null>(null);
  const socketRef = useRef<Socket>();

  useEffect(() => {
    document.body.dataset.brainGameError = errorMessage ? "true" : "false";
    return () => {
      delete document.body.dataset.brainGameError;
    };
  }, [errorMessage]);

  useEffect(() => {
    if (room) return;
    const refreshWaitingRooms = () =>
      void fetchWithAuth<WaitingRoom[]>("/api/brain-game/rooms")
        .then(setWaitingRooms)
        .catch(() => setWaitingRooms([]));
    refreshWaitingRooms();
    const timer = window.setInterval(refreshWaitingRooms, 2000);
    return () => window.clearInterval(timer);
  }, [room?.id]);

  useEffect(() => {
    if (!firebaseUser || !room) return;
    let socket: Socket | undefined;
    let cancelled = false;
    void firebaseUser.getIdToken().then((token) => {
      if (cancelled) return;
      socket = io(`${apiBase()}/brain-game`, { auth: { token } });
      socketRef.current = socket;
      socket.emit("room:watch", { roomId: room.id });
      socket.on("room:state", (nextRoom: Room) => {
        setRoom(nextRoom);
        const mine = nextRoom.players.find(
          (player) => player.uid === firebaseUser.uid,
        );
        if (mine?.expression !== undefined) setExpression(mine.expression);
      });
      socket.on("room:error", (error: string) => setMessage(error));
    });
    return () => {
      cancelled = true;
      socket?.disconnect();
      socketRef.current = undefined;
    };
  }, [firebaseUser, room?.id]);

  useEffect(() => {
    if (room?.status !== "active" || !room.roundStartedAt) return;
    const updateTimer = () =>
      setSeconds(
        Math.max(
          0,
          10 - Math.floor((Date.now() - room.roundStartedAt!) / 1000),
        ),
      );
    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timer);
  }, [room?.round, room?.roundStartedAt, room?.status]);

  useEffect(() => {
    if (!room) return;
    const refresh = () =>
      void fetchWithAuth<Room>(`/api/brain-game/rooms/${room.id}`)
        .then(setRoom)
        .catch(() => undefined);
    const timer = window.setInterval(refresh, 1000);
    return () => window.clearInterval(timer);
  }, [room?.id]);

  const createRoom = async () => {
    try {
      setSubmittedRound(null);
      setErrorMessage(null);
      setSubmitSucceeded(false);
      setRoom(
        await fetchWithAuth<Room>("/api/brain-game/rooms", { method: "POST" }),
      );
      setMessage(t("roomCodePrompt"));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to create room.",
      );
    }
  };
  const joinRoomByCode = async (roomCode: string) => {
    try {
      setSubmittedRound(null);
      setErrorMessage(null);
      setSubmitSucceeded(false);
      setRoom(await fetchWithAuth<Room>("/api/brain-game/rooms/join", {
        method: "POST",
        body: JSON.stringify({ code: roomCode }),
      }));
      setWaitingRooms([]);
      setMessage(t("readyUp"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to join room.");
    }
  };
  const joinRoom = async () => joinRoomByCode(code);
  const joinWaitingRoom = (waitingRoom: WaitingRoom) => {
    setCode(waitingRoom.code);
    void joinRoomByCode(waitingRoom.code);
  };
  const copyRoomCode = async () => {
    if (!room) return;
    await navigator.clipboard.writeText(room.code);
    setCodeCopied(true);
    window.setTimeout(() => setCodeCopied(false), 1800);
  };
  const shareRoomCode = async () => {
    if (!room) return;
    const shareText = `Join my Maths Live Duel with room code ${room.code}.`;
    if (navigator.share) {
      await navigator.share({ title: "Maths Live Duel", text: shareText });
      return;
    }
    await navigator.clipboard.writeText(shareText);
    setCodeCopied(true);
    window.setTimeout(() => setCodeCopied(false), 1800);
  };
  const updateExpression = (value: string) => {
    setErrorMessage(null);
    setSubmitSucceeded(false);
    setExpression(value);
    if (room)
      socketRef.current?.emit("room:expression", {
        roomId: room.id,
        expression: value,
      });
  };
  const ready = async () => {
    if (!room) return;
    try {
      const next = await fetchWithAuth<Room>(
        `/api/brain-game/rooms/${room.id}/ready`,
        { method: "POST" },
      );
      setRoom(next);
      if (next.status === "countdown") {
        setMessage(t("getReady"));
        window.setTimeout(
          () =>
            void fetchWithAuth<Room>(`/api/brain-game/rooms/${next.id}/start`, {
              method: "POST",
            }).then(setRoom),
          3000,
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to ready up.",
      );
    }
  };
  const submit = async () => {
    if (!room || isSubmitting || hasSubmitted || seconds === 0) return;
    setSubmittedRound(room.round);
    setIsSubmitting(true);
    setErrorMessage(null);
    setSubmitSucceeded(false);
    setMessage(t("starting"));
    try {
      setRoom(
        await fetchWithAuth<Room>(`/api/brain-game/rooms/${room.id}/submit`, {
          method: "POST",
          body: JSON.stringify({ expression }),
        }),
      );
      setExpression("");
      setSubmitSucceeded(true);
      setMessage(t("submitted"));
    } catch (error) {
      const errorText =
        error instanceof Error ? error.message : "That answer is not correct.";
      setErrorMessage(errorText);
      setMessage(errorText);
    } finally {
      setIsSubmitting(false);
    }
  };
  const giveUp = async () => {
    if (
      !room ||
      room.status === "finished" ||
      !window.confirm("Give up this duel? Your opponent will win.")
    )
      return;
    try {
      setRoom(
        await fetchWithAuth<Room>(`/api/brain-game/rooms/${room.id}/give-up`, {
          method: "POST",
        }),
      );
      setMessage(t("giveUp"));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to give up.",
      );
    }
  };
  const append = (tile: string) => updateExpression(`${expression}${tile}`);
  const me = room?.players.find((player) => player.uid === firebaseUser?.uid);
  const hasSubmitted = Boolean(
    room && (me?.submitted || submittedRound === room.round),
  );
  const opponent = room?.players.find(
    (player) => player.uid !== firebaseUser?.uid,
  );
  const formatTime = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  const resultMessage = room?.winnerName
    ? room.winnerUid === firebaseUser?.uid
      ? "You win!"
      : `${room.winnerName} wins!`
    : room?.status === "finished"
      ? "Draw game."
      : null;

  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <main className="min-h-screen bg-slate-950 p-3 text-slate-50 sm:p-5">
        <div className="mx-auto max-w-7xl space-y-4">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
                {t("brainGame")}
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                {t("liveMathDuel")}
              </h1>
            </div>
            {room ? (
              <div className="text-right">
                <p className="text-sm text-slate-400">
                  {t("room")} <span className="font-bold text-white">{room.code}</span>
                </p>
                <p className="mt-1 font-mono text-xl text-amber-300">
                  {t("round")} {room.round}/{room.totalRounds} · {formatTime}
                </p>
              </div>
            ) : null}
          </header>
          {resultMessage ? (
            <section className="rounded-3xl border border-amber-300/60 bg-amber-300/15 p-6 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-200">{t("gameComplete")}</p>
              <h2 className="mt-2 text-3xl font-black text-amber-300">{resultMessage}</h2>
            </section>
          ) : null}
          {!room ? (
            <section className="grid gap-5 md:grid-cols-2">
              <div className="rounded-3xl border border-cyan-400/30 bg-cyan-400/10 p-7">
                <p className="text-sm text-cyan-200">{t("hostPrivateDuel")}</p>
                <h2 className="mt-2 text-2xl font-bold">{t("createRoom")}</h2>
                <button
                  type="button"
                  onClick={() => void createRoom()}
                  className="mt-7 rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950"
                >
                  {t("createRoom")}
                </button>
              </div>
              <div className="rounded-3xl border border-slate-700 bg-slate-900 p-7">
                <p className="text-sm text-slate-400">{t("roomCodePrompt")}</p>
                <h2 className="mt-2 text-2xl font-bold">{t("joinDuel")}</h2>
                <div className="mt-7 flex gap-2">
                  <input
                    aria-label={t("roomCode")}
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.toUpperCase().slice(0, 6))
                    }
                    className="min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-950 px-4 font-mono uppercase outline-none focus:border-cyan-400"
                    placeholder="MATH42"
                  />
                  <button
                    type="button"
                    onClick={() => void joinRoom()}
                    className="rounded-xl bg-amber-300 px-5 py-3 font-bold text-slate-950"
                  >
                    {t("join")}
                  </button>
                </div>
              </div>
              {waitingRooms.length > 0 ? (
                <div className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-7 md:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-emerald-200">Available now</p>
                      <h2 className="mt-2 text-2xl font-bold">Choose a player</h2>
                    </div>
                    <span className="text-sm text-emerald-200">{waitingRooms.length} room{waitingRooms.length === 1 ? "" : "s"} waiting</span>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {waitingRooms.map((waitingRoom) => (
                      <div key={waitingRoom.id} className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-300/20 bg-slate-950/60 p-4">
                        <div>
                          <p className="font-semibold text-white">{waitingRoom.hostName}</p>
                          <p className="mt-1 font-mono text-sm tracking-[0.2em] text-emerald-200">{waitingRoom.code}</p>
                        </div>
                        <button type="button" onClick={() => joinWaitingRoom(waitingRoom)} className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-300">Join</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : (
            <>
              <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">
                      {room.status === "waiting"
                        ? t("waitingOpponent")
                        : room.status === "countdown"
                          ? t("getReady")
                          : room.status === "finished"
                            ? t("duelComplete")
                            : room.puzzle?.mode}
                    </p>
                    <h2 className="mt-1 text-2xl font-bold">{room.puzzle?.mode ?? t("bothStudentsJoin")}</h2>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">{t("room")}</p>
                      <p className="mt-1 font-mono text-2xl font-black tracking-[0.3em] text-white">{room.code}</p>
                      <p className="mt-1 text-xs text-slate-400">Share this code with your opponent</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void copyRoomCode()} className="rounded-xl border border-cyan-300/50 px-4 py-2 text-sm font-bold text-cyan-100 hover:bg-cyan-300/15">{codeCopied ? "Copied" : "Copy code"}</button>
                      <button type="button" onClick={() => void shareRoomCode()} className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300">Share room</button>
                    </div>
                  </div>
                  {room.status !== "active" && room.status !== "finished" ? (
                    <button
                      type="button"
                      onClick={() => void ready()}
                      disabled={me?.ready || !opponent}
                      className="rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-40"
                    >
                      {me?.ready ? t("ready") : t("readyUp")}
                    </button>
                  ) : null}
                </div>
              </section>
              <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(230px,0.45fr)]">
                <div className="rounded-2xl border border-cyan-400/40 bg-slate-900 p-4 sm:p-5">
                  {room.puzzle ? <div className="mb-4 rounded-2xl border border-violet-400/30 bg-violet-400/10 p-3"><p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-200">Vault clues</p><div className="mt-2 grid gap-2 sm:grid-cols-3">{room.puzzle.clues.map((clue, index) => <div key={clue} className="rounded-xl bg-slate-950/60 p-2.5 text-sm text-slate-200"><span className="font-bold text-violet-300">{index + 1}.</span> {clue}</div>)}</div></div> : null}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
                        {t("you")}
                      </p>
                      <h2 className="mt-1 text-xl font-bold">
                        {me?.name ?? "You"}
                      </h2>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-amber-300">
                        {me?.score ?? 0}
                      </p>
                      <p className="text-xs text-slate-400">
                        {t("score")} · {me?.moves ?? 0} {t("moves")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 rounded-2xl border-2 border-dashed border-cyan-500/50 bg-cyan-50 p-3 dark:border-cyan-300/40 dark:bg-slate-950/60"><p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-cyan-700 dark:text-cyan-300">Vault code</p><div className="flex gap-2">{[0, 1, 2].map((index) => <span key={index} className="flex h-14 flex-1 items-center justify-center rounded-xl border border-cyan-400 bg-white font-mono text-2xl font-black text-slate-900 dark:border-cyan-300/30 dark:bg-slate-900 dark:text-white">{expression[index] ?? "_"}</span>)}</div></div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {room.puzzle?.tiles.map((number) => (
                      <button
                        type="button"
                        key={number}
                        disabled={room.status !== "active" || hasSubmitted}
                        onClick={() => append(String(number))}
                        className="h-12 w-12 rounded-xl border border-cyan-500 bg-cyan-100 text-lg font-bold text-cyan-950 shadow-sm hover:bg-cyan-200 disabled:opacity-40 dark:border-cyan-300/40 dark:bg-cyan-300/15 dark:text-cyan-100 dark:hover:bg-cyan-300/25"
                      >
                        {number}
                      </button>
                    ))}
                    {room.puzzle?.operators.map((operator) => (
                      <button
                        type="button"
                        key={operator}
                        disabled={room.status !== "active" || hasSubmitted}
                        onClick={() => append(operator)}
                        className="h-12 w-12 rounded-xl border border-amber-300/40 bg-amber-300/15 text-lg font-bold text-amber-100 disabled:opacity-40"
                      >
                        {operator}
                      </button>
                    ))}
                  </div>
                  {errorMessage ? (
                    <p role="alert" className="mt-4 rounded-xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                      {t("wrongAnswer")}: {errorMessage}
                    </p>
                  ) : null}
                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      disabled={room.status !== "active" || hasSubmitted}
                      onClick={() => updateExpression("")}
                      className="rounded-xl border border-slate-600 px-4 py-3 font-semibold disabled:opacity-40"
                    >
                      {t("reset")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void submit()}
                      disabled={room.status !== "active" || hasSubmitted || seconds === 0}
                      className={`flex-1 rounded-xl px-4 py-3 font-bold text-slate-950 disabled:opacity-40 ${errorMessage ? "bg-red-400" : submitSucceeded || hasSubmitted ? "bg-emerald-400" : "bg-cyan-400"}`}
                    >
                      {errorMessage ? t("wrongAnswer") : submitSucceeded || hasSubmitted ? t("submitted") : t("submitAnswer")}
                    </button>
                  </div>
                  {room.status === "active" ? (
                    <button type="button" onClick={() => void giveUp()} className="mt-3 w-full rounded-xl border border-red-500/60 px-4 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/10">
                      {t("giveUp")}
                    </button>
                  ) : null}
                </div>
                <aside className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    {t("opponent")}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-violet-300/40 bg-violet-400/15 text-lg font-bold text-violet-200">{opponent?.avatarUrl ? <img src={opponent.avatarUrl} alt="" className="h-full w-full object-cover" /> : opponent?.name?.charAt(0).toUpperCase() ?? "?"}</div><div><h2 className="text-xl font-bold">{opponent?.name ?? t("waiting")}</h2><p className="text-xs text-slate-400">{opponent?.submitted ? "Unlocked" : opponent?.placedTiles ? "Testing code" : "Thinking"}</p></div></div>
                    <span className="text-2xl font-black text-amber-300">
                      {opponent?.score ?? 0}
                    </span>
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-950"><div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${Math.min(100, (opponent?.placedTiles ?? 0) * 33.333)}%` }} /></div>
                  <div className="mt-5 space-y-2 text-sm text-slate-400">
                    <p className="flex justify-between">
                      <span>{t("progressLabel")}</span>
                      <span className="text-white">
                        {Math.min(100, (opponent?.placedTiles ?? 0) * 25)}%
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span>{t("status")}</span>
                      <span className="text-cyan-300">
                        {opponent?.submitted
                          ? t("submitted")
                          : opponent?.ready
                            ? t("ready")
                            : t("thinking")}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span>{t("moves")}</span>
                      <span className="text-white">{opponent?.moves ?? 0}</span>
                    </p>
                  </div>
                </aside>
              </section>
            </>
          )}
        </div>
        <p className="mx-auto max-w-6xl text-sm text-slate-400">{message}</p>
      </main>
    </ProtectedRoute>
  );
}
