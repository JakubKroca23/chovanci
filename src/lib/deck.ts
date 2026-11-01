import { getCards, getSituations } from "./cards";
import { hashNoise } from "./hash";

export function shuffle<T>(items: T[], seed: string): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(hashNoise(`${seed}:${i}`) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function dealHands(
  playerIds: string[],
  seed: string,
): { hands: Record<string, string[]>; deck: string[] } {
  const shuffled = shuffle(
    getCards().map((c) => c.id),
    seed,
  );
  const hands: Record<string, string[]> = {};
  let offset = 0;
  for (const playerId of playerIds) {
    hands[playerId] = shuffled.slice(offset, offset + 4);
    offset += 4;
  }
  return { hands, deck: shuffled.slice(offset) };
}

export function playCard(hand: string[], cardId: string): string[] {
  const idx = hand.indexOf(cardId);
  if (idx === -1) return [...hand];
  return [...hand.slice(0, idx), ...hand.slice(idx + 1)];
}

export function drawCard(
  hand: string[],
  deck: string[],
  discard: string[],
): { hand: string[]; deck: string[]; discard: string[] } {
  let nextDeck = [...deck];
  let nextDiscard = [...discard];
  if (nextDeck.length === 0) {
    nextDeck = shuffle(nextDiscard, nextDiscard.join("|"));
    nextDiscard = [];
  }
  if (nextDeck.length === 0) {
    return { hand: [...hand], deck: nextDeck, discard: nextDiscard };
  }
  const card = nextDeck.pop()!;
  return { hand: [...hand, card], deck: nextDeck, discard: nextDiscard };
}

export function pickSituationId(seed: string, usedIds: string[]): string {
  const ids = getSituations().map((s) => s.id);
  const used = new Set(usedIds);
  const shuffled = shuffle(ids, seed);
  const available = shuffled.find((id) => !used.has(id));
  if (available) return available;
  // Exhausted — reshuffle all and pick first of the new order.
  return shuffle(ids, `${seed}:reshuffle:${usedIds.length}`)[0];
}
