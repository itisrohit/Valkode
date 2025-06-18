# Valkode 🚀

A lightweight, secure code execution engine built with **Bun**, **Hono**, and **TypeScript**. Execute JavaScript and TypeScript code safely in an isolated sandbox environment.

## Features ✨

- 🔒 **Secure Sandbox Execution** - Code runs in isolated environment with security validations
- ⚡ **Fast Performance** - Built on Bun for maximum speed
- 🛡️ **Security First** - Blocks dangerous operations (file system access, process manipulation)
- 📝 **TypeScript Support** - Full TypeScript support with type safety
- 🌐 **RESTful API** - Clean HTTP API with consistent JSON responses
- ⏱️ **Execution Timeout** - Configurable timeouts to prevent infinite loops
- 📊 **Execution Metrics** - Track execution time and performance

## Supported Languages 💻

- **JavaScript** (`javascript`, `js`)
- **TypeScript** (`typescript`, `ts`)
- *Python support coming soon*

## Quick Start 🏃‍♂️

### Prerequisites

- [Bun](https://bun.sh/) installed on your system

### Installation

```bash
git clone https://github.com/itisrohit/valkode.git
cd valkode
bun install
```

### Run the Server

```bash
bun run index.ts
```

Server will start on `http://localhost:3000`

## API Endpoints 📡

### Health Check
```http
GET /api/v1/health
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Service is healthy",
  "data": {
    "status": "ok",
    "timestamp": "2025-06-18T12:40:44.934Z",
    "uptime": 123.45,
    "service": "valkode-executor"
  }
}
```

### Get Supported Languages
```http
GET /api/v1/languages
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Supported languages retrieved",
  "data": {
    "languages": ["javascript", "js", "typescript", "ts"]
  }
}
```

### Execute Code
```http
POST /api/v1/execute
```

**Request Body:**
```json
{
  "code": "console.log('Hello World!'); console.log(2 + 2);",
  "language": "javascript",
  "timeout": 5000
}
```

**Success Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Code executed successfully",
  "data": {
    "success": true,
    "output": "Hello World!\n4",
    "executionTime": 1
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Code cannot be empty",
  "errors": [],
  "timestamp": "2025-06-18T12:40:52.668Z"
}
```

## Usage Examples 📚

### Execute JavaScript
```bash
curl -X POST http://localhost:3000/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const arr = [1, 2, 3]; console.log(arr.map(x => x * 2));",
    "language": "javascript"
  }'
```

### Execute TypeScript
```bash
curl -X POST http://localhost:3000/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const message: string = \"Hello TypeScript!\"; console.log(message);",
    "language": "typescript"
  }'
```

### Error Handling
```bash
curl -X POST http://localhost:3000/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const fs = require(\"fs\");",
    "language": "javascript"
  }'
```

## Security Features 🔐

Valkode blocks potentially dangerous operations:

- ❌ File system access (`require("fs")`)
- ❌ Child process execution (`require("child_process")`)
- ❌ Operating system access (`require("os")`)
- ❌ Process manipulation (`process.*`)
- ❌ Dynamic code evaluation (`eval()`)
- ❌ Function constructor abuse (`Function()`)

## Configuration ⚙️

### Default Settings
- **Timeout**: 5000ms (5 seconds)
- **Memory Limit**: 128MB
- **Port**: 3000

### Environment Variables
```bash
PORT=3000                    # Server port
```

## Project Structure 📁

```
src/
├── api/              # API route handlers
│   ├── execute.ts    # Code execution endpoints
│   └── health.ts     # Health check endpoints
├── engine/           # Core execution engine
│   ├── sandbox.ts    # Sandbox environment
│   └── executor.ts   # Code executor
├── types/            # TypeScript type definitions
│   └── execution.ts  # Execution-related types
├── utils/            # Utility functions
│   └── apiHandler.ts # API response/error handling
├── app.ts            # Hono app configuration
└── server.ts         # Server setup
```

## Development 🛠️

### Tech Stack
- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: [Hono](https://hono.dev/)
- **Language**: TypeScript
- **Architecture**: Modular, type-safe

### Scripts
```bash
bun run index.ts          # Start development server
bun test                  # Run tests (coming soon)
bun run build             # Build for production (coming soon)
```

## Roadmap 🗺️

- [ ] Python execution support
- [ ] Docker containerization
- [ ] Rate limiting
- [ ] Authentication & authorization
- [ ] WebSocket support for real-time execution
- [ ] Code compilation caching
- [ ] Multi-file project support
- [ ] Package installation support

## Contributing 🤝

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


## Acknowledgments 🙏

- Built with [Bun](https://bun.sh/) for blazing fast performance
- Powered by [Hono](https://hono.dev/) for lightweight web framework
- Inspired by online code execution platforms

---


**⭐ Star this repo if you find it useful!**