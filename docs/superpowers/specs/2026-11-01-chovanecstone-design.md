# ChovanecStone — Design Spec

**Date:** 2026-11-01  
**Status:** Approved — implement  
**Product:** Hearthstone-like 1v1 with Chovanci + moderated card generator

## Pitch

1v1 card battler (bot + online). Play Chovanec minions, spells, weapons, secrets. Build decks from core 16 + player-approved AI-generated cards. Live at chovanec.propoj.app.

## Core rules (HS-like)

- Hero 30 HP; mana crystals 1→10 each turn (overload not in v1)
- Deck 30 cards; max 2 copies (1 if rarity `legendary`)
- Hand size soft-cap 10; board max 7 minions
- Turn: draw → play cards → attacks → hero power (once) → end turn
- Combat: minion attacks minion or hero; Taunt must be attacked if present
- Keywords v1: `charge`, `taunt`, `divine_shield`, `windfury`, `stealth`, `battlecry`, `deathrattle`, `secret`
- Card types: `minion`, `spell`, `weapon`, `secret`
- Secrets: hidden to opponent until trigger (attacked, spell cast, minion played — typed triggers)
- Win: opponent hero ≤ 0 HP

## Heroes (pick before match)

| id | name | hero_power |
|----|------|------------|
| nevychovanec | Nevychovanec | Deal 1 to enemy hero (cost 2) |
| vychovanec | Vychovanec | Restore 2 to self (cost 2) |
| prezivanec | Přeživanec | Gain 2 armor (cost 2) |

## Modes

- **Vs bot** — same rules, heuristic AI
- **1v1 online** — room code / join link; server-authoritative WS engine
- **Sbírka** — all owned cards
- **Decky** — build/save up to 5 decks (localStorage + optional server later)
- **Generátor** — prompt → AI proposal → approve / edit / discard

## Card model

```ts
type HsCard = {
  id: string;
  name: string;
  type: "minion" | "spell" | "weapon" | "secret";
  cost: number;
  attack?: number;
  health?: number;
  text: string;
  keywords: string[];
  rarity: "common" | "rare" | "epic" | "legendary";
  tribe?: string;
  art: string;
  source: "core" | "generated";
  // effect DSL for engine
  effects?: Effect[];
  secretTrigger?: "on_attacked" | "on_spell" | "on_minion_played";
};
```

Core: remap existing 16 Chovanec arts into minions with balanced cost/atk/hp + one keyword/effect each. Expand pool with generated cards after approval.

## Generator

1. User prompt (Czech)
2. `POST /api/generate-card` with server-side AI key
3. Return validated HsCard JSON (+ art = random core art or placeholder)
4. UI: approve → append to `localStorage` collection `chovanci:generated-cards`
5. Approved cards usable in decks / matches (client sends card ids; server loads from core + sync payload for custom cards in match join)

## Tech

- Next.js App Router UI
- Pure TS battle engine `src/lib/hs/*` (testable)
- Bot uses engine
- WS room server extended / new `server/hs-server.ts` for 1v1
- Deploy Docker on server-main → chovanec.propoj.app
- Party Situace mode removed from primary nav (legacy routes optional)

## Out of scope v1

Ranked ladder, accounts required, spectator, full Blizzard card parity, marketplace.
