import { describe, it, expect } from "vitest";
import { shuffle, dealHands, playCard, drawCard, pickSituationId } from "./deck";
import { getCards } from "./cards";

describe("deck", () => {
  it("shuffle is deterministic", () => {
    const ids = getCards().map((c) => c.id);
    expect(shuffle(ids, "s")).toEqual(shuffle(ids, "s"));
  });

  it("deals 4 cards per player without overlap", () => {
    const { hands, deck } = dealHands(["a", "b"], "room");
    expect(hands.a).toHaveLength(4);
    expect(hands.b).toHaveLength(4);
    expect(new Set([...hands.a, ...hands.b]).size).toBe(8);
    expect(deck.length).toBe(getCards().length - 8);
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
