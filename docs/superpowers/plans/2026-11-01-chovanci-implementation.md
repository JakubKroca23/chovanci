# Chovanci Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobil-first Czech web game where players play Chovanec cards into absurd Situations and a bot judge picks the winner — solo (quiz + streak) and multiplayer (2–6, room code, 5 rounds).

**Architecture:** Next.js App Router client UI + shared pure TypeScript game logic (`src/lib/*`) + JSON content packs. Solo runs entirely in the browser. Multiplayer syncs ephemeral `MatchState` through a PartyKit room server so all phones stay on the same phase (lobby → pick → reveal → verdict → final).

**Tech Stack:** Next.js (App Router, TypeScript), React, Vitest, PartyKit (`partykit` + `partysocket`), static JSON content, card art cropped from `assets/chovanci-cards-source.jpg`.

## Global Constraints

- Czech UI copy only (MVP)
- Mobil-first; no login / accounts
- Soudce-bot judges every round (solo and multi, including 2 players)
- Multi: 2–6 players, room code, fixed 5 rounds, hand size 4
- Card `stats` are display-only; judging uses `tags`
- No LLM for verdicts or situations
- Spec source of truth: `docs/superpowers/specs/2026-11-01-chovanci-design.md`

## File Structure

```
chovanci/
  package.json
  next.config.ts
  partykit.json
  vitest.config.ts
  data/
    cards.json
    situations.json
    verdicts.json
    quiz.json
  public/cards/{id}.jpg          # cropped per-card art
  scripts/crop-cards.mjs         # grid crop from source sheet
  party/match.ts                 # PartyKit room: MatchState machine
  src/
    app/layout.tsx
    app/page.tsx                 # Home
    app/globals.css
    app/sbirka/page.tsx
    app/solo/page.tsx            # quiz → situations → result
    app/multi/page.tsx           # create/join entry
    app/multi/[code]/page.tsx   # lobby + round + final
    components/
      CardView.tsx
      HandPicker.tsx
      SituationBanner.tsx
      VerdictBanner.tsx
      ScoreBoard.tsx
    lib/
      types.ts
      cards.ts                   # loaders
      judge.ts
      deck.ts
      quiz.ts
      titles.ts                  # finale titles
      solo-storage.ts
  assets/chovanci-cards-source.jpg
```

---

### Task 1: Scaffold Next.js + Vitest + shared types

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/lib/types.ts`
- Test: `src/lib/types.test.ts` (smoke import of tag union via helper)

**Interfaces:**
- Produces: `Card`, `CardTag`, `Situation`, `MatchState`, `QuizQuestion`, `VerdictLine` in `src/lib/types.ts` matching the design spec

- [ ] **Step 1: Scaffold the app**

```bash
cd /home/jakub/chovanci
npx create-next-app@latest . --typescript --eslint --app --src-dir --tailwind --import-alias "@/*" --turbopack --yes
npm install -D vitest @vitejs/plugin-react jsdom
```

If create-next-app refuses non-empty dir, scaffold into a temp folder and move files, keeping existing `docs/`, `assets/`, `.git/`.

- [ ] **Step 2: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: { environment: "node" },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 3: Write `src/lib/types.ts`**

```ts
export type CardTag =
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

export type Card = {
  id: string;
  name: string;
  color: string;
  image: string;
  flavor: string;
  stats: { icon: string; value: number }[];
  tags: CardTag[];
};

export type Situation = {
  id: string;
  text: string;
  tags: CardTag[];
  mood?: "work" | "party" | "crisis" | "love" | "family" | "random";
};

export type VerdictLine = {
  id: string;
  tags: CardTag[];
  moods?: Situation["mood"][];
  text: string;
};

export type QuizAnswer = {
  label: string;
  weights: Partial<Record<CardTag, number>>;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  answers: QuizAnswer[];
};

export type MatchPhase = "lobby" | "pick" | "reveal" | "verdict" | "final";

export type MatchPlayer = {
  id: string;
  name: string;
  score: number;
};

export type MatchState = {
  code: string;
  hostId: string;
  players: MatchPlayer[];
  round: number;
  phase: MatchPhase;
  situationId: string | null;
  plays: Record<string, string>;
  winnerId: string | null;
  verdictText: string | null;
  hands: Record<string, string[]>;
  deck: string[];
  discard: string[];
};
```

- [ ] **Step 4: Smoke test + commit**

Create `src/lib/types.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { CardTag } from "./types";

describe("types", () => {
  it("allows known tags", () => {
    const tag: CardTag = "chaos";
    expect(tag).toBe("chaos");
  });
});
```

Run: `npm test`  
Expected: PASS

```bash
git add package.json package-lock.json tsconfig.json next.config.ts vitest.config.ts src docs/superpowers/plans
git commit -m "chore: scaffold Next.js app with shared game types"
```

---

### Task 2: Content packs (cards, situations, verdicts, quiz)

**Files:**
- Create: `data/cards.json`, `data/situations.json`, `data/verdicts.json`, `data/quiz.json`, `src/lib/cards.ts`
- Test: `src/lib/cards.test.ts`

**Interfaces:**
- Consumes: `Card`, `Situation`, `VerdictLine`, `QuizQuestion` from `src/lib/types.ts`
- Produces: `getCards()`, `getCard(id)`, `getSituations()`, `getSituation(id)`, `getVerdicts()`, `getQuiz()`

- [ ] **Step 1: Write failing loader test**

```ts
import { describe, it, expect } from "vitest";
import { getCards, getSituations, getVerdicts, getQuiz } from "./cards";

describe("content packs", () => {
  it("loads 16 unique cards with tags", () => {
    const cards = getCards();
    expect(cards).toHaveLength(16);
    expect(new Set(cards.map((c) => c.id)).size).toBe(16);
    for (const c of cards) {
      expect(c.tags.length).toBeGreaterThan(0);
      expect(c.image).toMatch(/^\/cards\//);
    }
  });

  it("loads at least 40 situations", () => {
    expect(getSituations().length).toBeGreaterThanOrEqual(40);
  });

  it("loads verdicts and a 3–5 question quiz", () => {
    expect(getVerdicts().length).toBeGreaterThanOrEqual(30);
    const quiz = getQuiz();
    expect(quiz.length).toBeGreaterThanOrEqual(3);
    expect(quiz.length).toBeLessThanOrEqual(5);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm test`  
Expected: FAIL (module/data missing)

- [ ] **Step 3: Author JSON packs**

`data/cards.json` — all 16 cards from the spec roster with Czech flavor from the source sheet, colors, 3 display stats each, `image: "/cards/{id}.jpg"`, and tags:

| id | tags (first = primary) |
|----|------------------------|
| chovanec | zaklad |
| nevychovanec | chaos |
| odchovanec | detsky |
| vychovanec | formal |
| prechovanec | konspirace |
| dochovanec | preziti |
| zhovanec | styl |
| zchovanec | spinavy |
| nachovanec | romance |
| podchovanec | ukryt |
| nadchovanec | nadseni |
| zachovanec | rytir |
| prezivanec | preziti |
| spoluochovanec | pes |
| pracovanec | prace |
| pochybovanec | pochybnost |

Secondary tags optional (max 3 total per card).

`data/situations.json` — ≥40 Czech prompts with 1–3 tags and mood.

`data/verdicts.json` — ≥30 one-liners, each with `tags` and optional `moods`.

`data/quiz.json` — exactly 4 questions, each with 3–4 answers that weight tags.

- [ ] **Step 4: Implement loaders in `src/lib/cards.ts`**

```ts
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
```

Enable JSON imports via `tsconfig` (`resolveJsonModule: true` — create-next-app usually sets this).

- [ ] **Step 5: Run tests + commit**

Run: `npm test`  
Expected: PASS

```bash
git add data src/lib/cards.ts src/lib/cards.test.ts
git commit -m "feat: add Chovanci content packs and loaders"
```

---

### Task 3: Judge engine

**Files:**
- Create: `src/lib/judge.ts`
- Test: `src/lib/judge.test.ts`

**Interfaces:**
- Consumes: `Card`, `Situation`, `VerdictLine`, `getCard`, `getVerdicts`
- Produces:
  - `scoreCard(card: Card, situation: Situation, seed: string): number`
  - `pickWinner(cardIds: string[], situation: Situation, seed: string): { winnerId: string; scores: Record<string, number> }`
  - `pickVerdict(winnerCardId: string, situation: Situation, seed: string): string`
  - `judgeRound(cardIds: string[], situation: Situation, seed: string): { winnerCardId: string; verdictText: string }`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { scoreCard, pickWinner, judgeRound } from "./judge";
import { getCard, getSituations } from "./cards";

describe("judge", () => {
  const situation = getSituations()[0];

  it("scores tag overlap higher than no overlap", () => {
    const tagged = {
      ...getCard("chovanec"),
      id: "a",
      tags: [...situation.tags],
    };
    const otherCard = {
      ...getCard("pochybovanec"),
      tags: ["pochybnost" as const],
    };
    expect(scoreCard(tagged, situation, "abc")).toBeGreaterThan(
      scoreCard(otherCard, situation, "abc"),
    );
  });

  it("is deterministic for the same seed", () => {
    const ids = ["nevychovanec", "vychovanec", "pracovanec"];
    const a = pickWinner(ids, situation, "room-1-round-1");
    const b = pickWinner(ids, situation, "room-1-round-1");
    expect(a.winnerId).toBe(b.winnerId);
  });

  it("judgeRound returns winner and czech verdict text", () => {
    const result = judgeRound(
      ["nachovanec", "pracovanec"],
      situation,
      "seed-x",
    );
    expect(result.winnerCardId).toBeTruthy();
    expect(result.verdictText.length).toBeGreaterThan(5);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/lib/judge.test.ts`  
Expected: FAIL (judge not found)

- [ ] **Step 3: Implement `src/lib/judge.ts`**

```ts
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
```

- [ ] **Step 4: Run tests + commit**

Run: `npx vitest run src/lib/judge.test.ts`  
Expected: PASS

```bash
git add src/lib/judge.ts src/lib/judge.test.ts
git commit -m "feat: add deterministic Soudce-bot judge"
```

---

### Task 4: Deck helpers + finale titles

**Files:**
- Create: `src/lib/deck.ts`, `src/lib/titles.ts`, `src/lib/solo-storage.ts`
- Test: `src/lib/deck.test.ts`, `src/lib/titles.test.ts`

**Interfaces:**
- Produces:
  - `shuffle<T>(items: T[], seed: string): T[]`
  - `dealHands(playerIds: string[], seed: string): { hands: Record<string, string[]>; deck: string[] }` (hand size 4)
  - `drawCard(hand: string[], deck: string[], discard: string[]): { hand: string[]; deck: string[]; discard: string[] }`
  - `playCard(hand: string[], cardId: string): string[]`
  - `pickSituationId(seed: string, usedIds: string[]): string`
  - `finaleTitle(winnerName: string, winningCardId: string): string`
  - `loadHighScore(): number` / `saveHighScore(n: number): void` (no-op safe if `window` missing in tests — gate on `typeof window`)

- [ ] **Step 1: Write failing deck tests**

```ts
import { describe, it, expect } from "vitest";
import { shuffle, dealHands, playCard, drawCard, pickSituationId } from "./deck";
import { getCards } from "./cards";

describe("deck", () => {
  it("shuffle is deterministic", () => {
    const ids = getCards().map((c) => c.id);
    expect(shuffle(ids, "s")).toEqual(shuffle(ids, "s"));
  });

  it("deals 4 cards per player without overlap", () => {
    const { hands, deck } = dealHands(["a", "b"], "room");
    expect(hands.a).toHaveLength(4);
    expect(hands.b).toHaveLength(4);
    expect(new Set([...hands.a, ...hands.b]).size).toBe(8);
    expect(deck.length).toBe(getCards().length - 8);
  });

  it("playCard removes one card; drawCard refills and reshuffles discard when deck empty", () => {
    let hand = ["chovanec", "zhovanec", "pracovanec", "nachovanec"];
    hand = playCard(hand, "chovanec");
    expect(hand).not.toContain("chovanec");
    const drawn = drawCard(hand, [], ["nevychovanec", "vychovanec"]);
    expect(drawn.hand).toHaveLength(hand.length + 1);
  });
});
```

- [ ] **Step 2: Implement `deck.ts` and `titles.ts`**

Use the same FNV-style `hashNoise` (extract to `src/lib/hash.ts` if duplicated — prefer extracting when implementing).

`dealHands`: shuffle all card ids with seed, deal 4 sequentially per player order.

`drawCard`: if deck empty, shuffle discard into deck and clear discard; then pop one onto hand.

`pickSituationId`: shuffle situation ids with seed, return first not in `usedIds`, or reshuffle all if exhausted.

`finaleTitle`: `return \`Největší ${getCard(winningCardId).name} večera: ${winnerName}\``.

- [ ] **Step 3: Tests + commit**

Run: `npx vitest run src/lib/deck.test.ts src/lib/titles.test.ts`  
Expected: PASS

```bash
git add src/lib/deck.ts src/lib/titles.ts src/lib/solo-storage.ts src/lib/hash.ts src/lib/*.test.ts
git commit -m "feat: add deck dealing and finale title helpers"
```

---

### Task 5: Quiz scoring

**Files:**
- Create: `src/lib/quiz.ts`
- Test: `src/lib/quiz.test.ts`

**Interfaces:**
- Consumes: `getQuiz`, `getCards`
- Produces: `scoreQuiz(answerIndexes: number[]): { cardId: string; weights: Record<string, number> }`

- [ ] **Step 1: Failing test**

```ts
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
```

- [ ] **Step 2: Implement**

```ts
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
```

- [ ] **Step 3: Tests + commit**

```bash
npx vitest run src/lib/quiz.test.ts
git add src/lib/quiz.ts src/lib/quiz.test.ts
git commit -m "feat: add solo quiz scoring"
```

---

### Task 6: Crop card art from source sheet

**Files:**
- Create: `scripts/crop-cards.mjs`, `public/cards/*.jpg`
- Modify: none of game logic

**Interfaces:**
- Produces: `/public/cards/{id}.jpg` for each of the 16 card ids (same order as 4×4 sheet, row-major matching the source collage)

- [ ] **Step 1: Install sharp and write crop script**

```bash
npm install -D sharp
```

`scripts/crop-cards.mjs` reads `assets/chovanci-cards-source.jpg`, splits into 4 columns × 4 rows, maps index → id list in this exact order:

```js
const IDS = [
  "chovanec", "nevychovanec", "odchovanec", "vychovanec",
  "prechovanec", "dochovanec", "zhovanec", "zchovanec",
  "nachovanec", "podchovanec", "nadchovanec", "zachovanec",
  "prezivanec", "spoluochovanec", "pracovanec", "pochybovanec",
];
```

Write JPEGs to `public/cards/{id}.jpg`. If sheet margins exist, tune crop insets once and document constants at top of script.

- [ ] **Step 2: Run script and verify 16 files**

```bash
node scripts/crop-cards.mjs
ls public/cards | wc -l
```

Expected: `16`

- [ ] **Step 3: Commit**

```bash
git add scripts/crop-cards.mjs public/cards package.json package-lock.json
git commit -m "feat: crop individual Chovanec card images"
```

---

### Task 7: Shared UI components + Home + Sbírka

**Files:**
- Create: `src/components/CardView.tsx`, `src/components/HandPicker.tsx`, `src/components/SituationBanner.tsx`, `src/components/VerdictBanner.tsx`, `src/components/ScoreBoard.tsx`
- Modify: `src/app/page.tsx`, `src/app/globals.css`, `src/app/layout.tsx`
- Create: `src/app/sbirka/page.tsx`

**Interfaces:**
- `CardView({ cardId, selected?, compact? })`
- `HandPicker({ cardIds, disabled?, onPick(cardId) })`
- `SituationBanner({ text })`
- `VerdictBanner({ text, winnerCardId })`
- `ScoreBoard({ players: { name, score }[] })`

- [ ] **Step 1: Implement components** using card loader + `next/image` (or `<img>` for simplicity). Czech labels only.

- [ ] **Step 2: Home page** with three actions:

```tsx
// links
// Solo → /solo
// Vytvořit místnost → /multi?mode=create
// Připojit se → /multi?mode=join
// Sbírka → /sbirka
```

Title: **Chovanci**. Subtitle: krátká věta o situacích a soudu.

- [ ] **Step 3: Sbírka page** lists all 16 `CardView`s with name + flavor.

- [ ] **Step 4: Manual check + commit**

Run: `npm run dev`  
Open `/` and `/sbirka` on a narrow viewport.  
Expected: readable Czech UI, all card images load.

```bash
git add src/app src/components
git commit -m "feat: add home, collection, and shared card UI"
```

---

### Task 8: Solo mode (quiz → situations → result)

**Files:**
- Create: `src/app/solo/page.tsx` (client component phases)
- Consumes: `scoreQuiz`, `judgeRound`, `deal`-like local hand helpers, `solo-storage`, content loaders

**Interfaces:**
- Local React state phases: `"quiz" | "reveal-card" | "play" | "verdict" | "result"`
- On play: player picks 1 of 4; bot also conceptually “present” as judge only (solo = one human card vs situation — score streak if player’s card wins against 2 random NPC cards drawn for pressure)

**Solo round rule (explicit):**  
Each round draws a situation. Player plays 1 card from hand of 4. Two NPC cards are drawn from remaining deck as rivals. `judgeRound([playerCard, npc1, npc2], situation, seed)` — if `winnerCardId === playerCard`, streak += 1 and continue; else streak resets and go to result. Always refill hand via `drawCard`. Persist `max(streak)` via `saveHighScore`.

- [ ] **Step 1: Implement solo page state machine** with Czech copy for questions, waiting, verdict, and result share button (`navigator.share` if available, else copy text to clipboard).

- [ ] **Step 2: Manual test**

Run: `npm run dev` → `/solo`  
Complete quiz, win/lose a few rounds, confirm high score updates after refresh.

- [ ] **Step 3: Commit**

```bash
git add src/app/solo
git commit -m "feat: add solo quiz and situation streak mode"
```

---

### Task 9: PartyKit match server

**Files:**
- Create: `party/match.ts`, `partykit.json`
- Modify: `package.json` (scripts `party:dev`, dependency `partykit`)
- Test: `party/match.test.ts` for pure transition helpers extracted to `src/lib/match-machine.ts`

**Interfaces:**
- Produces pure functions in `src/lib/match-machine.ts`:
  - `createLobby(code: string, hostId: string, hostName: string): MatchState`
  - `joinLobby(state, playerId, name): MatchState` (throw if >6 or duplicate)
  - `startMatch(state, seed): MatchState` (requires 2–6; deals hands; round=1; phase=`pick`; picks situation)
  - `submitPlay(state, playerId, cardId): MatchState` (when all played → `reveal` then auto `verdict` via judge, score++, if round==5 → `final` else prepare next pick)
  - `advanceAfterVerdict(state, seed): MatchState` (from verdict → next pick or no-op if final)

PartyKit room wires WebSocket messages:

```ts
type ClientMsg =
  | { type: "join"; playerId: string; name: string }
  | { type: "start" }
  | { type: "play"; cardId: string }
  | { type: "next" }; // host or any player acknowledges verdict → next round
```

Broadcast full `MatchState` after each transition. Seed = `${code}:${round}`.

- [ ] **Step 1: TDD match-machine transitions** in `src/lib/match-machine.test.ts` covering: join limits, start deals, all-play triggers verdict, 5th round goes final, bot winner gets +1 score.

- [ ] **Step 2: Implement machine + PartyKit room**

```bash
npm install partykit partysocket
```

`partykit.json`:

```json
{
  "name": "chovanci-match",
  "main": "party/match.ts"
}
```

- [ ] **Step 3: Run unit tests + commit**

```bash
npx vitest run src/lib/match-machine.test.ts
git add party partykit.json src/lib/match-machine.ts src/lib/match-machine.test.ts package.json package-lock.json
git commit -m "feat: add multiplayer match state machine and PartyKit room"
```

---

### Task 10: Multiplayer client (lobby → rounds → finale)

**Files:**
- Create: `src/app/multi/page.tsx`, `src/app/multi/[code]/page.tsx`, `src/lib/multi-client.ts`
- Reuse: `HandPicker`, `SituationBanner`, `VerdictBanner`, `ScoreBoard`, `CardView`

**Interfaces:**
- `connectToMatch(code: string): { send(msg), subscribe(cb) }` wrapping PartySocket
- Create flow: generate 4-char code (`A-Z` without ambiguous chars), navigate to `/multi/{code}?host=1&name=`
- Join flow: enter code + name → `/multi/{code}`

Room UI by `phase`:
- `lobby`: list players, host sees **Start** (enabled iff 2–6)
- `pick`: situation + hand; after submit show „Čekáme na ostatní…“
- `reveal`/`verdict`: all played cards face-up + verdict + scores; button **Další kolo**
- `final`: ranking + `finaleTitle` for leader

- [ ] **Step 1: Implement create/join entry page**

- [ ] **Step 2: Implement room page wired to PartySocket** (`PARTYKIT_HOST` from env; local default `localhost:1999`)

- [ ] **Step 3: Manual two-browser test**

Terminal A: `npx partykit dev`  
Terminal B: `npm run dev`  
Open two browsers, create room, join, play 5 rounds.

Expected: bot verdict each round; scores increment; finale shows.

- [ ] **Step 4: Commit**

```bash
git add src/app/multi src/lib/multi-client.ts
git commit -m "feat: add multiplayer lobby and situation rounds"
```

---

### Task 11: Polish — mobile CSS, empty states, README

**Files:**
- Modify: `src/app/globals.css`, key pages for spacing/touch targets
- Create: `README.md` (run solo, run multi, scripts)

- [ ] **Step 1: Fix mobile UX** — min 44px tap targets, no horizontal scroll, legible situation text, disabled states on double-submit.

- [ ] **Step 2: README** with:

```bash
npm install
npm run dev                 # web
npx partykit dev            # multiplayer rooms
npm test
node scripts/crop-cards.mjs
```

- [ ] **Step 3: Full acceptance pass vs spec**

Checklist:
1. Solo quiz → ≥3 rounds → streak/share
2. Multi 2P via code, 5 rounds, bot winners, finale
3. Multi 3P same
4. Sbírka shows 16 cards
5. Mobile viewport OK, Czech copy
6. No login

- [ ] **Step 4: Commit**

```bash
git add README.md src/app/globals.css
git commit -m "docs: add README and polish mobile UI"
```

---

## Spec coverage self-check

| Spec requirement | Task |
|------------------|------|
| Situace core loop | 3, 8, 9, 10 |
| Bot judge everywhere | 3, 8, 9 |
| Solo quiz + endless situations | 5, 8 |
| Multi room code 2–6, 5 rounds | 9, 10 |
| Hand 4 + refill | 4, 9 |
| Sbírka 16 cards | 2, 6, 7 |
| Czech mobil-first, no accounts | 7, 8, 10, 11 |
| Content tags/verdicts/situations | 2 |
| Finale title | 4, 10 |
| Share solo result | 8 |
| Source card art | 6 |

## Placeholder / consistency notes

- Judge seed format unified as `` `${code}:${round}` `` (solo uses `` `solo:${streak}:${situationId}` ``).
- Card ids identical across JSON, crop script, and spec table.
- `MatchState.discard` added vs original spec sketch so refill/reshuffle is implementable without ambiguity.
