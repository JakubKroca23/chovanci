import { describe, it, expect } from "vitest";
import { getCards, getSituations, getVerdicts, getQuiz } from "./cards";

describe("content packs", () => {
  it("loads 16 unique cards with tags", () => {
    const cards = getCards();
    expect(cards).toHaveLength(16);
    expect(new Set(cards.map((c) => c.id)).size).toBe(16);
    for (const c of cards) {
      expect(c.tags.length).toBeGreaterThan(0);
      expect(c.image).toMatch(/^\/cards\//);
    }
  });

  it("loads at least 40 situations", () => {
    expect(getSituations().length).toBeGreaterThanOrEqual(40);
  });

  it("tags situations with packs", () => {
    const packs = new Set(getSituations().map((s) => s.pack ?? "mix"));
    expect(packs.has("prace")).toBe(true);
    expect(packs.has("rodina")).toBe(true);
    expect(packs.has("patek")).toBe(true);
  });

  it("loads verdicts and a 3–5 question quiz", () => {
    expect(getVerdicts().length).toBeGreaterThanOrEqual(30);
    const quiz = getQuiz();
    expect(quiz.length).toBeGreaterThanOrEqual(3);
    expect(quiz.length).toBeLessThanOrEqual(5);
  });
});
