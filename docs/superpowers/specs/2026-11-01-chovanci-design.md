# Chovanci — Design Spec

**Date:** 2026-11-01  
**Status:** Approved for planning  
**Working title:** Chovanci / Situace: Chovanec

## Pitch

Absurdní česká party hra s 16 kartami Chovanců. Padne situace, každý zahraje kartu, **Soudce-bot** vyhlásí vítěze s vtipným verdiktem. Funguje solo i multiplayer (2–6 hráčů, každý na svém zařízení).

## Goals

- Chytlavá, rychlá hra (~5–8 min party / nekonečné solo)
- Humor z wordplay a artů je středobod, ne komplexní rules
- Mobil-first web, čeština
- Stejná herní smyčka solo i multi (Situace + bot soudce)

## Non-goals (MVP)

- Uživatelské účty, persistence progressu na serveru
- Lidský rozhodčí / hlasování hráčů
- Draft/duel podle číselných stats
- LLM generování verdiktů nebo situací
- Denní výzvy, push notifikace, monetizace
- Generování nových card artů

## Core Loop — Situace

1. Všem (nebo sólovému hráči) se ukáže **situace** (krátký absurdní scénář).
2. Hráč tajně zahraje **1 kartu** z ruky.
3. Po odevzdání: reveal karet.
4. **Soudce-bot** vybere vítěze + 1 českou hlášku.
5. Vítěz kola +1 bod (multi) / streak (solo).
6. Další kolo, dokud neskončí match.

**Soudce-bot je vždy** — v solo i multi, včetně 2 hráčů. Žádný rotující lidský rozhodčí.

## Modes

### Multiplayer (hlavní)

- **2–6 hráčů**, každý na vlastním zařízení
- Host vytvoří místnost → sdílí **kód** → ostatní se připojí
- Fixní **5 kol** (~5–8 min)
- Ruka: **4 karty** z balíčku 16; po zahrání doplnění (bez návratu zahraných do balíčku do vyčerpání / reshuffle když dojde)
- Všichni vždy hrají kartu (včetně 2P)
- Po 5. kole: žebříček + titul večera (např. podle vítězné karty / skóre)

### Solo

1. Mini-kvíz **3–5 otázek** → reveal startovní Chovanec
2. Nekonečné Situace vs Soudce-bot
3. Streak / high score (localStorage)
4. Sdílení výsledku (karta + hláška) — jednoduchý share sheet / image card

**Quiz mapping:** každá odpověď přičte váhu jednomu nebo více `CardTag`s. Po poslední otázce vyhraje karta s nejvyšším součtem (tie-break: preferovat méně častý tag, pak `id`). Startovní karta je zároveň první karta v ruce; zbytek ruky se dorovná náhodně z balíčku.

## Screens

| Screen | Purpose |
|--------|---------|
| Home | Solo / Vytvořit místnost / Připojit (kód) |
| Sbírka | Galerie 16 karet (náhled, flavor, stavy) |
| Solo kvíz | 3–5 otázek → startovní karta |
| Solo Situace | situace → volba karty → verdikt → streak |
| Solo výsledek | karta + hláška + share |
| Lobby | kód, seznam hráčů, host Start |
| Kolo | situace, tajná volba, waiting, reveal, verdikt |
| Finále | pořadí + titul |

## Data Model

### Card (16 fixed)

```ts
type Card = {
  id: string;           // e.g. "nevychovanec"
  name: string;         // "NEVYCHOVANEC"
  color: string;        // theme hex or token
  image: string;        // path to cropped art
  flavor: string;       // Czech flavor text
  stats: { icon: string; value: number }[]; // display only
  tags: CardTag[];      // used by judge
};

type CardTag =
  | "chaos"
  | "styl"
  | "preziti"
  | "romance"
  | "prace"
  | "konspirace"
  | "detsky"
  | "formal"
  | "spinavy"
  | "ukryt"
  | "nadseni"
  | "rytir"
  | "pes"
  | "pochybnost"
  | "zaklad";
```

Stats from the art (paw, brain, heart, …) are **flavor/UI only**, not direct numeric combat. Judging uses **tags**.

### Situation (~40 in MVP)

```ts
type Situation = {
  id: string;
  text: string;         // Czech prompt
  tags: CardTag[];      // affinities for judge
  mood?: "work" | "party" | "crisis" | "love" | "family" | "random";
};
```

Examples:

- „Pondělní stand-up a ty jsi nic nedělal.“
- „Rande, které už mělo skončit.“
- „Auto hlásí check engine uprostřed nicoty.“
- „Máma volá, že ‚jen na chvilku‘.“
- „Nový požadavek 17:55 v pátek.“

### Match state (multi)

```ts
type MatchState = {
  code: string;
  hostId: string;
  players: { id: string; name: string; score: number }[];
  round: number;          // 1..5
  phase: "lobby" | "pick" | "reveal" | "verdict" | "final";
  situationId: string | null;
  plays: Record<string, string>; // playerId -> cardId
  winnerId: string | null;
  verdictText: string | null;
  hands: Record<string, string[]>;
  deck: string[];
};
```

## Soudce-bot

**Algorithm (deterministic + light noise):**

1. For each played card, score = sum of overlapping tags with situation (weight 2) + soft affinity from card’s secondary tags (weight 1).
2. Add small deterministic noise from `hash(matchCode + round + cardId)` so repeats feel less identical, without true randomness fights.
3. Highest score wins; ties broken by noise, then card id.
4. Pick verdict line from a pool keyed by winning card’s primary tag / situation mood.

**No LLM in MVP.** Verdicts are prewritten Czech one-liners (~3–5 per tag/mood).

## Card Roster (source art)

Source sheet: `assets/chovanci-cards-source.jpg`

| id | name | suggested primary tags |
|----|------|------------------------|
| chovanec | CHOVANEC | zaklad |
| nevychovanec | NEVYCHOVANEC | chaos |
| odchovanec | ODCHOVANEC | detsky |
| vychovanec | VYCHOVANEC | formal |
| prechovanec | PŘECHOVANEC | konspirace |
| dochovanec | DOCHOVANEC | preziti |
| zhovanec | ZHOVANEC | styl |
| zchovanec | ZCHOVANEC | spinavy |
| nachovanec | NACHOVANEC | romance |
| podchovanec | PODCHOVANEC | ukryt |
| nadchovanec | NADCHOVANEC | nadseni |
| zachovanec | ZACHOVANEC | rytir |
| prezivanec | PŘEŽIVANEC | preziti |
| spoluochovanec | SPOLUOCHOVANEC | pes |
| pracovanec | PRACOVANEC | prace |
| pochybovanec | POCHYBOVANEC | pochybnost |

Flavor texts stay as on the source cards (Czech).

## Technical Shape

- **Stack:** mobil-first web app (Next.js App Router preferred for Vercel deploy)
- **Solo:** fully client-side; cards/situations as repo JSON; high score in `localStorage`
- **Multi:** room code + realtime sync of `MatchState` (host starts; all clients subscribe)
- **Assets:** crop individual cards from source sheet; serve as static images
- **i18n:** Czech only in MVP

Realtime implementation choice deferred to implementation plan (e.g. lightweight room server / PartyKit / similar). Requirement: low-latency phase sync for ≤6 players, ephemeral rooms (no accounts).

## MVP Acceptance Criteria

1. Solo: complete quiz → play ≥3 situation rounds vs bot → see streak and shareable result screen.
2. Multi: 2 players join via code, play 5 rounds, bot picks a winner each round, final ranking shows.
3. Multi: 3–6 players same flow; everyone submits a card every round.
4. All 16 cards visible in Sbírka with name, art, flavor.
5. Works on mobile browser viewport; Czech UI copy throughout.
6. No login required.

## Open Decisions (resolved)

| Topic | Decision |
|-------|----------|
| Core loop | Situace |
| Audience | Solo + multi |
| Multi joining | Room code, own devices |
| Judge | Bot everywhere |
| Match length | 5 rounds fixed |
| Player count | 2–6 |
| Solo entry | Quiz → starter card + endless situations |

## Follow-ups (post-MVP)

- Player voting / human judge mode
- Host-configurable round count
- Daily challenge + share streak
- More situation packs
- Optional LLM roast mode
