#!/bin/sh
set -eu
node /app/dist-server/room-server.cjs &
exec node /app/server.js
