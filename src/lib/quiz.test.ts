import { describe, it, expect } from "vitest";
import { scoreQuiz } from "./quiz";
import { getQuiz, getCards } from "./cards";

describe("quiz", () => {
  it("returns a known card id", () => {
    const quiz = getQuiz();
    const answers = quiz.map(() => 0);
    const result = scoreQuiz(answers);
    expect(getCards().some((c) => c.id === result.cardId)).toBe(true);
  });

  it("is deterministic for the same answers", () => {
    const answers = getQuiz().map((_, i) => i % 2);
    expect(scoreQuiz(answers).cardId).toBe(scoreQuiz(answers).cardId);
  });
});
