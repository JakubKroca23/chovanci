# ChovanecStone

Hearthstone-like souboj s Chovanci — 1v1 vs bot / kamarád, decky a generátor karet. Bez účtů.

## Run

```bash
npm install
npm run dev                 # web (http://localhost:3000)
npm test
```

Lokální multi: WebSocket server na `:3001` (v Dockeru běží automaticky).  
`NEXT_PUBLIC_MATCH_WS_URL=wss://…/ws` (HS klient mapuje `/ws` → `/hs`).

## Production (server-main)

Doména: https://chovanec.propoj.app  
Cesta: `/home/ubuntu/personal/projects/chovanci` (Traefik síť `personal`)

```bash
ssh -i ~/github/server_main.key ubuntu@92.5.8.24 \
  'cd /home/ubuntu/personal/projects/chovanci && git fetch origin && git checkout main \
   && git pull --ff-only origin main && docker compose up -d --build'
```

Volitelně `GEMINI_API_KEY` v prostředí kontejneru pro AI generátor (bez klíče běží fallback karty).

## Módy

- **Hrát vs bot** — `/play`
- **1v1** — `/multi` → `/duel/ABCD`
- **Decky / Sbírka / Generátor** — lokální uložení v prohlížeči

Legacy Situace (solo/multi party) zůstává v kódu, ale homepage vede na ChovanecStone.

## Stack

Next.js App Router, TypeScript, Tailwind CSS v4, Vitest, self-hosted `ws` match server.
