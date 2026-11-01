# Chovanci — Next.js web + match WebSocket server (ARM/AMD)
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_MATCH_WS_URL=wss://chovanec.propoj.app/ws
ENV NEXT_PUBLIC_MATCH_WS_URL=$NEXT_PUBLIC_MATCH_WS_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
RUN npx --yes esbuild@0.25.0 server/room-server.ts \
  --bundle \
  --platform=node \
  --format=cjs \
  --outfile=dist-server/room-server.cjs

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV MATCH_WS_PORT=3001
ENV MATCH_WS_PATH=/ws

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/dist-server/room-server.cjs ./dist-server/room-server.cjs
COPY --from=builder --chown=nextjs:nodejs /app/docker/entrypoint.sh /entrypoint.sh
USER nextjs
EXPOSE 3000 3001
CMD ["/entrypoint.sh"]
