import * as typescript from "typescript"; // Import TypeScript properly
import { ApiError } from "@/utils/apiHandler";
import { JavaScriptProcessPool } from "@/utils/process-pool";

export interface JavaScriptRunnerConfig {
	timeout: number;
	memoryLimit: number;
}

export class JavaScriptRunner {
	private config: JavaScriptRunnerConfig;
	private static pool: JavaScriptProcessPool | null = null;

	constructor(
		config: JavaScriptRunnerConfig = { timeout: 5000, memoryLimit: 128 },
	) {
		this.config = config;

		// Initialize pool on first use (singleton pattern)
		if (!JavaScriptRunner.pool) {
			JavaScriptRunner.pool = new JavaScriptProcessPool({
				minWorkers: 2,
				maxWorkers: 8,
				workerIdleTimeout: 30000,
			});
		}
	}

	async execute(code: string): Promise<string> {
		if (!JavaScriptRunner.pool) {
			throw new ApiError(500, "JavaScript process pool not initialized");
		}

		try {
			const startTime = Date.now();
			const result = await JavaScriptRunner.pool.execute(
				code,
				this.config.timeout,
				this.config.memoryLimit,
			);

			const executionTime = Date.now() - startTime;
			console.log(`⚡ Pool execution completed in ${executionTime}ms`);

			return result;
		} catch (error) {
			if (error instanceof ApiError) {
				throw error;
			}
			throw new ApiError(
				500,
				`JavaScript execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	async executeTypeScript(code: string): Promise<string> {
		try {
			// TypeScript compiler options - more permissive for playground use
			const compilerOptions: typescript.CompilerOptions = {
				target: typescript.ScriptTarget.ES2020,
				module: typescript.ModuleKind.CommonJS,
				strict: false,
				esModuleInterop: true,
				allowSyntheticDefaultImports: true,
				skipLibCheck: true,
				noEmitOnError: false,
				suppressImplicitAnyIndexErrors: true,
				noImplicitAny: false,
				lib: ["ES2020", "DOM"],
				downlevelIteration: true,
				allowJs: true,
			};

			// Compile TypeScript to JavaScript
			const result = typescript.transpileModule(code, {
				compilerOptions,
				reportDiagnostics: false,
			});

			// Check if compilation produced any output
			if (!result.outputText || result.outputText.trim() === "") {
				throw new ApiError(400, "TypeScript compilation produced no output");
			}

			console.log(
				`📝 TypeScript compiled to: ${result.outputText.substring(0, 100)}...`,
			);

			// Execute the compiled JavaScript
			return this.execute(result.outputText);
		} catch (error) {
			if (error instanceof ApiError) {
				throw error;
			}
			if (error instanceof Error) {
				throw new ApiError(
					400,
					`TypeScript compilation error: ${error.message}`,
				);
			}
			throw new ApiError(500, "TypeScript compilation failed");
		}
	}

	static async shutdownPool(): Promise<void> {
		if (JavaScriptRunner.pool) {
			await JavaScriptRunner.pool.shutdown();
			JavaScriptRunner.pool = null;
		}
	}

	static getPoolStats() {
		if (!JavaScriptRunner.pool) {
			return null;
		}
		return JavaScriptRunner.pool.getStats();
	}
}
