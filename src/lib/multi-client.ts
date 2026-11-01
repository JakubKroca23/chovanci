import PartySocket from "partysocket";
import type { MatchState } from "./types";

export type ClientMsg =
  | { type: "join"; playerId: string; name: string }
  | { type: "start" }
  | { type: "play"; cardId: string }
  | { type: "next" };

export type ServerError = { type: "error"; message: string };

export type ConnectionEvent =
  | { type: "connection"; status: "open" }
  | { type: "connection"; status: "error"; message: string }
  | { type: "connection"; status: "closed" };

export type MatchMessage = MatchState | ServerError | ConnectionEvent;

export type MatchConnection = {
  send: (msg: ClientMsg) => void;
  subscribe: (cb: (msg: MatchMessage) => void) => () => void;
  close: () => void;
};

const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O
const PLAYER_ID_KEY = "chovanci:playerId";

export const DISCONNECT_CS =
  "Spojení s místností selhalo. Zkontroluj PartyKit (npx partykit dev) a obnov stránku.";

export function getPartyKitHost(): string {
  return process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999";
}

/** 4-char room code from unambiguous A–Z letters. */
export function generateRoomCode(length = 4): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ROOM_ALPHABET[bytes[i]! % ROOM_ALPHABET.length]!;
  }
  return code;
}

export function getOrCreatePlayerId(): string {
  if (typeof window === "undefined") return "";
  const existing = sessionStorage.getItem(PLAYER_ID_KEY);
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `p-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  sessionStorage.setItem(PLAYER_ID_KEY, id);
  return id;
}

function isMatchState(value: unknown): value is MatchState {
  return (
    typeof value === "object" &&
    value !== null &&
    "phase" in value &&
    "players" in value &&
    "code" in value
  );
}

function isServerError(value: unknown): value is ServerError {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as ServerError).type === "error" &&
    typeof (value as ServerError).message === "string"
  );
}

export function connectToMatch(code: string): MatchConnection {
  const socket = new PartySocket({
    host: getPartyKitHost(),
    room: code.toUpperCase(),
  });

  const listeners = new Set<(msg: MatchMessage) => void>();

  const emit = (msg: MatchMessage) => {
    for (const cb of listeners) cb(msg);
  };

  const onMessage = (event: MessageEvent) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(event.data));
    } catch {
      return;
    }
    if (isServerError(parsed) || isMatchState(parsed)) {
      emit(parsed);
    }
  };

  const onOpen = () => {
    emit({ type: "connection", status: "open" });
  };

  const onError = () => {
    emit({ type: "connection", status: "error", message: DISCONNECT_CS });
  };

  const onClose = () => {
    // Soft signal only — UI decides whether a transient close becomes a hard error.
    emit({ type: "connection", status: "closed" });
  };

  socket.addEventListener("message", onMessage);
  socket.addEventListener("open", onOpen);
  socket.addEventListener("error", onError);
  socket.addEventListener("close", onClose);

  return {
    send(msg: ClientMsg) {
      socket.send(JSON.stringify(msg));
    },
    subscribe(cb: (msg: MatchMessage) => void) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    close() {
      socket.removeEventListener("message", onMessage);
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("error", onError);
      socket.removeEventListener("close", onClose);
      listeners.clear();
      socket.close();
    },
  };
}
