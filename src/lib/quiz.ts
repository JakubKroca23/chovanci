import { getCards, getQuiz } from "./cards";
import type { CardTag } from "./types";

export function scoreQuiz(answerIndexes: number[]): {
  cardId: string;
  weights: Record<string, number>;
} {
  const quiz = getQuiz();
  const weights: Record<string, number> = {};
  quiz.forEach((q, qi) => {
    const answer = q.answers[answerIndexes[qi] ?? 0];
    for (const [tag, w] of Object.entries(answer.weights)) {
      weights[tag] = (weights[tag] ?? 0) + (w ?? 0);
    }
  });
  const tagFrequency = getCards().reduce<Record<string, number>>((acc, c) => {
    for (const t of c.tags) acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});

  const ranked = [...getCards()].sort((a, b) => {
    const sa = a.tags.reduce((s, t) => s + (weights[t] ?? 0), 0);
    const sb = b.tags.reduce((s, t) => s + (weights[t] ?? 0), 0);
    if (sb !== sa) return sb - sa;
    const ra = tagFrequency[a.tags[0]] ?? 99;
    const rb = tagFrequency[b.tags[0]] ?? 99;
    if (ra !== rb) return ra - rb; // rarer primary tag wins ties
    return a.id.localeCompare(b.id);
  });
  return { cardId: ranked[0].id, weights };
}
