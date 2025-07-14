# Valkode 🚀

> A **blazingly fast**, **security-focused** multi-language code execution engine built on a **next-generation hybrid architecture**.
>
> It leverages **Bun + Hono** for ultra-low-latency API performance while separating execution concerns for maximum efficiency and control.

---

## 🔥 Why Valkode?

* ⚡ **Sub-millisecond execution** – 1ms warm execution via optimized worker pools
* 🐍 **Python daemon architecture** – Persistent Python workers for lightning-fast execution
* 🔒 **V8-Level Isolation** – Sandbox JavaScript with zero access to Node.js internals
* 🧠 **Hybrid Engine** – Bun for APIs, Node.js for secure execution, Python daemons for speed
* 📈 **Infinite Scalability** – Smart queuing + auto-scaling workers (2-8 workers)
* 🛡️ **Enterprise-Ready** – Multi-layer sandboxing, validation, and fault tolerance
* ✅ **320+ req/sec** – Proven high-throughput performance under stress testing

---

## ⚙️ Performance Benchmarks

| Language       | Cold Start | Warm Execution | Throughput  | Security     |
| -------------- | ---------- | -------------- | ----------- | ------------ |
| **JavaScript** | 24-35ms    | **1ms**        | 1862 req/s  | V8 Isolation |
| **TypeScript** | 45ms       | **3-6ms**      | 213 req/s   | V8 Isolation |
| **Python**     | 12ms       | **1ms**        | 320 req/s   | Daemon Pool  |

*Benchmarks from stress testing with 20 concurrent requests*

---

## 🧱 Architecture Overview

```
┌──────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Bun + Hono   │────│ Process Pool      │────│ isolated-vm     │
│ (API Layer)  │    │ Auto-Scaling      │    │ V8 Sandbox      │
└──────────────┘    └──────────────────┘    └─────────────────┘
   ⚡ Ultra Fast        🔄 Smart Queuing       🔒 Perfect Isolation

┌──────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Universal    │────│ Python Daemon     │────│ Persistent      │
│ Runner       │    │ Pool              │    │ Workers         │
└──────────────┘    └──────────────────┘    └─────────────────┘
   🌐 Multi-lang       🐍 Lightning Fast      ⚡ Sub-ms execution
```

### 🧠 Smart Worker Management

* **JavaScript Pool**: 2–8 workers with dynamic scaling
* **Python Daemon Pool**: Persistent workers for zero cold starts
* Load-balanced request distribution with intelligent queuing
* Fault tolerance via auto-healing and graceful shutdowns
* Memory-efficient idle worker cleanup

---

## ✨ Core Features

* 🔒 **V8-Level Sandboxing** – Total isolation from `require`, `process`, `global`, etc.
* ⚡ **Sub-millisecond Performance** – Warm starts in 1ms for JS/Python
* 🐍 **Python Daemon Architecture** – Persistent workers eliminate cold starts
* 🛡️ **Layered Security** – V8, subprocess, and input validations
* 🌐 **RESTful API** – Minimal, production-ready endpoints
* ⏱️ **Smart Timeout Handling** – Queue-aware and configurable
* 📊 **Real-time Metrics** – Monitor worker states and performance
* 🧪 **Full Test Coverage** – 30 tests, 178 assertions, 100% pass rate
* 🔁 **Zero Downtime** – Graceful shutdowns and resilient queues
* 🚀 **Stress Tested** – 320+ req/sec with 100% success rate

---

## 🌍 Supported Languages

| Language   | Aliases            | Security        | Performance | Concurrency | Status   |
| ---------- | ------------------ | --------------- | ----------- | ----------- | -------- |
| JavaScript | `javascript`, `js` | 🔒 V8 Isolation | ⚡ 1ms       | 1862 req/s  | ✅ Stable |
| TypeScript | `typescript`, `ts` | 🔒 V8 Isolation | ⚡ 3-6ms     | 213 req/s   | ✅ Stable |
| Python     | `python`, `py`     | 🐍 Daemon Pool  | ⚡ 1ms       | 320 req/s   | ✅ Stable |

---

## 🚀 Quick Start

### 📦 Prerequisites

* [Bun](https://bun.sh/) v1.2+
* [Node.js](https://nodejs.org/) v20+ (required for `isolated-vm`)
* Python 3.11+ (for Python execution support)

### 🧑‍💻 Installation

```bash
git clone https://github.com/itisrohit/valkode.git
cd valkode
bun install

# Install worker dependencies
cd scripts && npm install && cd ..
```

### ▶️ Start the Server

```bash
bun run src/server.ts
```

You'll see:

```
🚀 Initializing JavaScript process pool with 2 workers...
🚀 Initializing python daemon pool with 2 workers...
✅ Process pool initialized with 2 workers
🔥 python pool warmed up
✅ Python runner ready
🚀 Valkode server listening on http://localhost:3000
```

---

## 📡 API Endpoints

### Health Check

```http
GET /api/v1/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "processPool": {
      "totalWorkers": 2,
      "busyWorkers": 0,
      "idleWorkers": 2,
      "pendingRequests": 0
    },
    "runners": {
      "python": {
        "available": true,
        "totalWorkers": 4,
        "successRate": 100
      }
    }
  }
}
```

### Supported Languages

```http
GET /api/v1/languages
```

**Response:**
```json
{
  "success": true,
  "data": {
    "languages": ["javascript", "js", "typescript", "ts", "python", "py"]
  }
}
```

### Execute Code

```http
POST /api/v1/execute
```

**Request:**

```json
{
  "code": "console.log('Hello World!');",
  "language": "javascript",
  "timeout": 5000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "output": "Hello World!",
    "executionTime": 1
  }
}
```

---

## 💻 Code Execution Examples

### JavaScript

```bash
curl -X POST http://localhost:3000/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "console.log(2 + 2);", "language": "javascript"}'
```

### TypeScript

```bash
curl -X POST http://localhost:3000/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "const msg: string = \"Hello\"; console.log(msg);", "language": "typescript"}'
```

### Python

```bash
curl -X POST http://localhost:3000/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "print(\"Hello from Python daemon!\")", "language": "python"}'
```

---

## 🔐 Security Overview

### JavaScript / TypeScript

* Complete V8 isolation using `isolated-vm`
* `require`, `process`, `global`, `eval` – all blocked
* No file system or network access
* Memory-limited execution contexts

### Python

* Persistent daemon workers with controlled environments
* Input validation and sanitization
* Isolated execution contexts per request
* Resource limiting and timeout controls

---

## 🧩 Configurable Settings

```ts
// JavaScript Process Pool
{
  minWorkers: 2,
  maxWorkers: 8,
  workerIdleTimeout: 30000,
  maxQueueSize: 100
}

// Python Daemon Pool  
{
  poolSize: 2,
  warmupEnabled: true,
  persistentWorkers: true
}
```

**Default timeout:** 5000ms  
**Memory limit:** 128MB per worker  
**Default port:** 3000  

---

## 📁 Project Structure

```
src/
├── api/            → REST endpoints (health, execute, languages)
├── engine/         → Core execution logic & sandbox
├── runners/        → Language-specific execution handlers
├── types/          → TypeScript type definitions
├── utils/          → Process pools & worker management
scripts/            → Isolated VM worker scripts
tests/              → Comprehensive test suite (30 tests)
├── sandbox.test.ts → Core functionality tests
├── api.test.ts     → API performance tests  
└── benchmarks.test.ts → Performance benchmarks
```

---

## 🧪 Testing & Monitoring

### Run Tests

```bash
# Run all tests
bun test

# Run CI simulation (full pipeline)
./scripts/test-ci.sh
```

**Test Coverage:**
- ✅ 30 tests passing
- ✅ 178 assertions
- ✅ Core functionality, API performance, benchmarks
- ✅ Stress testing (320+ req/sec throughput)
- ✅ Concurrent execution (20 simultaneous requests)

### Monitor Real-time Performance

```bash
# Monitor process pool status
watch -n 1 'curl -s http://localhost:3000/api/v1/health | jq .data.processPool'

# Monitor Python daemon status
watch -n 1 'curl -s http://localhost:3000/api/v1/health | jq .data.runners.python'
```

### Load Testing

```bash
# High-throughput testing
ab -n 1000 -c 20 -p post_data.json -T application/json \
   http://localhost:3000/api/v1/execute
```

---

## 🗺️ Roadmap

### ✅ Phase 2A (Complete)

* ✅ Process pool with auto-scaling (2-8 workers)
* ✅ V8 isolation + intelligent queuing
* ✅ Python daemon architecture for sub-ms execution
* ✅ Multi-language support (JS, TS, Python)
* ✅ Comprehensive testing suite (30 tests)
* ✅ Production-ready performance (320+ req/sec)

### 🚀 Phase 2B (In Progress)

* 🔄 Go language support
* 🔄 WebAssembly (WASM) integration
* 🔄 Enhanced monitoring & metrics

### 🦀 Phase 3

* Rust execution via WASM
* C/C++ support via WASM
* Advanced resource limiting

### 🌐 Phase 4

* WebSocket support for real-time execution
* Multi-file & package execution
* Redis-powered distributed worker pools
* Horizontal scaling capabilities

### 🎯 Phase 5

* Complete WASM ecosystem (Ruby, Java via GraalVM)
* Plugin architecture for custom languages
* Advanced security sandboxing
* Enterprise deployment tools

---

## 🤝 Contributing

```bash
git checkout -b feature/your-feature
bun test                    # Ensure all tests pass
./scripts/test-ci.sh       # Run full CI simulation
git commit -m "feat: add awesome feature"
git push origin feature/your-feature
```

**Contribution Guidelines:**
* 💯 Maintain test coverage (currently 30 tests, 178 assertions)
* 🧪 Security-first development
* 🧠 Smart worker pool behavior
* 📈 Performance regression testing
* 📚 Update documentation and benchmarks

---

## 🙏 Acknowledgments

* [Bun](https://bun.sh/) – Ultra-fast JavaScript runtime
* [isolated-vm](https://github.com/laverdet/isolated-vm) – V8 isolation
* [Hono](https://hono.dev/) – Fast web framework
* Open Source Security Community

---

> **Built with ❤️ by [Rohit Kumar](https://github.com/itisrohit)**
> 
> ⭐ **Star this repo** if you liked it!

---
