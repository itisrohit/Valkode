import { PythonDaemonRunner } from "@/runners/python-daemon";
import { ApiError } from "@/utils/apiHandler";
import type { Runner } from "../types/runner-interface";

class RunnerRegistry {
	private runners: Map<string, Runner> = new Map();
	private initialized = false;

	async initialize(): Promise<void> {
		if (this.initialized) return;

		console.log("🚀 Initializing Universal Runner Registry...");

		try {
			console.log("🐍 Initializing Python daemon runner...");
			const pythonRunner = new PythonDaemonRunner();
			await pythonRunner.warmup();
			this.runners.set("python", pythonRunner);
			console.log("✅ Python runner ready");
		} catch (error) {
			console.error("❌ Failed to initialize Python runner:", error);
			// Continue with whatever runners we have
		}

		this.initialized = true;
		console.log(
			`🎉 Universal Runner Registry initialized with ${this.runners.size} languages!`,
		);
	}

	getRunner(language: string): Runner {
		const normalizedLang = this.normalizeLanguage(language);
		const runner = this.runners.get(normalizedLang);

		if (!runner) {
			throw new ApiError(
				400,
				`Language '${language}' is not supported. Available: ${this.getSupportedLanguages().join(", ")}`,
			);
		}

		if (!runner.isAvailable()) {
			throw new ApiError(503, `${language} runner is not available`);
		}

		return runner;
	}

	private normalizeLanguage(language: string): string {
		const lang = language.toLowerCase();

		// Language aliases
		const aliases: Record<string, string> = {
			py: "python",
		};

		return aliases[lang] || lang;
	}

	getSupportedLanguages(): string[] {
		return Array.from(this.runners.keys());
	}

	getAvailableLanguages(): string[] {
		return Array.from(this.runners.entries())
			.filter(([_, runner]) => runner.isAvailable())
			.map(([lang, _]) => lang);
	}

	getAllStats() {
		const stats: Record<string, unknown> = {};

		for (const [lang, runner] of this.runners.entries()) {
			try {
				stats[lang] = {
					language: runner.language(),
					available: runner.isAvailable(),
					metrics: runner.getMetrics(),
					// Fix: Use proper type assertion instead of intersection
					...(((
						runner as Runner & { getStats?: () => Record<string, unknown> }
					).getStats?.() as Record<string, unknown>) || {}),
				};
			} catch (error) {
				stats[lang] = {
					language: lang,
					available: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}

		return stats;
	}

	async shutdown(): Promise<void> {
		console.log("🔄 Shutting down Universal Runner Registry...");

		const shutdownPromises = Array.from(this.runners.values()).map((runner) =>
			runner.shutdown().catch(console.error),
		);

		await Promise.allSettled(shutdownPromises);
		this.runners.clear();
		this.initialized = false;

		console.log("✅ Universal Runner Registry shutdown complete");
	}
}

// Singleton instance
export const runnerRegistry = new RunnerRegistry();
