import type { SandboxConfig, ExecutionResult } from "@/types/execution";
import { ApiError } from "@/utils/apiHandler";

export class Sandbox {
  private config: SandboxConfig;

  constructor(config: SandboxConfig = { timeout: 5000, memoryLimit: 128 }) {
    this.config = config;
  }

  async execute(code: string, language: string): Promise<ExecutionResult> {
    const startTime = Date.now();

    this.validateCode(code);
    const output = await this.runInIsolation(code, language);

    return {
      success: true,
      output,
      executionTime: Date.now() - startTime,
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
          "Code contains potentially dangerous operations"
        );
      }
    }
  }

  private async runInIsolation(
    code: string,
    language: string
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

      default:
        throw new ApiError(400, `Language '${language}' is not supported`);
    }
  }

  private executeJavaScript(code: string): string {
    const originalConsole = console.log;
    let output = "";

    // Capture console.log output
    console.log = (...args) => {
      output += args.map((arg) => String(arg)).join(" ") + "\n";
    };

    // Execute the code in a function scope
    const fn = new Function(code);
    fn();

    // Restore original console.log
    console.log = originalConsole;

    return output.trim() || "Code executed successfully (no output)";
  }

  private executeTypeScript(code: string): string {
    // For now, treat TypeScript as JavaScript
    return this.executeJavaScript(code);
  }

  private executePython(code: string): string {
    throw new ApiError(501, "Python execution not implemented yet");
  }
}
