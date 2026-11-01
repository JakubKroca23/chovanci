import type { HsAction, HsMatch } from "./types";
import { getOrCreatePlayerId } from "@/lib/multi-client";

export type HsClientMsg =
  | { type: "join"; playerId: string; name: string; heroId: string; deck: string[] }
  | { type: "action"; action: HsAction };

export type HsServerMsg =
  | { type: "state"; match: HsMatch; you: 0 | 1 }
  | { type: "lobby"; seats: number; message: string }
  | { type: "error"; message: string }
  | { type: "connection"; status: "open" | "closed" | "error"; message?: string };

function wsBase(): string {
  const env = process.env.NEXT_PUBLIC_MATCH_WS_URL?.replace(/\/$/, "");
  if (env) {
    // wss://host/ws → wss://host/hs
    return env.replace(/\/ws$/, "/hs");
  }
  const proto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws";
  const host =
    process.env.NEXT_PUBLIC_PARTYKIT_HOST ??
    (typeof window !== "undefined" ? window.location.host : "localhost:3001");
  return `${proto}://${host}/hs`;
}

export function connectHsMatch(code: string): {
  send: (msg: HsClientMsg) => void;
  subscribe: (cb: (msg: HsServerMsg) => void) => () => void;
  close: () => void;
  playerId: string;
} {
  const playerId = getOrCreatePlayerId();
  const url = `${wsBase()}?room=${encodeURIComponent(code.toUpperCase())}`;
  const socket = new WebSocket(url);
  const listeners = new Set<(msg: HsServerMsg) => void>();
  const emit = (m: HsServerMsg) => listeners.forEach((cb) => cb(m));

  socket.addEventListener("open", () => emit({ type: "connection", status: "open" }));
  socket.addEventListener("close", () => emit({ type: "connection", status: "closed" }));
  socket.addEventListener("error", () =>
    emit({ type: "connection", status: "error", message: "Spojení selhalo." }),
  );
  socket.addEventListener("message", (ev) => {
    try {
      emit(JSON.parse(String(ev.data)) as HsServerMsg);
    } catch {
      /* ignore */
    }
  });

  return {
    playerId,
    send(msg) {
      socket.send(JSON.stringify(msg));
    },
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    close() {
      listeners.clear();
      socket.close();
    },
  };
}
