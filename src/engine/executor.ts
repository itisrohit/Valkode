import type { ExecutionRequest, ExecutionResult } from "@/types/execution";
import { ApiError } from "@/utils/apiHandler";
import { Sandbox } from "./sandbox";

export class CodeExecutor {
	private sandbox: Sandbox;

	constructor() {
		this.sandbox = new Sandbox({
			timeout: 5000,
			memoryLimit: 128,
		});
	}

	async execute(request: ExecutionRequest): Promise<ExecutionResult> {
		if (!this.isLanguageSupported(request.language)) {
			throw new ApiError(
				400,
				`Language '${request.language}' is not supported`,
			);
		}

		const { code, language, timeout } = request;

		// Create sandbox with custom timeout if provided
		const sandbox = new Sandbox({
			timeout: timeout || 5000,
			memoryLimit: 128,
		});

		return await sandbox.execute(code, language);
	}

	getSupportedLanguages(): string[] {
		return ["javascript", "js", "typescript", "ts", "python", "py", "go"];
	}

	isLanguageSupported(language: string): boolean {
		return this.getSupportedLanguages().includes(language.toLowerCase());
	}
}
