import { describe, it, expect } from "vitest";
import {
  shuffle,
  dealHands,
  playCard,
  drawCard,
  pickSituationId,
  handSizeFor,
} from "./deck";
import { getCards } from "./cards";

describe("deck", () => {
  it("shuffle is deterministic", () => {
    const ids = getCards().map((c) => c.id);
    expect(shuffle(ids, "s")).toEqual(shuffle(ids, "s"));
  });

  it("handSizeFor scales with player count", () => {
    expect(handSizeFor(2)).toBe(4);
    expect(handSizeFor(3)).toBe(4);
    expect(handSizeFor(4)).toBe(4);
    expect(handSizeFor(5)).toBe(3);
    expect(handSizeFor(6)).toBe(2);
  });

  it("deals 4 cards per player without overlap", () => {
    const { hands, deck, handSize } = dealHands(["a", "b"], "room");
    expect(handSize).toBe(4);
    expect(hands.a).toHaveLength(4);
    expect(hands.b).toHaveLength(4);
    expect(new Set([...hands.a, ...hands.b]).size).toBe(8);
    expect(deck.length).toBe(getCards().length - 8);
  });

  it("deals 3 non-overlapping cards each for 5 players", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const { hands, deck, handSize } = dealHands(ids, "five");
    expect(handSize).toBe(3);
    const dealt: string[] = [];
    for (const id of ids) {
      expect(hands[id]).toHaveLength(3);
      expect(hands[id].length).toBeGreaterThan(0);
      dealt.push(...hands[id]);
    }
    expect(new Set(dealt).size).toBe(15);
    expect(deck.length).toBe(getCards().length - 15);
  });

  it("deals 2 non-overlapping cards each for 6 players", () => {
    const ids = ["a", "b", "c", "d", "e", "f"];
    const { hands, deck, handSize } = dealHands(ids, "six");
    expect(handSize).toBe(2);
    const dealt: string[] = [];
    for (const id of ids) {
      expect(hands[id]).toHaveLength(2);
      expect(hands[id].length).toBeGreaterThan(0);
      dealt.push(...hands[id]);
    }
    expect(new Set(dealt).size).toBe(12);
    expect(deck.length).toBe(getCards().length - 12);
  });

  it("playCard removes one card; drawCard refills and reshuffles discard when deck empty", () => {
    let hand = ["chovanec", "zhovanec", "pracovanec", "nachovanec"];
    hand = playCard(hand, "chovanec");
    expect(hand).not.toContain("chovanec");
    const drawn = drawCard(hand, [], ["nevychovanec", "vychovanec"]);
    expect(drawn.hand).toHaveLength(hand.length + 1);
  });

  it("pickSituationId skips used ids", () => {
    const first = pickSituationId("room", []);
    const second = pickSituationId("room", [first]);
    expect(second).not.toBe(first);
  });
});
