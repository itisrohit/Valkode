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
sleep 5

# Health check
echo "🏥 Testing health endpoint..."
if curl -s http://localhost:3000/api/v1/health > /dev/null; then
  echo "✅ Health check passed"
else
  echo "❌ Health check failed"
  kill $SERVER_PID
  exit 1
fi

# Test concurrent execution
echo "⚡ Testing concurrent execution..."
for i in {1..3}; do
  curl -X POST http://localhost:3000/api/v1/execute \
    -H "Content-Type: application/json" \
    -d "{\"code\": \"console.log('CI Test $i');\", \"language\": \"javascript\"}" &
done
wait

# Check process pool stats
echo "📊 Checking process pool stats..."
curl -s http://localhost:3000/api/v1/health | grep -q "totalWorkers" && echo "✅ Process pool working" || echo "❌ Process pool failed"

kill $SERVER_PID
echo "✅ CI simulation completed successfully!"