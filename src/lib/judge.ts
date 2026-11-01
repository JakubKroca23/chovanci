import { getCard, getVerdicts } from "./cards";
import type { Card, Situation } from "./types";

function hashNoise(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 2 ** 32; // 0..1
}

export function scoreCard(card: Card, situation: Situation, seed: string): number {
  let score = 0;
  for (const tag of card.tags) {
    if (situation.tags.includes(tag)) score += 2;
    else score += 0.25; // soft presence
  }
  score += hashNoise(`${seed}:${card.id}`) * 0.5;
  return score;
}

export function pickWinner(
  cardIds: string[],
  situation: Situation,
  seed: string,
): { winnerId: string; scores: Record<string, number> } {
  const scores: Record<string, number> = {};
  for (const id of cardIds) {
    scores[id] = scoreCard(getCard(id), situation, seed);
  }
  const winnerId = [...cardIds].sort((a, b) => {
    const d = scores[b] - scores[a];
    if (d !== 0) return d;
    return a.localeCompare(b);
  })[0];
  return { winnerId, scores };
}

export function pickVerdict(
  winnerCardId: string,
  situation: Situation,
  seed: string,
): string {
  const card = getCard(winnerCardId);
  const primary = card.tags[0];
  const pool = getVerdicts().filter(
    (v) =>
      v.tags.includes(primary) ||
      (situation.mood && v.moods?.includes(situation.mood)),
  );
  const lines = pool.length > 0 ? pool : getVerdicts();
  const idx = Math.floor(hashNoise(`${seed}:verdict:${winnerCardId}`) * lines.length);
  return lines[idx].text;
}

export function judgeRound(
  cardIds: string[],
  situation: Situation,
  seed: string,
): { winnerCardId: string; verdictText: string } {
  const { winnerId } = pickWinner(cardIds, situation, seed);
  return {
    winnerCardId: winnerId,
    verdictText: pickVerdict(winnerId, situation, seed),
  };
}
