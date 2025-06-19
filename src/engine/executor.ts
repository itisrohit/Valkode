import type { ExecutionRequest, ExecutionResult } from "@/types/execution";
import { runnerRegistry } from "./runner-registry";

export class CodeExecutor {
	private initialized = false;

	async initialize(): Promise<void> {
		if (this.initialized) return;

		await runnerRegistry.initialize();
		this.initialized = true;
	}

	async execute(request: ExecutionRequest): Promise<ExecutionResult> {
		if (!this.initialized) {
			await this.initialize();
		}

		const { code, language, timeout = 5000 } = request;

		// Get the appropriate runner for this language
		const runner = runnerRegistry.getRunner(language);

		// Execute with the runner
		const result = await runner.run(code, {
			timeout,
			memoryLimit: 128,
		});

		return {
			success: result.success,
			output: result.output,
			error: result.error,
			executionTime: result.executionTime,
		};
	}

	getSupportedLanguages(): string[] {
		return runnerRegistry.getSupportedLanguages();
	}

	getAvailableLanguages(): string[] {
		return runnerRegistry.getAvailableLanguages();
	}

	isLanguageSupported(language: string): boolean {
		return this.getSupportedLanguages().includes(language.toLowerCase());
	}

	getStats() {
		return runnerRegistry.getAllStats();
	}

	async shutdown(): Promise<void> {
		await runnerRegistry.shutdown();
		this.initialized = false;
	}
}
