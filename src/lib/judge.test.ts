import { describe, it, expect } from "vitest";
import { scoreCard, pickWinner, judgeRound } from "./judge";
import { getCard, getSituations } from "./cards";

describe("judge", () => {
  const situation = getSituations()[0];

  it("scores tag overlap higher than no overlap", () => {
    const tagged = {
      ...getCard("chovanec"),
      id: "a",
      tags: [...situation.tags],
    };
    const otherCard = {
      ...getCard("pochybovanec"),
      tags: ["pochybnost" as const],
    };
    expect(scoreCard(tagged, situation, "abc")).toBeGreaterThan(
      scoreCard(otherCard, situation, "abc"),
    );
  });

  it("is deterministic for the same seed", () => {
    const ids = ["nevychovanec", "vychovanec", "pracovanec"];
    const a = pickWinner(ids, situation, "room-1-round-1");
    const b = pickWinner(ids, situation, "room-1-round-1");
    expect(a.winnerId).toBe(b.winnerId);
  });

  it("judgeRound returns winner and czech verdict text", () => {
    const result = judgeRound(
      ["nachovanec", "pracovanec"],
      situation,
      "seed-x",
    );
    expect(result.winnerCardId).toBeTruthy();
    expect(result.verdictText.length).toBeGreaterThan(5);
  });
});
