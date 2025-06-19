import { type ChildProcess, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { ApiError } from "@/utils/apiHandler";
import type {
	DaemonWorker,
	ExecOptions,
	ExecResult,
	PendingRequest,
	Runner,
	RunnerMetrics,
} from "./runner-interface";

export abstract class BaseDaemonizedRunner
	extends EventEmitter
	implements Runner
{
	protected workers: Map<string, DaemonWorker> = new Map();
	protected pendingRequests: Map<string, PendingRequest> = new Map();
	protected requestQueue: PendingRequest[] = [];

	protected readonly minWorkers: number = 2;
	protected readonly maxWorkers: number = 8;
	protected readonly maxQueueSize: number = 100;
	protected readonly workerIdleTimeout: number = 300000; // 5 minutes

	protected metrics: RunnerMetrics = {
		totalExecutions: 0,
		averageExecutionTime: 0,
		successRate: 100,
		lastExecution: 0,
		memoryUsage: 0,
	};

	private initialized = false;
	private executionTimes: number[] = [];
	private successCount = 0;

	constructor() {
		super();
		this.initialize();
	}

	// Abstract methods that each language runner must implement
	abstract language(): string;
	abstract createWorkerScript(): string;
	abstract getWorkerCommand(): { command: string; args: string[] };
	abstract validateCode(code: string): void;
	abstract parseWorkerResponse(data: string): {
		type?: "ready" | "result";
		requestId?: string;
		success?: boolean;
		output?: string;
		error?: string;
		exitCode?: number;
	};

	async initialize(): Promise<void> {
		if (this.initialized) return;

		console.log(
			`🚀 Initializing ${this.language()} daemon pool with ${this.minWorkers} workers...`,
		);

		const initPromises = [];
		for (let i = 0; i < this.minWorkers; i++) {
			initPromises.push(this.createWorker());
		}

		try {
			await Promise.all(initPromises);
			this.initialized = true;
			console.log(
				`⚡ ${this.language()} daemon pool ready with ${this.workers.size} workers!`,
			);
		} catch (error) {
			console.error(`Failed to initialize ${this.language()} pool:`, error);
			throw error;
		}
	}

	private async createWorker(): Promise<DaemonWorker> {
		const workerId = `${this.language()}-worker-${Date.now()}-${Math.random().toString(36).slice(2)}`;

		const { command, args } = this.getWorkerCommand();
		// Fix: Rename 'process' to 'childProcess' to avoid naming conflict
		const childProcess: ChildProcess = spawn(command, args, {
			stdio: ["pipe", "pipe", "pipe"],
			env: { ...process.env, NODE_ENV: "production" },
		});

		const worker: DaemonWorker = {
			id: workerId,
			process: childProcess,
			busy: false,
			language: this.language(),
			lastUsed: Date.now(),
			createdAt: Date.now(),
			totalExecutions: 0,
			failureCount: 0,
		};

		// Set up worker communication with proper types
		let buffer = "";
		childProcess.stdout?.on("data", (data: Buffer) => {
			buffer += data.toString();
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			for (const line of lines) {
				if (line.trim()) {
					this.handleWorkerMessage(worker, line.trim());
				}
			}
		});

		childProcess.stderr?.on("data", (data: Buffer) => {
			console.error(`${workerId} stderr:`, data.toString());
		});

		childProcess.on(
			"exit",
			(code: number | null, signal: NodeJS.Signals | null) => {
				console.log(`${workerId} exited with code ${code}, signal ${signal}`);
				this.workers.delete(workerId);

				// Auto-replace failed workers
				if (this.workers.size < this.minWorkers) {
					setTimeout(() => this.createWorker(), 1000);
				}
			},
		);

		childProcess.on("error", (error: Error) => {
			console.error(`${workerId} error:`, error);
			this.workers.delete(workerId);
		});

		// Wait for worker to be ready
		await this.waitForWorkerReady(worker);

		this.workers.set(workerId, worker);
		console.log(
			`⚡ Created ${this.language()} worker ${workerId} (total: ${this.workers.size})`,
		);

		return worker;
	}

	private async waitForWorkerReady(worker: DaemonWorker): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error(`${this.language()} worker startup timeout (30s)`));
			}, 30000); // Increase timeout to 30 seconds

			const onData = (data: Buffer) => {
				const output = data.toString();
				// Look for any "ready" message in JSON format
				if (output.includes('"type":"ready"') || output.includes("ready")) {
					clearTimeout(timeout);
					worker.process.stdout?.off("data", onData);
					console.log(`Worker ${worker.id} started and ready for requests`);
					resolve();
				}
			};

			worker.process.stdout?.on("data", onData);

			// Also handle stderr for debugging
			worker.process.stderr?.on("data", (data: Buffer) => {
				const message = data.toString().trim();
				if (message && !message.includes("ResourceWarning")) {
					// Filter out Python warnings
					console.log(`${worker.id} stderr:`, message);
				}
			});
		});
	}

	private handleWorkerMessage(worker: DaemonWorker, message: string): void {
		try {
			const response = this.parseWorkerResponse(message);

			if (response.type === "ready") {
				return; // Worker ready signal
			}

			if (response.type === "result" && response.requestId) {
				this.handleExecutionResult(worker, response);
			}
		} catch (_error) {
			console.warn(
				`Failed to parse ${this.language()} worker message:`,
				message,
			);
		}
	}

	private handleExecutionResult(
		worker: DaemonWorker,
		response: {
			type?: "ready" | "result";
			requestId?: string;
			success?: boolean;
			output?: string;
			error?: string;
			exitCode?: number;
		},
	): void {
		if (!response.requestId) {
			console.warn("Response missing requestId");
			return;
		}

		const pending = this.pendingRequests.get(response.requestId);
		if (!pending) {
			console.warn(`Unknown request ID: ${response.requestId}`);
			return;
		}

		this.pendingRequests.delete(response.requestId);
		worker.busy = false;
		worker.lastUsed = Date.now();
		worker.totalExecutions++;

		// Update metrics
		const executionTime = Date.now() - pending.timestamp;
		this.updateMetrics(executionTime, response.success ?? false);

		// Process queue
		this.processQueue();

		// Resolve request
		if (response.success) {
			pending.resolve({
				success: true,
				output: response.output || "",
				executionTime,
				exitCode: response.exitCode || 0,
			});
		} else {
			worker.failureCount++;
			pending.reject(new ApiError(400, response.error || "Execution failed"));
		}
	}

	private updateMetrics(executionTime: number, success: boolean): void {
		this.metrics.totalExecutions++;
		this.metrics.lastExecution = Date.now();

		this.executionTimes.push(executionTime);
		if (this.executionTimes.length > 100) {
			this.executionTimes.shift(); // Keep last 100 measurements
		}

		this.metrics.averageExecutionTime =
			this.executionTimes.reduce((a, b) => a + b, 0) /
			this.executionTimes.length;

		if (success) {
			this.successCount++;
		}

		this.metrics.successRate =
			(this.successCount / this.metrics.totalExecutions) * 100;
	}

	async run(code: string, options: ExecOptions): Promise<ExecResult> {
		const startTime = Date.now();

		// Validate code using language-specific rules
		this.validateCode(code);

		const requestId = `${this.language()}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

		return new Promise<ExecResult>((resolve, reject) => {
			const request: PendingRequest = {
				requestId,
				code,
				options,
				resolve,
				reject,
				timestamp: startTime,
			};

			const worker = this.getAvailableWorker();

			if (worker) {
				this.executeOnWorker(worker, request);
			} else {
				if (this.requestQueue.length >= this.maxQueueSize) {
					reject(
						new ApiError(503, `${this.language()} execution queue is full`),
					);
					return;
				}

				this.requestQueue.push(request);
				console.log(
					`📝 Queued ${this.language()} request (queue: ${this.requestQueue.length})`,
				);
			}
		});
	}

	private getAvailableWorker(): DaemonWorker | null {
		for (const worker of this.workers.values()) {
			if (!worker.busy) {
				return worker;
			}
		}

		// Auto-scale if needed
		if (this.workers.size < this.maxWorkers) {
			this.createWorker().catch(console.error);
		}

		return null;
	}

	private executeOnWorker(worker: DaemonWorker, request: PendingRequest): void {
		worker.busy = true;

		const timeoutHandle = setTimeout(() => {
			this.pendingRequests.delete(request.requestId);
			worker.busy = false;
			worker.failureCount++;
			this.processQueue();
			request.reject(new ApiError(408, `${this.language()} execution timeout`));
		}, request.options.timeout + 2000);

		this.pendingRequests.set(request.requestId, {
			...request,
			resolve: (result: ExecResult) => {
				clearTimeout(timeoutHandle);
				request.resolve(result);
			},
			reject: (error: Error) => {
				clearTimeout(timeoutHandle);
				request.reject(error);
			},
		});

		// Send execution request to worker
		const workerRequest = {
			type: "execute",
			requestId: request.requestId,
			code: request.code,
			options: request.options,
		};

		try {
			worker.process.stdin?.write(`${JSON.stringify(workerRequest)}\n`);
		} catch (_error) {
			clearTimeout(timeoutHandle);
			this.pendingRequests.delete(request.requestId);
			worker.busy = false;
			this.processQueue();
			request.reject(
				new ApiError(500, `Failed to send code to ${this.language()} worker`),
			);
		}
	}

	private processQueue(): void {
		while (this.requestQueue.length > 0) {
			const worker = this.getAvailableWorker();
			if (!worker) break;

			const request = this.requestQueue.shift();
			if (!request) break;

			// More generous timeout logic for daemon initialization
			const queueWaitTime = Date.now() - request.timestamp;
			const remainingTimeout = request.options.timeout - queueWaitTime;

			// Be more generous during daemon startup phase
			const minExecutionTime = this.workers.size < this.minWorkers ? 1000 : 100;

			if (remainingTimeout < minExecutionTime) {
				const message =
					this.workers.size < this.minWorkers
						? `${this.language()} daemon still initializing (waited ${queueWaitTime}ms)`
						: `${this.language()} request timed out in queue (waited ${queueWaitTime}ms)`;

				request.reject(new ApiError(408, message));
				continue;
			}

			// Update the request timeout to remaining time
			const updatedRequest = {
				...request,
				options: {
					...request.options,
					timeout: Math.max(remainingTimeout, minExecutionTime),
				},
			};

			this.executeOnWorker(worker, updatedRequest);
		}
	}

	isAvailable(): boolean {
		return this.initialized && this.workers.size > 0;
	}

	getMetrics(): RunnerMetrics {
		return { ...this.metrics };
	}

	async warmup(): Promise<void> {
		if (!this.initialized) {
			await this.initialize();
		}

		// Run simple warmup code on all workers
		const warmupCode = this.getWarmupCode();
		const promises = Array.from(this.workers.values())
			.filter((w) => !w.busy)
			.map((_w) => this.run(warmupCode, { timeout: 1000, memoryLimit: 64 }));

		await Promise.allSettled(promises);
		console.log(`🔥 ${this.language()} pool warmed up`);
	}

	protected abstract getWarmupCode(): string;

	async shutdown(): Promise<void> {
		console.log(`🔄 Shutting down ${this.language()} daemon pool...`);

		// Kill all workers
		for (const worker of this.workers.values()) {
			worker.process.kill("SIGTERM");
			setTimeout(() => {
				if (!worker.process.killed) {
					worker.process.kill("SIGKILL");
				}
			}, 5000);
		}

		this.workers.clear();

		// Reject pending requests
		for (const request of this.pendingRequests.values()) {
			request.reject(
				new ApiError(503, `${this.language()} pool is shutting down`),
			);
		}
		this.pendingRequests.clear();

		// Clear queue
		for (const request of this.requestQueue) {
			request.reject(
				new ApiError(503, `${this.language()} pool is shutting down`),
			);
		}
		this.requestQueue.length = 0;

		console.log(`✅ ${this.language()} daemon pool shutdown complete`);
	}

	getStats() {
		const busyWorkers = Array.from(this.workers.values()).filter(
			(w) => w.busy,
		).length;

		return {
			language: this.language(),
			totalWorkers: this.workers.size,
			busyWorkers,
			idleWorkers: this.workers.size - busyWorkers,
			queueLength: this.requestQueue.length,
			pendingRequests: this.pendingRequests.size,
			metrics: this.metrics,
			initialized: this.initialized,
		};
	}
}
