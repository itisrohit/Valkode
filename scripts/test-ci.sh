#!/bin/bash

echo "🧪 Simulating CI workflow..."

# Basic checks
bun install || exit 1
bun test || exit 1

# Server test
bun run src/server.ts &
SERVER_PID=$!
sleep 3

if curl -s http://localhost:3000/api/v1/health > /dev/null; then
  echo "✅ CI simulation passed"
  kill $SERVER_PID
else
  echo "❌ CI simulation failed"
  kill $SERVER_PID
  exit 1
fi