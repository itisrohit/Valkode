import { spawn } from "node:child_process";
import { JavaScriptRunner } from "@/runners/javascript";
import type { ExecutionResult, SandboxConfig } from "@/types/execution";
import { ApiError } from "@/utils/apiHandler";

export class Sandbox {
	private config: SandboxConfig;
	private jsRunner: JavaScriptRunner;

	constructor(config: SandboxConfig = { timeout: 5000, memoryLimit: 128 }) {
		this.config = config;
		this.jsRunner = new JavaScriptRunner({
			timeout: config.timeout,
			memoryLimit: config.memoryLimit,
		});
	}

	async execute(code: string, language: string): Promise<ExecutionResult> {
		const startTime = process.hrtime.bigint();

		this.validateCode(code, language);
		const output = await this.runInIsolation(code, language);

		const endTime = process.hrtime.bigint();
		const executionTime = Number(endTime - startTime) / 1000000;

		return {
			success: true,
			output,
			executionTime: Math.max(1, Math.round(executionTime)),
		};
	}

	private validateCode(code: string, language: string): void {
		if (!code || code.trim().length === 0) {
			throw new ApiError(400, "Code cannot be empty");
		}

		// Enhanced security checks for non-JS languages
		// Note: isolated-vm handles JS/TS security, so we only need basic validation there
		const dangerousPatterns = [
			// Python patterns
			/import\s+(os|sys|subprocess|shutil|glob|socket|urllib|requests|http)/,
			/from\s+(os|sys|subprocess|shutil|glob|socket|urllib|requests|http)/,
			/__import__\s*\(/,
			/exec\s*\(/,
			/eval\s*\(/,

			// Go patterns
			/import\s+["']os["']/,
			/import\s+["']net["']/,
			/import\s+["']syscall["']/,
			/import\s+["']os\/exec["']/,
		];

		// Only apply dangerous pattern checks to non-JavaScript languages
		const jsLanguages = ["javascript", "js", "typescript", "ts"];
		if (!jsLanguages.includes(language.toLowerCase())) {
			for (const pattern of dangerousPatterns) {
				if (pattern.test(code)) {
					throw new ApiError(
						403,
						"Code contains potentially dangerous operations",
					);
				}
			}
		}
	}

	private async runInIsolation(
		code: string,
		language: string,
	): Promise<string> {
		switch (language.toLowerCase()) {
			case "javascript":
			case "js":
				return this.jsRunner.execute(code);

			case "typescript":
			case "ts":
				return this.jsRunner.executeTypeScript(code);

			case "python":
			case "py":
				return this.executePython(code);

			case "go":
				return this.executeGo(code);

			default:
				throw new ApiError(400, `Language '${language}' is not supported`);
		}
	}

	private async executePython(code: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const python = spawn("python3", ["-c", code], {
				stdio: ["pipe", "pipe", "pipe"],
			});

			let output = "";
			let errorOutput = "";
			let isResolved = false;

			python.stdout.on("data", (data) => {
				output += data.toString();
			});

			python.stderr.on("data", (data) => {
				errorOutput += data.toString();
			});

			python.on("close", (code) => {
				if (isResolved) return;
				isResolved = true;

				if (code === 0) {
					resolve(output.trim() || "Code executed successfully (no output)");
				} else {
					reject(
						new ApiError(400, `Python execution error: ${errorOutput.trim()}`),
					);
				}
			});

			python.on("error", (error) => {
				if (isResolved) return;
				isResolved = true;

				if (error.message.includes("ENOENT")) {
					reject(new ApiError(500, "Python3 is not installed on this system"));
				} else {
					reject(
						new ApiError(500, `Python execution failed: ${error.message}`),
					);
				}
			});

			const timeoutId = setTimeout(() => {
				if (isResolved) return;
				isResolved = true;

				python.kill("SIGTERM");
				setTimeout(() => {
					if (!python.killed) {
						python.kill("SIGKILL");
					}
				}, 1000);

				reject(new ApiError(408, "Python execution timeout"));
			}, this.config.timeout);

			python.on("exit", () => {
				clearTimeout(timeoutId);
			});
		});
	}

	private async executeGo(code: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const goRun = spawn("go", ["run", "-"], {
				stdio: ["pipe", "pipe", "pipe"],
			});

			let output = "";
			let errorOutput = "";
			let isResolved = false;

			goRun.stdout.on("data", (data) => {
				output += data.toString();
			});

			goRun.stderr.on("data", (data) => {
				errorOutput += data.toString();
			});

			goRun.on("close", (code) => {
				if (isResolved) return;
				isResolved = true;

				if (code === 0) {
					resolve(output.trim() || "Code executed successfully (no output)");
				} else {
					reject(
						new ApiError(400, `Go execution error: ${errorOutput.trim()}`),
					);
				}
			});

			goRun.on("error", (error) => {
				if (isResolved) return;
				isResolved = true;

				if (error.message.includes("ENOENT")) {
					reject(new ApiError(500, "Go is not installed on this system"));
				} else {
					reject(new ApiError(500, `Go execution failed: ${error.message}`));
				}
			});

			goRun.stdin.write(code);
			goRun.stdin.end();

			const timeoutId = setTimeout(() => {
				if (isResolved) return;
				isResolved = true;

				goRun.kill("SIGTERM");
				setTimeout(() => {
					if (!goRun.killed) {
						goRun.kill("SIGKILL");
					}
				}, 1000);

				reject(new ApiError(408, "Go execution timeout"));
			}, this.config.timeout);

			goRun.on("exit", () => {
				clearTimeout(timeoutId);
			});
		});
	}
}
