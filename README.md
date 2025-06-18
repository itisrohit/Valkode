# Valkode 🚀

A lightweight, secure code execution engine built with **Bun**, **Hono**, and **TypeScript**. Execute JavaScript, TypeScript, Python, and Go code safely in an isolated sandbox environment.

## Features ✨

- 🔒 **Secure Sandbox Execution** - Code runs in isolated environment with security validations
- ⚡ **Fast Performance** - Built on Bun for maximum speed
- 🛡️ **Security First** - Blocks dangerous operations (file system access, process manipulation)
- 📝 **Multi-Language Support** - JavaScript, TypeScript, Python, and Go execution
- 🌐 **RESTful API** - Clean HTTP API with consistent JSON responses
- ⏱️ **Execution Timeout** - Configurable timeouts to prevent infinite loops
- 📊 **Execution Metrics** - Track execution time and performance
- 🧪 **Comprehensive Testing** - Full test suite with CI/CD pipeline

## Supported Languages 💻

- **JavaScript** (`javascript`, `js`)
- **TypeScript** (`typescript`, `ts`)  
- **Python** (`python`, `py`)
- **Go** (`go`)

## Quick Start 🏃‍♂️

### Prerequisites

- [Bun](https://bun.sh/) installed on your system
- Python 3.x for Python code execution
- Go for Go code execution

### Installation

```bash
git clone https://github.com/itisrohit/valkode.git
cd valkode
bun install
```

### Run the Server

```bash
bun run src/server.ts
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
    "languages": ["javascript", "js", "typescript", "ts", "python", "py", "go"]
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

### Execute Python
```bash
curl -X POST http://localhost:3000/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello Python!\"); print([x**2 for x in range(5)])",
    "language": "python"
  }'
```

### Execute Go
```bash
curl -X POST http://localhost:3000/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "package main\\nimport \\\"fmt\\\"\\nfunc main() {\\n    fmt.Println(\\\"Hello Go!\\\")\\n}",
    "language": "go"
  }'
```

### Security Testing
```bash
curl -X POST http://localhost:3000/api/v1/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const fs = require(\"fs\");",
    "language": "javascript"
  }'
```

## Security Features 🔐

Valkode blocks potentially dangerous operations across all languages:

**JavaScript/TypeScript:**
- ❌ File system access (`require("fs")`)
- ❌ Child process execution (`require("child_process")`)
- ❌ Operating system access (`require("os")`)
- ❌ Process manipulation (`process.*`)
- ❌ Dynamic code evaluation (`eval()`)
- ❌ Function constructor abuse (`Function()`)

**Python:**
- ❌ File system operations (`import os`)
- ❌ Subprocess execution (`import subprocess`)
- ❌ System operations (`import sys`)
- ❌ Dynamic imports (`__import__`)

**Go:**
- ❌ Network operations
- ❌ File system access
- ❌ System calls

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
tests/                # Test suite
├── api.test.ts       # API integration tests
└── sandbox.test.ts   # Engine unit tests
scripts/              # Development scripts
└── test-ci.sh        # CI simulation script
```

## Development 🛠️

### Tech Stack
- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: [Hono](https://hono.dev/)
- **Language**: TypeScript
- **Testing**: Bun test
- **Architecture**: Modular, type-safe

### Scripts
```bash
bun run src/server.ts     # Start development server
bun test                  # Run tests
```

### Testing
```bash
# Run all tests
bun test

# Run CI simulation
chmod +x scripts/test-ci.sh
./scripts/test-ci.sh

# Individual test files
bun test tests/api.test.ts
bun test tests/sandbox.test.ts
```

## CI/CD Pipeline 🔄

Automated testing with GitHub Actions:
- ✅ **Code Quality** - Linting and formatting
- ✅ **Unit Tests** - Engine and API tests
- ✅ **Integration Tests** - Full workflow testing
- ✅ **Security Scanning** - Dependency audits
- ✅ **Multi-language Support** - Python and Go installation


## Roadmap 🗺️

### Phase 2: Production Ready
- [ ] Isolated VM for JavaScript/TypeScript
- [ ] Rate limiting and authentication
- [ ] Docker containerization
- [ ] Performance optimization

### Phase 3: Enhanced Features
- [ ] WebSocket support for real-time execution
- [ ] Multi-file project support
- [ ] Package installation support
- [ ] Code collaboration features

### Phase 4: Language Expansion
- [ ] Rust support
- [ ] C/C++ support
- [ ] Java support
- [ ] Ruby support

## Contributing 🤝

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Ensure all tests pass (`bun test`)
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines
- Write TypeScript with strict typing
- Add tests for new features
- Follow the existing code structure
- Update documentation for API changes


## Acknowledgments 🙏

- Built with [Bun](https://bun.sh/) for blazing fast performance
- Powered by [Hono](https://hono.dev/) for lightweight web framework
- Inspired by online code execution platforms like Replit and CodePen
- Thanks to the open-source community for amazing tools and libraries

---

Made with ❤️ by [Rohit Kumar](https://github.com/itisrohit)

**⭐ Star this repo if you find it useful!**

## Badges 📛

![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)

[![CI/CD](https://github.com/itisrohit/valkode/actions/workflows/ci.yml/badge.svg)](https://github.com/itisrohit/valkode/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)