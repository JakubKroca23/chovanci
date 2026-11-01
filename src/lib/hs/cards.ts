import core from "../../../data/hs-cards.json";
import type { HsCardDef, HeroId } from "./types";

const CORE = core as HsCardDef[];

export const HEROES: {
  id: HeroId;
  name: string;
  powerText: string;
  powerCost: number;
  art: string;
}[] = [
  {
    id: "nevychovanec",
    name: "Nevychovanec",
    powerText: "Dej 1 damage nepřátelskému hrdinovi.",
    powerCost: 2,
    art: "/cards/hs/nevychovanec.jpg",
  },
  {
    id: "vychovanec",
    name: "Vychovanec",
    powerText: "Obnov si 2 životy.",
    powerCost: 2,
    art: "/cards/hs/vychovanec.jpg",
  },
  {
    id: "prezivanec",
    name: "Přeživanec",
    powerText: "Získej 2 armor.",
    powerCost: 2,
    art: "/cards/hs/prezivanec.jpg",
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

export function getCardDef(id: string, extra: HsCardDef[] = []): HsCardDef {
  const found = getAllDefs(extra).find((c) => c.id === id);
  if (!found) throw new Error(`Unknown card ${id}`);
  return found;
}

/** Balanced 30-card starter (~HS classic curve). */
export function buildStarterDeck(): string[] {
  const picks: Array<[string, number]> = [
    ["chovanec", 2],
    ["odchovanec", 2],
    ["podchovanec", 2],
    ["pochybovanec", 2],
    ["spell_kafe", 2],
    ["nevychovanec", 2],
    ["prechovanec", 2],
    ["spoluochovanec", 2],
    ["spell_roast", 2],
    ["spell_facka", 2],
    ["spell_inspirace", 1],
    ["weapon_pasilka", 1],
    ["vychovanec", 2],
    ["zhovanec", 1],
    ["nachovanec", 1],
    ["pracovanec", 1],
    ["secret_pozor", 1],
    ["dochovanec", 1],
    ["prezivanec", 1],
    ["spell_deadline", 1],
    ["nadchovanec", 1],
    ["spell_pondeli", 1],
    ["zachovanec", 1],
    ["chovanec_legend", 1],
  ];
  const deck: string[] = [];
  for (const [id, n] of picks) {
    for (let i = 0; i < n; i++) deck.push(id);
  }
  while (deck.length < 30) deck.push("chovanec");
  return deck.slice(0, 30);
}
