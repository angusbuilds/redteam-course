#!/bin/bash
# Serve the course. ES modules are blocked over file://, so it needs a real origin.
set -e

PORT="${PORT:-8901}"
ROOT="$(cd "$(dirname "$0")" && pwd)"
UNIT="${1:-}"

if curl -s -o /dev/null --max-time 1 "http://localhost:$PORT/" 2>/dev/null; then
  echo "already serving on $PORT"
else
  cd "$ROOT"
  python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
  echo "serving $ROOT on $PORT (pid $!)"
  # give the socket a moment before the browser races it
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    curl -s -o /dev/null --max-time 1 "http://localhost:$PORT/" 2>/dev/null && break
    sleep 0.2
  done
fi

open "http://localhost:$PORT/$UNIT/"
