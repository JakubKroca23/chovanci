import cards from "../../data/cards.json";
import situations from "../../data/situations.json";
import verdicts from "../../data/verdicts.json";
import quiz from "../../data/quiz.json";
import type { Card, Situation, VerdictLine, QuizQuestion } from "./types";

export function getCards(): Card[] {
  return cards as Card[];
}
export function getCard(id: string): Card {
  const card = getCards().find((c) => c.id === id);
  if (!card) throw new Error(`Unknown card: ${id}`);
  return card;
}
export function getSituations(): Situation[] {
  return situations as Situation[];
}
export function getSituation(id: string): Situation {
  const s = getSituations().find((x) => x.id === id);
  if (!s) throw new Error(`Unknown situation: ${id}`);
  return s;
}
export function getVerdicts(): VerdictLine[] {
  return verdicts as VerdictLine[];
}
export function getQuiz(): QuizQuestion[] {
  return quiz as QuizQuestion[];
}
