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
  setPack,
  startMatch,
  submitPlay,
  advanceAfterVerdict,
} from "../src/lib/match-machine";
import { toMultiErrorCode } from "../src/lib/multi-errors";
import type { MatchState, SituationPack } from "../src/lib/types";
import { createMatch, applyAction } from "../src/lib/hs/engine";
import { buildStarterDeck } from "../src/lib/hs/cards";
import type { HeroId, HsAction, HsMatch } from "../src/lib/hs/types";

type ClientMsg =
  | { type: "join"; playerId: string; name: string }
  | { type: "setPack"; pack: SituationPack }
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
    case "setPack": {
      if (!room.state) throw new Error("NO_LOBBY");
      if (!conn.playerId) throw new Error("JOIN_FIRST");
      room.state = setPack(room.state, conn.playerId, msg.pack);
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

// --- ChovanecStone 1v1 (path /hs) ---
type HsRoom = {
  match: HsMatch | null;
  seats: { playerId: string; name: string; heroId: HeroId; deck: string[] }[];
  clients: Map<WebSocket, string>; // ws -> playerId
};

const hsRooms = new Map<string, HsRoom>();

function getHsRoom(code: string): HsRoom {
  let room = hsRooms.get(code);
  if (!room) {
    room = { match: null, seats: [], clients: new Map() };
    hsRooms.set(code, room);
  }
  return room;
}

function broadcastHs(room: HsRoom) {
  if (!room.match) return;
  for (const [ws, playerId] of room.clients) {
    const you = room.match.players[0]!.id === playerId ? 0 : 1;
    send(ws, { type: "state", match: room.match, you });
  }
}

const hsWss = new WebSocketServer({ server, path: "/hs" });
hsWss.on("connection", (ws, req) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const roomCode = (url.searchParams.get("room") ?? "").toUpperCase();
  if (!/^[A-Z]{4}$/.test(roomCode)) {
    send(ws, { type: "error", message: "Neplatný kód." });
    ws.close();
    return;
  }
  const room = getHsRoom(roomCode);
  room.clients.set(ws, "");

  ws.on("message", (data) => {
    let msg: {
      type: string;
      playerId?: string;
      name?: string;
      heroId?: string;
      deck?: string[];
      action?: HsAction;
    };
    try {
      msg = JSON.parse(String(data));
    } catch {
      return;
    }
    try {
      if (msg.type === "join" && msg.playerId && msg.name) {
        room.clients.set(ws, msg.playerId);
        const existing = room.seats.find((s) => s.playerId === msg.playerId);
        if (!existing && room.seats.length < 2 && !room.match) {
          room.seats.push({
            playerId: msg.playerId,
            name: msg.name,
            heroId: (msg.heroId as HeroId) || "nevychovanec",
            deck:
              msg.deck && msg.deck.length === 30
                ? msg.deck
                : buildStarterDeck(),
          });
        }
        if (room.seats.length === 2 && !room.match) {
          const [a, b] = room.seats;
          room.match = createMatch({
            id: roomCode,
            p0: {
              id: a!.playerId,
              name: a!.name,
              heroId: a!.heroId,
              deck: a!.deck,
            },
            p1: {
              id: b!.playerId,
              name: b!.name,
              heroId: b!.heroId,
              deck: b!.deck,
            },
          });
        }
        if (room.match) broadcastHs(room);
        else {
          for (const [client] of room.clients) {
            send(client, {
              type: "lobby",
              seats: room.seats.length,
              message: `Lobby ${room.seats.length}/2 — čekám na soupeře…`,
            });
          }
        }
        return;
      }
      if (msg.type === "action" && msg.action && room.match) {
        const playerId = room.clients.get(ws);
        const activeId = room.match.players[room.match.active]!.id;
        if (playerId !== activeId) {
          send(ws, { type: "error", message: "Nejsi na tahu." });
          return;
        }
        room.match = applyAction(room.match, msg.action);
        broadcastHs(room);
      }
    } catch (err) {
      send(ws, {
        type: "error",
        message: err instanceof Error ? err.message : "Chyba",
      });
    }
  });

  ws.on("close", () => {
    room.clients.delete(ws);
    if (room.clients.size === 0) hsRooms.delete(roomCode);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`chovanci match ws on :${PORT}${PATH} and /hs`);
});
