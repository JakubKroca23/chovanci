import { getCards, getSituations } from "./cards";
import { hashNoise } from "./hash";
import type { SituationPack } from "./types";

export function shuffle<T>(items: T[], seed: string): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(hashNoise(`${seed}:${i}`) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Cards per player: min(4, floor(deck / players)). 2–4→4, 5→3, 6→2. */
export function handSizeFor(playerCount: number): number {
  if (playerCount <= 0) return 0;
  return Math.min(4, Math.floor(getCards().length / playerCount));
}

export function dealHands(
  playerIds: string[],
  seed: string,
): { hands: Record<string, string[]>; deck: string[]; handSize: number } {
  const handSize = handSizeFor(playerIds.length);
  const shuffled = shuffle(
    getCards().map((c) => c.id),
    seed,
  );
  const hands: Record<string, string[]> = {};
  let offset = 0;
  for (const playerId of playerIds) {
    hands[playerId] = shuffled.slice(offset, offset + handSize);
    offset += handSize;
  }
  return { hands, deck: shuffled.slice(offset), handSize };
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

export function situationIdsForPack(pack: SituationPack = "mix"): string[] {
  const all = getSituations();
  if (pack === "mix") return all.map((s) => s.id);
  const filtered = all.filter((s) => (s.pack ?? "mix") === pack);
  return filtered.length > 0 ? filtered.map((s) => s.id) : all.map((s) => s.id);
}

export function pickSituationId(
  seed: string,
  usedIds: string[],
  pack: SituationPack = "mix",
): string {
  const ids = situationIdsForPack(pack);
  const used = new Set(usedIds);
  const shuffled = shuffle(ids, seed);
  const available = shuffled.find((id) => !used.has(id));
  if (available) return available;
  // Exhausted — reshuffle pack and pick first of the new order.
  return shuffle(ids, `${seed}:reshuffle:${usedIds.length}`)[0]!;
}
