export interface ExecutionRequest {
	code: string;
	language: string;
	timeout?: number;
}

export interface ExecutionResult {
	success: boolean;
	output: string;
	error?: string;
	executionTime: number;
}

export interface SandboxConfig {
	timeout: number;
	memoryLimit: number;
}
