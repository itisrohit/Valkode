export interface ExecOptions {
	timeout: number;
	memoryLimit: number;
	workingDir?: string;
	env?: Record<string, string>;
	stdin?: string;
}

export interface ExecResult {
	success: boolean;
	output: string;
	error?: string;
	executionTime: number;
	memoryUsed?: number;
	exitCode?: number;
}

export interface RunnerMetrics {
	totalExecutions: number;
	averageExecutionTime: number;
	successRate: number;
	lastExecution: number;
	memoryUsage: number;
}

export interface Runner {
	run(code: string, options: ExecOptions): Promise<ExecResult>;
	language(): string;
	isAvailable(): boolean;
	getMetrics(): RunnerMetrics;
	warmup(): Promise<void>;
	shutdown(): Promise<void>;
}

export interface DaemonWorker {
	id: string;
	process: import("node:child_process").ChildProcess;
	busy: boolean;
	language: string;
	lastUsed: number;
	createdAt: number;
	totalExecutions: number;
	failureCount: number;
}

export interface PendingRequest {
	requestId: string;
	code: string;
	options: ExecOptions;
	resolve: (result: ExecResult) => void;
	reject: (error: Error) => void;
	timestamp: number;
}
