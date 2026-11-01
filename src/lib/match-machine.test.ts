import { describe, it, expect } from "vitest";
import {
  createLobby,
  joinLobby,
  rebindPlayer,
  startMatch,
  submitPlay,
  advanceAfterVerdict,
} from "./match-machine";
import { handSizeFor } from "./deck";
import { judgeRound } from "./judge";
import { getSituation } from "./cards";

describe("match-machine", () => {
  it("createLobby starts in lobby with host at score 0", () => {
    const state = createLobby("ABCD", "host", "Host");
    expect(state.phase).toBe("lobby");
    expect(state.code).toBe("ABCD");
    expect(state.hostId).toBe("host");
    expect(state.players).toEqual([{ id: "host", name: "Host", score: 0 }]);
    expect(state.round).toBe(0);
    expect(state.usedSituationIds).toEqual([]);
  });

  it("joinLobby adds players and rejects duplicates / over 6", () => {
    let state = createLobby("ABCD", "p1", "One");
    state = joinLobby(state, "p2", "Two");
    expect(state.players).toHaveLength(2);

    expect(() => joinLobby(state, "p2", "Dup")).toThrow();

    state = joinLobby(state, "p3", "Three");
    state = joinLobby(state, "p4", "Four");
    state = joinLobby(state, "p5", "Five");
    state = joinLobby(state, "p6", "Six");
    expect(state.players).toHaveLength(6);
    expect(() => joinLobby(state, "p7", "Seven")).toThrow();
  });

  it("rebindPlayer succeeds for known player mid-pick and throws for unknown", () => {
    let state = createLobby("RBND", "p1", "One");
    state = joinLobby(state, "p2", "Two");
    state = startMatch(state, "RBND:1");
    expect(state.phase).toBe("pick");

    expect(rebindPlayer(state, "p1")).toBe(state);
    expect(rebindPlayer(state, "p2")).toEqual(state);
    expect(() => rebindPlayer(state, "ghost")).toThrow(/Unknown player/);
  });

  it("startMatch requires 2–6 players, deals hands, picks situation", () => {
    const alone = createLobby("ABCD", "p1", "One");
    expect(() => startMatch(alone, "ABCD:1")).toThrow();

    let state = joinLobby(alone, "p2", "Two");
    state = startMatch(state, "ABCD:1");
    expect(state.phase).toBe("pick");
    expect(state.round).toBe(1);
    expect(state.situationId).toBeTruthy();
    expect(state.usedSituationIds).toEqual([state.situationId]);
    expect(state.hands.p1).toHaveLength(4);
    expect(state.hands.p2).toHaveLength(4);
    expect(new Set([...state.hands.p1, ...state.hands.p2]).size).toBe(8);
  });

  it("startMatch with 6 players deals scaled non-empty hands", () => {
    let state = createLobby("SIX6", "p1", "One");
    for (let i = 2; i <= 6; i++) {
      state = joinLobby(state, `p${i}`, `P${i}`);
    }
    state = startMatch(state, "SIX6:1");
    const handSize = handSizeFor(6);
    expect(handSize).toBeGreaterThan(0);
    expect(handSize).toBe(2);
    const dealt: string[] = [];
    for (const p of state.players) {
      expect(state.hands[p.id]).toHaveLength(handSize);
      expect(state.hands[p.id].length).toBeGreaterThan(0);
      dealt.push(...state.hands[p.id]);
    }
    expect(new Set(dealt).size).toBe(handSize * 6);
  });

  it("all plays trigger verdict and winner gets +1 score", () => {
    let state = createLobby("ROOM", "p1", "One");
    state = joinLobby(state, "p2", "Two");
    state = startMatch(state, "ROOM:1");

    const card1 = state.hands.p1[0];
    const card2 = state.hands.p2[0];
    state = submitPlay(state, "p1", card1);
    expect(state.phase).toBe("pick");
    expect(Object.keys(state.plays)).toHaveLength(1);

    state = submitPlay(state, "p2", card2);
    expect(state.phase).toBe("verdict");
    expect(state.winnerId).toBeTruthy();
    expect(state.verdictText).toBeTruthy();

    const situation = getSituation(state.situationId!);
    const judged = judgeRound([card1, card2], situation, "ROOM:1");
    const expectedWinner =
      judged.winnerCardId === card1 ? "p1" : "p2";
    expect(state.winnerId).toBe(expectedWinner);
    expect(state.players.find((p) => p.id === expectedWinner)!.score).toBe(1);
    expect(state.players.find((p) => p.id !== expectedWinner)!.score).toBe(0);
  });

  it("advanceAfterVerdict moves to next pick; round 5 ends in final", () => {
    let state = createLobby("ZZZZ", "a", "A");
    state = joinLobby(state, "b", "B");
    state = startMatch(state, "ZZZZ:1");

    for (let round = 1; round <= 5; round++) {
      const seed = `ZZZZ:${round}`;
      const plays = Object.fromEntries(
        state.players.map((p) => [p.id, state.hands[p.id][0]]),
      );
      for (const [pid, cardId] of Object.entries(plays)) {
        state = submitPlay(state, pid, cardId);
      }

      if (round < 5) {
        expect(state.phase).toBe("verdict");
        expect(state.round).toBe(round);
        const beforeUsed = [...state.usedSituationIds];
        state = advanceAfterVerdict(state, `ZZZZ:${round + 1}`);
        expect(state.phase).toBe("pick");
        expect(state.round).toBe(round + 1);
        expect(state.plays).toEqual({});
        expect(state.winnerId).toBeNull();
        expect(state.verdictText).toBeNull();
        expect(state.usedSituationIds).toHaveLength(beforeUsed.length + 1);
        expect(state.usedSituationIds.slice(0, -1)).toEqual(beforeUsed);
        expect(beforeUsed).not.toContain(state.situationId);
        expect(state.usedSituationIds.at(-1)).toBe(state.situationId);
        for (const p of state.players) {
          expect(state.hands[p.id]).toHaveLength(4);
        }
        // seed used for situation after advance
        void seed;
      } else {
        expect(state.phase).toBe("final");
        expect(state.round).toBe(5);
        const noop = advanceAfterVerdict(state, "ZZZZ:6");
        expect(noop.phase).toBe("final");
      }
    }

    // Full match: five distinct used situation ids
    expect(state.usedSituationIds).toHaveLength(5);
    expect(new Set(state.usedSituationIds).size).toBe(5);
  });
});
