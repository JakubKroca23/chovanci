# Chovanci

Česká mobilní párty kartařská hra — situace, ruka Chovanců a verdikt soudu. Bez účtů.

Czech mobile party card game — situations, a hand of Chovanci, and a judge verdict. No accounts.

## Run / Spuštění

```bash
npm install
npm run dev                 # web (http://localhost:3000)
npx partykit dev            # local multiplayer (localhost:1999)
npm test
node scripts/crop-cards.mjs # crop source art into public/cards
```

Local multi: start PartyKit in a second terminal (`npm run party:dev`).  
Production multi uses self-hosted WebSocket (`NEXT_PUBLIC_MATCH_WS_URL`).

## Production (server-main)

Doména: https://chovanec.propoj.app  
Cesta na serveru: `/home/ubuntu/personal/projects/chovanci` (síť Traefik `personal`)

```bash
ssh -i ~/github/server_main.key ubuntu@92.5.8.24 \
  'cd /home/ubuntu/personal/projects/chovanci && git fetch origin && git checkout main \
   && git pull --ff-only origin main && docker compose up -d --build'
```

Ověření:

```bash
curl -sI https://chovanec.propoj.app/
```

## Modes

- **Solo** — pack → quiz → starter card → situations, streak + share image
- **Multi** — room code + QR/join link, pack picker, 2–6 players, 5 rounds, share finale image
- **Sbírka** — all 16 cards

Situation packs: **Mix**, **Práce**, **Rodina**, **Pátek**.

### Multiplayer notes

Hand size scales with player count so a 16-card deck can deal unique cards:
**2–4 players → 4 cards**, **5 → 3**, **6 → 2**. After each round, hands refill to that size.

## Stack

Next.js App Router, TypeScript, Tailwind CSS v4, Vitest, PartyKit / PartySocket.
