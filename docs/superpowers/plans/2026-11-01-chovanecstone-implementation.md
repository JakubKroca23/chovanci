# ChovanecStone Implementation Plan

> **For agentic workers:** Implement task-by-task. Checkboxes for tracking.

**Goal:** Replace Situace party loop with a Hearthstone-like 1v1 (bot + online) using Chovanci arts, plus moderated AI card generation.

**Architecture:** Pure battle engine in `src/lib/hs/`; Next.js pages for play/collection/decks/generator; server-authoritative WS for multi; `POST /api/generate-card` for AI proposals.

**Tech Stack:** Next.js, TypeScript, Vitest, existing WS Docker deploy, Gemini/OpenAI via env.

## Global Constraints

- Czech UI
- Server authority for multi matches
- Core 16 arts reused from `/public/cards`
- Deploy to chovanec.propoj.app

---

### Task 1: HS types + core card data + engine skeleton

**Files:** `src/lib/hs/types.ts`, `data/hs-cards.json`, `src/lib/hs/cards.ts`, `src/lib/hs/engine.ts`, tests

- Remap 16 Chovanci to minions
- Engine: createMatch, draw, playMinion, attack, endTurn, heroPower
- Tests for taunt, charge, lethal

### Task 2: Bot

**Files:** `src/lib/hs/bot.ts`

- Heuristic: play curve → attack taunts → face

### Task 3: Battle UI + home rewrite

**Files:** `src/app/page.tsx`, `src/app/play/page.tsx`, `src/app/play/battle.css`, components

- Vs bot playable end-to-end

### Task 4: Collection + deck builder

**Files:** `src/app/sbirka`, `src/app/decks`, localStorage decks

### Task 5: Multi 1v1 WS

**Files:** `server/hs-server.ts` or extend room-server, `src/lib/hs/multi-client.ts`

### Task 6: Card generator API + UI

**Files:** `src/app/api/generate-card/route.ts`, `src/app/generator/page.tsx`

### Task 7: Wire Docker env AI key, remove Situace from nav, deploy

---

Implement in order; keep game playable after Task 3.
