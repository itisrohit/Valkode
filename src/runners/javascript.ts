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
		// For now, treat TypeScript same as JavaScript since isolated-vm can handle both
		return this.execute(code);
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
