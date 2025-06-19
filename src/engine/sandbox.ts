import { JavaScriptRunner } from "@/runners/javascript";
import { PythonDaemonRunner } from "@/runners/python-daemon";
import type { ExecutionResult, SandboxConfig } from "@/types/execution";
import { ApiError } from "@/utils/apiHandler";

export class Sandbox {
	private config: SandboxConfig;
	private jsRunner: JavaScriptRunner;
	private pythonRunner: PythonDaemonRunner;

	constructor(config: SandboxConfig = { timeout: 5000, memoryLimit: 128 }) {
		this.config = config;
		this.jsRunner = new JavaScriptRunner({
			timeout: config.timeout,
			memoryLimit: config.memoryLimit,
		});
		this.pythonRunner = new PythonDaemonRunner();
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

	private validateCode(code: string, _language: string): void {
		if (!code || code.trim().length === 0) {
			throw new ApiError(400, "Code cannot be empty");
		}
	}

	private async runInIsolation(
		code: string,
		language: string,
	): Promise<string> {
		const options = {
			timeout: this.config.timeout,
			memoryLimit: this.config.memoryLimit,
		};

		switch (language.toLowerCase()) {
			case "javascript":
			case "js":
				return this.jsRunner.execute(code);

			case "typescript":
			case "ts":
				return this.jsRunner.executeTypeScript(code);

			case "python":
			case "py": {
				const pythonResult = await this.pythonRunner.run(code, options);
				return pythonResult.output;
			}

			default:
				throw new ApiError(
					400,
					`Language '${language}' is not supported. Supported: javascript, typescript, python`,
				);
		}
	}

	// Get stats from all runners
	getStats() {
		return {
			javascript: JavaScriptRunner.getPoolStats(),
			python: this.pythonRunner.getStats(),
		};
	}

	// Shutdown all runners
	async shutdown(): Promise<void> {
		await Promise.all([
			JavaScriptRunner.shutdownPool(),
			this.pythonRunner.shutdown(),
		]);
	}
}
