import type { HsCardDef, HeroId } from "./types";
import { buildStarterDeck } from "./cards";

const GEN_KEY = "chovanci:generated-cards";
const DECKS_KEY = "chovanci:decks";
const HERO_KEY = "chovanci:hero";

export type SavedDeck = {
  id: string;
  name: string;
  heroId: HeroId;
  cards: string[]; // 30 ids
};

export function loadGeneratedCards(): HsCardDef[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GEN_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HsCardDef[];
  } catch {
    return [];
  }
}

export function saveGeneratedCard(card: HsCardDef) {
  const all = loadGeneratedCards().filter((c) => c.id !== card.id);
  all.push({ ...card, source: "generated" });
  localStorage.setItem(GEN_KEY, JSON.stringify(all));
}

export function loadDecks(): SavedDeck[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DECKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedDeck[];
  } catch {
    return [];
  }
}

export function saveDeck(deck: SavedDeck) {
  const all = loadDecks().filter((d) => d.id !== deck.id);
  all.push(deck);
  localStorage.setItem(DECKS_KEY, JSON.stringify(all.slice(0, 8)));
}

export function getActiveDeck(): SavedDeck {
  const decks = loadDecks();
  if (decks[0] && decks[0].cards.length === 30) return decks[0];
  return {
    id: "starter",
    name: "Základní balíček",
    heroId: loadHero(),
    cards: buildStarterDeck(),
  };
}

export function loadHero(): HeroId {
  if (typeof window === "undefined") return "nevychovanec";
  const h = localStorage.getItem(HERO_KEY);
  if (h === "vychovanec" || h === "prezivanec" || h === "nevychovanec") {
    return h;
  }
  return "nevychovanec";
}

export function saveHero(heroId: HeroId) {
  localStorage.setItem(HERO_KEY, heroId);
}
