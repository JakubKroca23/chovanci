/**
 * Self-hosted match WebSocket server (production alternative to PartyKit).
 * Protocol: JSON ClientMsg / MatchState / { type: "error", code, message }
 * Connect: ws(s)://host/ws?room=ABCD
 */
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import {
  createLobby,
  joinLobby,
  rebindPlayer,
  startMatch,
  submitPlay,
  advanceAfterVerdict,
} from "../src/lib/match-machine";
import { toMultiErrorCode } from "../src/lib/multi-errors";
import type { MatchState } from "../src/lib/types";

type ClientMsg =
  | { type: "join"; playerId: string; name: string }
  | { type: "start" }
  | { type: "play"; cardId: string }
  | { type: "next" };

type ConnMeta = { playerId?: string; room: string };

type Room = {
  state: MatchState | null;
  clients: Set<WebSocket>;
};

const rooms = new Map<string, Room>();
const meta = new WeakMap<WebSocket, ConnMeta>();

const PORT = Number(process.env.MATCH_WS_PORT ?? 3001);
const PATH = process.env.MATCH_WS_PATH ?? "/ws";

function getRoom(code: string): Room {
  const key = code.toUpperCase();
  let room = rooms.get(key);
  if (!room) {
    room = { state: null, clients: new Set() };
    rooms.set(key, room);
  }
  return room;
}

function send(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcast(room: Room, payload: unknown) {
  const raw = JSON.stringify(payload);
  for (const client of room.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(raw);
  }
}

function handle(msg: ClientMsg, ws: WebSocket, roomCode: string) {
  const room = getRoom(roomCode);
  const conn = meta.get(ws) ?? { room: roomCode };

  switch (msg.type) {
    case "join": {
      if (!room.state) {
        room.state = createLobby(roomCode, msg.playerId, msg.name);
      } else if (room.state.players.some((p) => p.id === msg.playerId)) {
        rebindPlayer(room.state, msg.playerId);
      } else {
        room.state = joinLobby(room.state, msg.playerId, msg.name);
      }
      conn.playerId = msg.playerId;
      meta.set(ws, conn);
      break;
    }
    case "start": {
      if (!room.state) throw new Error("NO_LOBBY");
      if (!conn.playerId || conn.playerId !== room.state.hostId) {
        throw new Error("ONLY_HOST");
      }
      room.state = startMatch(room.state, `${roomCode}:1`);
      break;
    }
    case "play": {
      if (!room.state) throw new Error("NO_MATCH");
      if (!conn.playerId) throw new Error("JOIN_FIRST");
      room.state = submitPlay(room.state, conn.playerId, msg.cardId);
      break;
    }
    case "next": {
      if (!room.state) throw new Error("NO_MATCH");
      const nextRound = room.state.round + 1;
      room.state = advanceAfterVerdict(room.state, `${roomCode}:${nextRound}`);
      break;
    }
    default:
      break;
  }

  if (room.state) broadcast(room, room.state);
}

const server = createServer((_req, res) => {
  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  res.end("chovanci match ws\n");
});

const wss = new WebSocketServer({ server, path: PATH });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const roomCode = (url.searchParams.get("room") ?? "").toUpperCase();
  if (!/^[A-Z]{4}$/.test(roomCode)) {
    send(ws, { type: "error", code: "BAD_ROOM", message: "BAD_ROOM" });
    ws.close();
    return;
  }

  const room = getRoom(roomCode);
  room.clients.add(ws);
  meta.set(ws, { room: roomCode });

  if (room.state) send(ws, room.state);

  ws.on("message", (data) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(String(data)) as ClientMsg;
    } catch {
      return;
    }
    try {
      handle(msg, ws, roomCode);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Unknown error";
      const code = toMultiErrorCode(raw);
      send(ws, { type: "error", code, message: code });
    }
  });

  ws.on("close", () => {
    room.clients.delete(ws);
    if (room.clients.size === 0 && room.state?.phase === "lobby") {
      rooms.delete(roomCode);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`chovanci match ws on :${PORT}${PATH}`);
});
