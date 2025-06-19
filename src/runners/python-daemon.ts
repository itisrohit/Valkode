import { BaseDaemonizedRunner } from "@/engine/base-runner";
import { ApiError } from "@/utils/apiHandler";

export class PythonDaemonRunner extends BaseDaemonizedRunner {
	language(): string {
		return "python";
	}

	createWorkerScript(): string {
		return `
import sys
import json
import io
import signal
import time
import traceback
import resource
import os

def set_limits(memory_mb=128):
    """Set resource limits for sandboxing"""
    try:
        # Memory limit (in bytes)
        resource.setrlimit(resource.RLIMIT_AS, (memory_mb * 1024 * 1024, memory_mb * 1024 * 1024))
        # CPU time limit (30 seconds max)
        resource.setrlimit(resource.RLIMIT_CPU, (30, 30))
        # File size limit (10MB)
        resource.setrlimit(resource.RLIMIT_FSIZE, (10 * 1024 * 1024, 10 * 1024 * 1024))
    except:
        pass  # Ignore if can't set limits

def execute_code(code, timeout=5, memory_mb=128):
    """Execute Python code with timeout and memory limits"""
    set_limits(memory_mb)
    
    # Capture stdout
    stdout_capture = io.StringIO()
    old_stdout = sys.stdout
    sys.stdout = stdout_capture
    
    start_time = time.time()
    
    try:
        # Create restricted globals (basic sandboxing)
        restricted_builtins = {
            'print': print,
            'len': len,
            'str': str,
            'int': int,
            'float': float,
            'bool': bool,
            'list': list,
            'dict': dict,
            'tuple': tuple,
            'set': set,
            'range': range,
            'enumerate': enumerate,
            'zip': zip,
            'map': map,
            'filter': filter,
            'sorted': sorted,
            'sum': sum,
            'min': min,
            'max': max,
            'abs': abs,
            'round': round,
            'pow': pow,
            'divmod': divmod,
            'isinstance': isinstance,
            'hasattr': hasattr,
            'getattr': getattr,
            'type': type,
            'dir': dir,
            'help': help,
            '__import__': __import__,  # Add this for import support
        }
        
        # Pre-import safe modules to avoid import restrictions
        import math
        import random
        import datetime
        import json as json_module
        import re
        import itertools
        import collections
        import functools
        
        # Safe imports - pre-imported modules
        safe_modules = {
            'math': math,
            'random': random,
            'datetime': datetime,
            'json': json_module,  # Use pre-imported json
            're': re,
            'itertools': itertools,
            'collections': collections,
            'functools': functools,
        }
        
        exec_globals = {
            '__builtins__': restricted_builtins,
            '__name__': '__main__',
            **safe_modules
        }
        
        # Execute with timeout using signal (Unix only)
        def timeout_handler(signum, frame):
            raise TimeoutError("Execution timed out")
        
        if hasattr(signal, 'SIGALRM'):
            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(timeout)
        
        try:
            exec(code, exec_globals)
        finally:
            if hasattr(signal, 'SIGALRM'):
                signal.alarm(0)  # Cancel alarm
        
        execution_time = time.time() - start_time
        output = stdout_capture.getvalue()
        
        return {
            "success": True,
            "output": output.strip() if output.strip() else "Code executed successfully (no output)",
            "executionTime": int(execution_time * 1000),
            "exitCode": 0
        }
        
    except TimeoutError:
        return {
            "success": False,
            "output": "",
            "error": "Execution timed out",
            "executionTime": int((time.time() - start_time) * 1000),
            "exitCode": 124
        }
    except MemoryError:
        return {
            "success": False,
            "output": "",
            "error": "Memory limit exceeded",
            "executionTime": int((time.time() - start_time) * 1000),
            "exitCode": 137
        }
    except Exception as e:
        error_traceback = traceback.format_exc()
        return {
            "success": False,
            "output": "",
            "error": f"{type(e).__name__}: {str(e)}",
            "traceback": error_traceback,
            "executionTime": int((time.time() - start_time) * 1000),
            "exitCode": 1
        }
    finally:
        sys.stdout = old_stdout

# Send ready signal immediately
ready_msg = {"type": "ready", "message": "Python daemon worker ready"}
print(json.dumps(ready_msg))
sys.stdout.flush()

# Main execution loop
while True:
    try:
        line = sys.stdin.readline()
        if not line:
            break
            
        line = line.strip()
        if not line:
            continue
            
        request = json.loads(line)
        
        if request["type"] == "execute":
            timeout_seconds = request["options"].get("timeout", 5000) // 1000  # Convert ms to seconds
            if timeout_seconds < 1:
                timeout_seconds = 1
                
            result = execute_code(
                request["code"],
                timeout_seconds,
                request["options"].get("memoryLimit", 128)
            )
            
            response = {
                "type": "result",
                "requestId": request["requestId"],
                **result
            }
            
            print(json.dumps(response))
            sys.stdout.flush()
            
    except KeyboardInterrupt:
        break
    except Exception as e:
        error_response = {
            "type": "result",
            "requestId": request.get("requestId", "unknown") if 'request' in locals() else "unknown",
            "success": False,
            "output": "",
            "error": f"Worker error: {str(e)}",
            "executionTime": 0,
            "exitCode": 1
        }
        print(json.dumps(error_response))
        sys.stdout.flush()
`;
	}

	getWorkerCommand(): { command: string; args: string[] } {
		return {
			command: "python3",
			args: ["-c", this.createWorkerScript()],
		};
	}

	validateCode(code: string): void {
		// Basic Python security validation
		const dangerousPatterns = [
			/import\s+os\b/,
			/import\s+subprocess\b/,
			/from\s+os\b/,
			/from\s+subprocess\b/,
			/__import__\s*\(/,
			/exec\s*\(/,
			/eval\s*\(/,
			/compile\s*\(/,
			/open\s*\(/,
			/file\s*\(/,
			/input\s*\(/,
			/raw_input\s*\(/,
		];

		for (const pattern of dangerousPatterns) {
			if (pattern.test(code)) {
				throw new ApiError(
					403,
					"Code contains potentially dangerous operations",
				);
			}
		}

		if (code.length > 50000) {
			throw new ApiError(413, "Code is too long (max 50KB)");
		}
	}

	parseWorkerResponse(data: string): {
		type?: "ready" | "result";
		requestId?: string;
		success?: boolean;
		output?: string;
		error?: string;
		exitCode?: number;
	} {
		return JSON.parse(data);
	}

	protected getWarmupCode(): string {
		return 'print("Python daemon warmed up")';
	}
}
