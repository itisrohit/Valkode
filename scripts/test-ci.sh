#!/bin/bash

echo "🧪 Simulating full CI workflow..."

# Install main dependencies
echo "📦 Installing main dependencies..."
bun install || exit 1

# Install worker dependencies
echo "📦 Installing worker dependencies..."
cd scripts
npm install || exit 1
cd ..

# Run linting
echo "🔍 Running linting..."
bun run lint || exit 1

# Run type checking
echo "🏷️ Running type checking..."
bun run type-check || exit 1

# Run tests
echo "🧪 Running tests..."
bun test || exit 1

# Test server startup
echo "🚀 Testing server startup..."
bun run src/server.ts &
SERVER_PID=$!
sleep 8

# Health check
echo "🏥 Testing health endpoint..."
curl -f http://localhost:3000/api/v1/health || exit 1

# Simple execution test (no concurrency)
echo "⚡ Testing execution..."
curl -X POST http://localhost:3000/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "console.log(\"CI Test\");", "language": "javascript"}' \
  > /dev/null || exit 1

echo "✅ Execution test completed"

# Clean shutdown
echo "🔄 Shutting down server..."
kill -9 $SERVER_PID 2>/dev/null || true
sleep 2

echo "✅ CI simulation completed successfully!"