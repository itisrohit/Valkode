import { spawn } from "node:child_process";
import type { ExecutionResult, SandboxConfig } from "@/types/execution";
import { ApiError } from "@/utils/apiHandler";

export class Sandbox {
    private config: SandboxConfig;

    constructor(config: SandboxConfig = { timeout: 5000, memoryLimit: 128 }) {
        this.config = config;
    }

    async execute(code: string, language: string): Promise<ExecutionResult> {
        const startTime = process.hrtime.bigint(); // Use high-resolution time

        this.validateCode(code);
        const output = await this.runInIsolation(code, language);

        const endTime = process.hrtime.bigint();
        const executionTime = Number(endTime - startTime) / 1000000; // Convert nanoseconds to milliseconds

        return {
            success: true,
            output,
            executionTime: Math.max(1, Math.round(executionTime)), // Ensure minimum 1ms
        };
    }

    private validateCode(code: string): void {
        if (!code || code.trim().length === 0) {
            throw new ApiError(400, "Code cannot be empty");
        }

        // Basic security checks
        const dangerousPatterns = [
            /require\s*\(\s*['"]fs['"]\s*\)/,
            /require\s*\(\s*['"]child_process['"]\s*\)/,
            /require\s*\(\s*['"]os['"]\s*\)/,
            /process\./,
            /eval\s*\(/,
            /Function\s*\(/,
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(code)) {
                throw new ApiError(
                    403,
                    "Code contains potentially dangerous operations",
                );
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
                return this.executeJavaScript(code);

            case "typescript":
            case "ts":
                return this.executeTypeScript(code);

            case "python":
            case "py":
                return this.executePython(code);

            case "go":
                return this.executeGo(code);

            default:
                throw new ApiError(400, `Language '${language}' is not supported`);
        }
    }

    private executeJavaScript(code: string): string {
        const originalConsole = console.log;
        let output = "";

        try {
            // Capture console.log output
            console.log = (...args) => {
                output += `${args.map((arg) => String(arg)).join(" ")}\n`;
            };

            // Execute the code in a function scope
            const fn = new Function(code);
            fn();
        } finally {
            // Always restore original console.log
            console.log = originalConsole;
        }

        return output.trim() || "Code executed successfully (no output)";
    }

    private executeTypeScript(code: string): string {
        // For now, treat TypeScript as JavaScript
        return this.executeJavaScript(code);
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

            // Handle timeout
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

            // Clear timeout if process completes
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

            // Send the code to stdin
            goRun.stdin.write(code);
            goRun.stdin.end();

            // Handle timeout
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

            // Clear timeout if process completes
            goRun.on("exit", () => {
                clearTimeout(timeoutId);
            });
        });
    }
}
