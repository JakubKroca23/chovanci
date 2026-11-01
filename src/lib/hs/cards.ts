import core from "../../../data/hs-cards.json";
import type { HsCardDef, HeroId } from "./types";

const CORE = core as HsCardDef[];

export const HEROES: {
  id: HeroId;
  name: string;
  powerText: string;
  powerCost: number;
}[] = [
  {
    id: "nevychovanec",
    name: "Nevychovanec",
    powerText: "Dej 1 damage nepřátelskému hrdinovi.",
    powerCost: 2,
  },
  {
    id: "vychovanec",
    name: "Vychovanec",
    powerText: "Obnov si 2 životy.",
    powerCost: 2,
  },
  {
    id: "prezivanec",
    name: "Přeživanec",
    powerText: "Získej 2 armor.",
    powerCost: 2,
  },
];

export function getCoreCards(): HsCardDef[] {
  return CORE.filter((c) => c.collectible !== false);
}

export function getAllDefs(extra: HsCardDef[] = []): HsCardDef[] {
  const map = new Map<string, HsCardDef>();
  for (const c of CORE) map.set(c.id, c);
  for (const c of extra) map.set(c.id, c);
  return [...map.values()];
}

export function getCardDef(
  id: string,
  extra: HsCardDef[] = [],
): HsCardDef {
  const found = getAllDefs(extra).find((c) => c.id === id);
  if (!found) throw new Error(`Unknown card ${id}`);
  return found;
}

/** Simple starter deck: 30 cards from core collectibles. */
export function buildStarterDeck(): string[] {
  const pool = getCoreCards().filter((c) => c.type !== "secret" || true);
  const deck: string[] = [];
  for (const card of pool) {
    if (card.id === "token_pejsek") continue;
    const copies = card.rarity === "legendary" ? 1 : 2;
    for (let i = 0; i < copies && deck.length < 30; i++) {
      deck.push(card.id);
    }
  }
  // pad / trim
  while (deck.length < 30) {
    deck.push("chovanec");
  }
  return deck.slice(0, 30);
}
