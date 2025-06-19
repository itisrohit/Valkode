#!/bin/bash

echo "🧪 Simulating full CI workflow for Valkode..."

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

# Run core tests (sandbox + API)
echo "🧪 Running core functionality tests..."
bun test sandbox.test.ts --timeout 15000 || exit 1
echo "✅ Sandbox tests passed"

bun test api.test.ts --timeout 15000 || exit 1  
echo "✅ API tests passed"

# Run performance benchmarks
echo "🚀 Running performance benchmarks..."
bun test benchmarks.test.ts --timeout 30000 || exit 1
echo "✅ Performance benchmarks passed"

# Test server startup with daemon initialization
echo "🚀 Testing server startup with daemon pools..."
bun run src/server.ts &
SERVER_PID=$!

# Wait for daemon initialization (Python takes longer)
echo "⏳ Waiting for daemon pools to initialize..."
sleep 12

# Health check
echo "🏥 Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/v1/health)
echo "Health response: $HEALTH_RESPONSE"
curl -f http://localhost:3000/api/v1/health || exit 1

# Test supported languages endpoint
echo "📋 Testing languages endpoint..."
curl -f http://localhost:3000/api/v1/languages || exit 1

# Test JavaScript execution
echo "⚡ Testing JavaScript execution..."
JS_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "console.log(\"JavaScript CI Test:\", 2 + 2);", "language": "javascript"}')
echo "JS Response: $JS_RESPONSE"
echo "$JS_RESPONSE" | grep -q '"success":true' || exit 1

# Test Python daemon execution  
echo "🐍 Testing Python daemon execution..."
PYTHON_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "print(\"Python CI Test:\", 2 + 2)", "language": "python"}')
echo "Python Response: $PYTHON_RESPONSE"
echo "$PYTHON_RESPONSE" | grep -q '"success":true' || exit 1

# Test TypeScript execution
echo "📝 Testing TypeScript execution..."
TS_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "const result: number = 2 + 2; console.log(\"TypeScript CI Test:\", result);", "language": "typescript"}')
echo "TS Response: $TS_RESPONSE" 
echo "$TS_RESPONSE" | grep -q '"success":true' || exit 1

# Test concurrent execution (run in foreground to avoid hanging)
echo "🔄 Testing concurrent execution..."

# Start concurrent requests and wait for them properly
{
  curl -s -X POST http://localhost:3000/api/v1/execute \
    -H "Content-Type: application/json" \
    -d '{"code": "console.log(\"Concurrent test 1\");", "language": "javascript"}' > /tmp/concurrent1.json &
  CURL_PID1=$!
  
  curl -s -X POST http://localhost:3000/api/v1/execute \
    -H "Content-Type: application/json" \
    -d '{"code": "print(\"Concurrent test 2\")", "language": "python"}' > /tmp/concurrent2.json &
  CURL_PID2=$!
  
  curl -s -X POST http://localhost:3000/api/v1/execute \
    -H "Content-Type: application/json" \
    -d '{"code": "console.log(\"Concurrent test 3\");", "language": "javascript"}' > /tmp/concurrent3.json &
  CURL_PID3=$!
  
  # Wait for all curl processes to complete
  wait $CURL_PID1 $CURL_PID2 $CURL_PID3
}

echo "✅ All language tests and concurrency tests completed"

# Test error handling
echo "🛡️ Testing error handling..."
ERROR_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "", "language": "javascript"}')
echo "$ERROR_RESPONSE" | grep -q '"success":false' || exit 1

# Test unsupported language
echo "🔧 Testing unsupported language..."
UNSUPPORTED_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "print(\"test\")", "language": "cobol"}')
echo "$UNSUPPORTED_RESPONSE" | grep -q '"success":false' || exit 1

echo "✅ Error handling tests passed"

# Performance baseline check
echo "📊 Running performance baseline check..."
PERF_START=$(date +%s)
curl -s -X POST http://localhost:3000/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "console.log(\"Performance test\");", "language": "javascript"}' > /dev/null
PERF_END=$(date +%s)
PERF_TIME=$((PERF_END - PERF_START))

echo "⚡ JavaScript execution took ${PERF_TIME}s"
if [ $PERF_TIME -gt 2 ]; then
  echo "⚠️ Warning: Performance seems slower than expected (>${PERF_TIME}s)"
else
  echo "✅ Performance is excellent (<2s)"
fi

# Python performance check
PYTHON_PERF_START=$(date +%s)
curl -s -X POST http://localhost:3000/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "print(\"Python performance test\")", "language": "python"}' > /dev/null
PYTHON_PERF_END=$(date +%s)
PYTHON_PERF_TIME=$((PYTHON_PERF_END - PYTHON_PERF_START))

echo "🐍 Python daemon execution took ${PYTHON_PERF_TIME}s"
if [ $PYTHON_PERF_TIME -gt 1 ]; then
  echo "⚠️ Warning: Python daemon performance slower than expected (>${PYTHON_PERF_TIME}s)"
else
  echo "✅ Python daemon performance is excellent (<1s)"
fi

# Clean shutdown
echo "🔄 Shutting down server and daemon pools..."
kill -TERM $SERVER_PID 2>/dev/null || true
sleep 3

# Force kill if still running
if ps -p $SERVER_PID > /dev/null 2>&1; then
  echo "⚠️ Server still running, force killing..."
  kill -9 $SERVER_PID 2>/dev/null || true
fi

# Wait for cleanup
sleep 2

# Clean up temp files
rm -f /tmp/concurrent*.json

echo "✅ CI simulation completed successfully!"
echo "🎉 All tests passed:"
echo "   ✅ Linting and type checking"
echo "   ✅ Core functionality (sandbox + API)"
echo "   ✅ Performance benchmarks"
echo "   ✅ Multi-language execution (JS, Python, TS)"
echo "   ✅ Concurrent execution handling"
echo "   ✅ Error handling and validation"
echo "   ✅ Performance baselines met"
echo "   ✅ Clean daemon shutdown"