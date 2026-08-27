"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { ProtectedRoute } from "@/lib/auth/route-guard";
import { fetchWithAuth } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";

type Player = {
  uid: string;
  name: string;
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

const apiBase = () =>
  (
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:5000"
  ).replace(/\/api\/?$/, "");

export default function BrainGamePage() {
  const { firebaseUser } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [code, setCode] = useState("");
  const [expression, setExpression] = useState("");
  const [seconds, setSeconds] = useState(45);
  const [message, setMessage] = useState(
    "Create a room or join a friend with their six-character code.",
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
          45 - Math.floor((Date.now() - room.roundStartedAt!) / 1000),
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
      setMessage("Room created. Share the code with your opponent.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to create room.",
      );
    }
  };
  const joinRoom = async () => {
    try {
      setSubmittedRound(null);
      setErrorMessage(null);
      setSubmitSucceeded(false);
      setRoom(
        await fetchWithAuth<Room>("/api/brain-game/rooms/join", {
          method: "POST",
          body: JSON.stringify({ code }),
        }),
      );
      setMessage("Joined room. Both players must tap Ready.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to join room.",
      );
    }
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
        setMessage("Both players ready. Starting puzzle...");
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
    setMessage("Submitting...");
    try {
      setRoom(
        await fetchWithAuth<Room>(`/api/brain-game/rooms/${room.id}/submit`, {
          method: "POST",
          body: JSON.stringify({ expression }),
        }),
      );
      setExpression("");
      setSubmitSucceeded(true);
      setMessage("Answer submitted.");
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
      setMessage("You gave up. Your opponent wins.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to give up.",
      );
    }
  };
  const append = (tile: string) =>
    updateExpression(`${expression}${expression ? " " : ""}${tile}`);
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
      <main className="min-h-screen bg-[#07111f] p-4 text-slate-50 sm:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
                Puzzle Pulse
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-tight">
                Live Math Duel
              </h1>
            </div>
            {room ? (
              <div className="text-right">
                <p className="text-sm text-slate-400">
                  Room <span className="font-bold text-white">{room.code}</span>
                </p>
                <p className="mt-1 font-mono text-xl text-amber-300">
                  Round {room.round}/{room.totalRounds} · {formatTime}
                </p>
              </div>
            ) : null}
          </header>
          {resultMessage ? (
            <section className="rounded-3xl border border-amber-300/60 bg-amber-300/15 p-6 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-200">Game complete</p>
              <h2 className="mt-2 text-3xl font-black text-amber-300">{resultMessage}</h2>
            </section>
          ) : null}
          {!room ? (
            <section className="grid gap-5 md:grid-cols-2">
              <div className="rounded-3xl border border-cyan-400/30 bg-cyan-400/10 p-7">
                <p className="text-sm text-cyan-200">Host a private duel</p>
                <h2 className="mt-2 text-2xl font-bold">Create room</h2>
                <button
                  type="button"
                  onClick={() => void createRoom()}
                  className="mt-7 rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950"
                >
                  Create room
                </button>
              </div>
              <div className="rounded-3xl border border-slate-700 bg-slate-900 p-7">
                <p className="text-sm text-slate-400">Have a room code?</p>
                <h2 className="mt-2 text-2xl font-bold">Join a duel</h2>
                <div className="mt-7 flex gap-2">
                  <input
                    aria-label="Room code"
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
                    Join
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <>
              <section className="rounded-3xl border border-slate-700 bg-slate-900 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">
                      {room.status === "waiting"
                        ? "Waiting for opponent"
                        : room.status === "countdown"
                          ? "Get ready"
                          : room.status === "finished"
                            ? "Duel complete"
                            : room.puzzle?.mode}
                    </p>
                    <h2 className="mt-1 text-2xl font-bold">
                      {room.puzzle ? (
                        <>
                          Target:{" "}
                          <span className="text-amber-300">
                            {room.puzzle.target}
                          </span>
                        </>
                      ) : (
                        "Both students join to begin"
                      )}
                    </h2>
                  </div>
                  {room.status !== "active" && room.status !== "finished" ? (
                    <button
                      type="button"
                      onClick={() => void ready()}
                      disabled={me?.ready || !opponent}
                      className="rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-40"
                    >
                      {me?.ready ? "Ready" : "Ready up"}
                    </button>
                  ) : null}
                </div>
              </section>
              <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
                <div className="rounded-3xl border border-cyan-400/40 bg-[#0b1b2e] p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
                        You
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
                        score · {me?.moves ?? 0} moves
                      </p>
                    </div>
                  </div>
                  <div className="mt-8 min-h-24 rounded-2xl border-2 border-dashed border-cyan-300/40 bg-slate-950/60 p-4 text-xl font-bold">
                    {expression || (
                      <span className="text-slate-600">Drop tiles here</span>
                    )}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {room.puzzle?.numbers.map((number) => (
                      <button
                        type="button"
                        key={number}
                        disabled={room.status !== "active" || hasSubmitted}
                        onClick={() => append(String(number))}
                        className="h-12 w-12 rounded-xl border border-cyan-300/40 bg-cyan-300/15 text-lg font-bold text-cyan-100 disabled:opacity-40"
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
                      Wrong answer: {errorMessage}
                    </p>
                  ) : null}
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      disabled={room.status !== "active" || hasSubmitted}
                      onClick={() => updateExpression("")}
                      className="rounded-xl border border-slate-600 px-4 py-3 font-semibold disabled:opacity-40"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => void submit()}
                      disabled={room.status !== "active" || hasSubmitted || seconds === 0}
                      className={`flex-1 rounded-xl px-4 py-3 font-bold text-slate-950 disabled:opacity-40 ${errorMessage ? "bg-red-400" : submitSucceeded || hasSubmitted ? "bg-emerald-400" : "bg-cyan-400"}`}
                    >
                      {errorMessage ? "Wrong answer" : submitSucceeded || hasSubmitted ? "Submitted" : "Submit answer"}
                    </button>
                  </div>
                  {room.status === "active" ? (
                    <button type="button" onClick={() => void giveUp()} className="mt-4 w-full rounded-xl border border-red-500/60 px-4 py-3 font-semibold text-red-300 hover:bg-red-500/10">
                      Give up
                    </button>
                  ) : null}
                </div>
                <aside className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    Opponent
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <h2 className="text-xl font-bold">
                      {opponent?.name ?? "Waiting..."}
                    </h2>
                    <span className="text-2xl font-black text-amber-300">
                      {opponent?.score ?? 0}
                    </span>
                  </div>
                  <div className="mt-8 grid grid-cols-4 gap-2">
                    {Array.from(
                      { length: room.puzzle?.numbers.length ?? 4 },
                      (_, index) => (
                        <span
                          key={index}
                          className="aspect-square rounded-xl border border-slate-600 bg-slate-950 text-center text-2xl leading-[3.2rem] text-slate-500"
                        >
                          {opponent && index < opponent.placedTiles ? "■" : "·"}
                        </span>
                      ),
                    )}
                  </div>
                  <div className="mt-6 space-y-3 text-sm text-slate-400">
                    <p className="flex justify-between">
                      <span>Progress</span>
                      <span className="text-white">
                        {Math.min(100, (opponent?.placedTiles ?? 0) * 25)}%
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span>Status</span>
                      <span className="text-cyan-300">
                        {opponent?.submitted
                          ? "Submitted"
                          : opponent?.ready
                            ? "Ready"
                            : "Thinking"}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span>Moves</span>
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
