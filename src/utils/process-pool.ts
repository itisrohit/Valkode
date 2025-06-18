import { type ChildProcess, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import path from "node:path";
import { ApiError } from "@/utils/apiHandler";

interface PoolWorker {
	id: string;
	process: ChildProcess;
	busy: boolean;
	requestCount: number;
	lastUsed: number;
}

interface ExecutionRequest {
	code: string;
	timeout: number;
	memoryLimit: number;
	requestId: string;
}

interface ExecutionResponse {
	requestId: string;
	success: boolean;
	output?: string;
	error?: string;
	message?: string;
}

export class JavaScriptProcessPool extends EventEmitter {
	private workers: Map<string, PoolWorker> = new Map();
	private pendingRequests: Map<
		string,
		{
			resolve: (value: string) => void;
			reject: (error: ApiError) => void;
			timeout: NodeJS.Timeout;
			workerId: string;
		}
	> = new Map();

	// Add request queue
	private requestQueue: Array<{
		code: string;
		timeout: number;
		memoryLimit: number;
		resolve: (value: string) => void;
		reject: (error: ApiError) => void;
		requestId: string;
		queuedAt: number;
	}> = [];

	private readonly maxWorkers: number;
	private readonly minWorkers: number;
	private readonly workerIdleTimeout: number;
	private readonly scriptPath: string;
	private readonly maxQueueSize: number;

	constructor(
		options: {
			minWorkers?: number;
			maxWorkers?: number;
			workerIdleTimeout?: number;
			maxQueueSize?: number;
		} = {},
	) {
		super();

		this.minWorkers = options.minWorkers ?? 2;
		this.maxWorkers = options.maxWorkers ?? 8;
		this.workerIdleTimeout = options.workerIdleTimeout ?? 30000;
		this.maxQueueSize = options.maxQueueSize ?? 100;
		this.scriptPath = path.join(
			process.cwd(),
			"scripts",
			"js-executor-pool.js",
		);

		this.initialize();
		setInterval(() => this.cleanupIdleWorkers(), 10000);
	}

	private async initialize(): Promise<void> {
		console.log(
			`🚀 Initializing JavaScript process pool with ${this.minWorkers} workers...`,
		);

		for (let i = 0; i < this.minWorkers; i++) {
			await this.createWorker();
		}

		console.log(
			`✅ Process pool initialized with ${this.workers.size} workers`,
		);
	}

	private async createWorker(): Promise<PoolWorker> {
		const workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		const childProcess = spawn("node", [this.scriptPath], {
			stdio: ["pipe", "pipe", "pipe"],
			env: { ...process.env, NODE_ENV: "production" },
		});

		const worker: PoolWorker = {
			id: workerId,
			process: childProcess,
			busy: false,
			requestCount: 0,
			lastUsed: Date.now(),
		};

		// Handle worker output (execution results)
		let buffer = "";
		childProcess.stdout?.on("data", (data) => {
			buffer += data.toString();
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			for (const line of lines) {
				if (line.trim()) {
					try {
						const response = JSON.parse(line) as ExecutionResponse;
						this.handleWorkerResponse(response);
					} catch (_error) {
						console.warn(`Worker ${workerId} sent invalid JSON: ${line}`);
					}
				}
			}
		});

		// Handle worker errors
		childProcess.stderr?.on("data", (data) => {
			const message = data.toString().trim();
			if (message) {
				console.log(message);
			}
		});

		// Handle worker exit
		childProcess.on("exit", (code, signal) => {
			console.log(
				`Worker ${workerId} exited with code ${code}, signal ${signal}`,
			);
			this.workers.delete(workerId);

			// Create replacement worker if needed
			if (this.workers.size < this.minWorkers) {
				this.createWorker();
			}
		});

		// Handle worker errors
		childProcess.on("error", (error) => {
			console.error(`Worker ${workerId} error:`, error);
			this.workers.delete(workerId);
		});

		this.workers.set(workerId, worker);
		console.log(`📦 Created worker ${workerId} (total: ${this.workers.size})`);

		return worker;
	}

	private handleWorkerResponse(response: ExecutionResponse): void {
		const pending = this.pendingRequests.get(response.requestId);

		if (!pending) {
			console.warn(
				`Received response for unknown request: ${response.requestId}`,
			);
			return;
		}

		clearTimeout(pending.timeout);
		this.pendingRequests.delete(response.requestId);

		const worker = this.workers.get(pending.workerId);
		if (worker) {
			worker.busy = false;
			worker.lastUsed = Date.now();

			// Process queue after worker becomes available
			this.processQueue();
		}

		if (response.success) {
			pending.resolve(response.output || "");
		} else {
			let statusCode = 400;
			if (response.error === "timeout") statusCode = 408;
			if (response.error === "memory_limit") statusCode = 413;

			pending.reject(
				new ApiError(
					statusCode,
					response.message || "JavaScript execution failed",
				),
			);
		}
	}

	private getAvailableWorker(): PoolWorker | null {
		for (const worker of this.workers.values()) {
			if (!worker.busy) {
				return worker;
			}
		}

		// Create new worker if under max limit
		if (this.workers.size < this.maxWorkers) {
			this.createWorker();
		}

		return null;
	}

	private processQueue(): void {
		// Process queued requests when workers become available
		while (this.requestQueue.length > 0) {
			const worker = this.getAvailableWorker();
			if (!worker) break;

			const queuedRequest = this.requestQueue.shift();
			if (!queuedRequest) break;

			// Check if request hasn't timed out while in queue
			const queueTime = Date.now() - queuedRequest.queuedAt;
			if (queueTime > queuedRequest.timeout) {
				queuedRequest.reject(new ApiError(408, "Request timed out in queue"));
				continue;
			}

			this.executeOnWorker(worker, queuedRequest);
		}
	}

	private cleanupIdleWorkers(): void {
		const now = Date.now();

		for (const [workerId, worker] of this.workers.entries()) {
			const idleTime = now - worker.lastUsed;

			// Keep minimum workers alive, cleanup excess idle workers
			if (
				this.workers.size > this.minWorkers &&
				!worker.busy &&
				idleTime > this.workerIdleTimeout
			) {
				console.log(
					`🧹 Cleaning up idle worker ${workerId} (idle for ${idleTime}ms)`,
				);
				worker.process.kill("SIGTERM");
				this.workers.delete(workerId);
			}
		}
	}

	private executeOnWorker(
		worker: PoolWorker,
		request: {
			code: string;
			timeout: number;
			memoryLimit: number;
			resolve: (value: string) => void;
			reject: (error: ApiError) => void;
			requestId: string;
		},
	): void {
		worker.busy = true;
		worker.requestCount++;

		const timeoutHandle = setTimeout(() => {
			this.pendingRequests.delete(request.requestId);
			worker.busy = false;
			this.processQueue(); // Try to process queue after timeout
			request.reject(
				new ApiError(408, "JavaScript execution timeout (pool level)"),
			);
		}, request.timeout + 2000);

		this.pendingRequests.set(request.requestId, {
			resolve: request.resolve,
			reject: request.reject,
			timeout: timeoutHandle,
			workerId: worker.id,
		});

		const executionRequest: ExecutionRequest = {
			code: request.code,
			timeout: request.timeout,
			memoryLimit: request.memoryLimit,
			requestId: request.requestId,
		};

		try {
			worker.process.stdin?.write(`${JSON.stringify(executionRequest)}\n`);
		} catch (_error) {
			clearTimeout(timeoutHandle);
			this.pendingRequests.delete(request.requestId);
			worker.busy = false;
			this.processQueue(); // Try to process queue after error
			request.reject(
				new ApiError(500, "Failed to communicate with worker process"),
			);
		}
	}

	async execute(
		code: string,
		timeout = 5000,
		memoryLimit = 128,
	): Promise<string> {
		const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		return new Promise((resolve, reject) => {
			const worker = this.getAvailableWorker();

			if (worker) {
				// Execute immediately
				this.executeOnWorker(worker, {
					code,
					timeout,
					memoryLimit,
					resolve,
					reject,
					requestId,
				});
			} else {
				// Queue the request
				if (this.requestQueue.length >= this.maxQueueSize) {
					reject(new ApiError(503, "Request queue is full"));
					return;
				}

				this.requestQueue.push({
					code,
					timeout,
					memoryLimit,
					resolve,
					reject,
					requestId,
					queuedAt: Date.now(),
				});

				console.log(
					`📝 Queued request ${requestId} (queue size: ${this.requestQueue.length})`,
				);
			}
		});
	}

	getStats() {
		const busyWorkers = Array.from(this.workers.values()).filter(
			(w) => w.busy,
		).length;
		const totalRequests = Array.from(this.workers.values()).reduce(
			(sum, w) => sum + w.requestCount,
			0,
		);

		return {
			totalWorkers: this.workers.size,
			busyWorkers,
			idleWorkers: this.workers.size - busyWorkers,
			pendingRequests: this.pendingRequests.size,
			queuedRequests: this.requestQueue.length,
			totalRequests,
			minWorkers: this.minWorkers,
			maxWorkers: this.maxWorkers,
			maxQueueSize: this.maxQueueSize,
		};
	}

	async shutdown(): Promise<void> {
		console.log("🔄 Shutting down JavaScript process pool...");

		// Kill all workers
		for (const worker of this.workers.values()) {
			worker.process.kill("SIGTERM");
		}

		// Clear workers map
		this.workers.clear();

		// Reject pending requests
		for (const pending of this.pendingRequests.values()) {
			clearTimeout(pending.timeout);
			pending.reject(new ApiError(503, "Process pool is shutting down"));
		}

		this.pendingRequests.clear();

		// Clear request queue
		for (const queuedRequest of this.requestQueue) {
			queuedRequest.reject(new ApiError(503, "Process pool is shutting down"));
		}

		this.requestQueue.length = 0;

		console.log("✅ JavaScript process pool shutdown complete");
	}
}
