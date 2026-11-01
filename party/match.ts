import type * as Party from "partykit/server";
import type { MatchState } from "../src/lib/types";
import {
  createLobby,
  joinLobby,
  startMatch,
  submitPlay,
  advanceAfterVerdict,
} from "../src/lib/match-machine";

type ClientMsg =
  | { type: "join"; playerId: string; name: string }
  | { type: "start" }
  | { type: "play"; cardId: string }
  | { type: "next" };

type ConnState = { playerId?: string };

export default class MatchServer implements Party.Server {
  state: MatchState | null = null;

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection<ConnState>) {
    if (this.state) {
      conn.send(JSON.stringify(this.state));
    }
  }

  onMessage(message: string, sender: Party.Connection<ConnState>) {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(message) as ClientMsg;
    } catch {
      return;
    }

    try {
      this.handle(msg, sender);
    } catch (err) {
      sender.send(
        JSON.stringify({
          type: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        }),
      );
      return;
    }

    if (this.state) {
      this.room.broadcast(JSON.stringify(this.state));
    }
  }

  private handle(msg: ClientMsg, sender: Party.Connection<ConnState>) {
    const code = this.room.id;

    switch (msg.type) {
      case "join": {
        if (!this.state) {
          this.state = createLobby(code, msg.playerId, msg.name);
        } else {
          this.state = joinLobby(this.state, msg.playerId, msg.name);
        }
        sender.setState({ playerId: msg.playerId });
        break;
      }
      case "start": {
        if (!this.state) throw new Error("No lobby");
        const playerId = sender.state?.playerId;
        if (!playerId || playerId !== this.state.hostId) {
          throw new Error("Only host can start");
        }
        this.state = startMatch(this.state, `${code}:1`);
        break;
      }
      case "play": {
        if (!this.state) throw new Error("No match");
        const playerId = sender.state?.playerId;
        if (!playerId) throw new Error("Join first");
        this.state = submitPlay(this.state, playerId, msg.cardId);
        break;
      }
      case "next": {
        if (!this.state) throw new Error("No match");
        const nextRound = this.state.round + 1;
        this.state = advanceAfterVerdict(
          this.state,
          `${code}:${nextRound}`,
        );
        break;
      }
      default:
        break;
    }
  }
}

MatchServer satisfies Party.Worker;
