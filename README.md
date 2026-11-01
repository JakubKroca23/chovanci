# Chovanci

Česká mobilní párty kartařská hra — situace, ruka Chovanců a verdikt soudu. Bez účtů.

Czech mobile party card game — situations, a hand of Chovanci, and a judge verdict. No accounts.

## Run / Spuštění

```bash
npm install
npm run dev                 # web (http://localhost:3000)
npx partykit dev            # multiplayer rooms (default host localhost:1999)
npm test
node scripts/crop-cards.mjs # crop source art into public/cards
```

Alternative PartyKit script: `npm run party:dev`.

For multiplayer in another terminal, start PartyKit before opening a room. Optional override:

```bash
NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999 npm run dev
```

## Modes

- **Solo** — short quiz → starter card → endless situations, streak + share
- **Multi** — create/join with a 4-letter room code, 2–6 players, 5 rounds, finale title
- **Sbírka** — all 16 cards

## Stack

Next.js App Router, TypeScript, Tailwind CSS v4, Vitest, PartyKit / PartySocket.
