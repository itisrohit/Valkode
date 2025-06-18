const ivm = require("isolated-vm");
const readline = require("node:readline");

// Create readline interface for line-by-line input
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	terminal: false,
});

// Send startup message to stderr instead of stdout to avoid JSON parsing issues
console.error(`Worker ${process.pid} started and ready for requests`);

// Handle each line as a separate request
rl.on("line", async (line) => {
	try {
		const request = JSON.parse(line);
		const { code, timeout = 5000, memoryLimit = 128, requestId } = request;

		// Create isolate for this execution
		const isolate = new ivm.Isolate({
			memoryLimit,
			inspector: false,
		});

		let output = "";

		try {
			// Create context
			const context = await isolate.createContext();
			const jail = context.global;

			// Set up console.log capture
			await jail.set(
				"_log",
				new ivm.Reference((message) => {
					output += `${message}\n`;
				}),
			);

			// Create safe console
			await context.eval(`
                const globalThis = this;
                globalThis.console = {
                    log: (...args) => {
                        const message = args.map(arg => {
                            if (typeof arg === 'object' && arg !== null) {
                                try {
                                    return JSON.stringify(arg);
                                } catch (e) {
                                    return String(arg);
                                }
                            }
                            return String(arg);
                        }).join(' ');
                        _log.applySync(undefined, [message]);
                    }
                };
                
                if (typeof global !== 'undefined') {
                    global.console = globalThis.console;
                }
            `);

			// Execute user code
			await context.eval(code, {
				timeout,
				filename: "user-code.js",
			});

			// Send success response
			const response = {
				requestId,
				success: true,
				output: output.trim() || "Code executed successfully (no output)",
			};

			process.stdout.write(`${JSON.stringify(response)}\n`);
		} catch (error) {
			let errorType = "execution_error";
			let errorMessage = error.message;

			if (error.message.includes("Script execution timed out")) {
				errorType = "timeout";
				errorMessage = "JavaScript execution timeout";
			} else if (error.message.includes("Array buffer allocation failed")) {
				errorType = "memory_limit";
				errorMessage = "JavaScript execution exceeded memory limit";
			}

			const response = {
				requestId,
				success: false,
				error: errorType,
				message: errorMessage,
			};

			process.stdout.write(`${JSON.stringify(response)}\n`);
		} finally {
			isolate.dispose();
		}
	} catch (_parseError) {
		// Handle invalid JSON input
		const response = {
			requestId: "unknown",
			success: false,
			error: "parse_error",
			message: "Invalid JSON request",
		};

		process.stdout.write(`${JSON.stringify(response)}\n`);
	}
});

// Handle worker shutdown gracefully
process.on("SIGTERM", () => {
	console.error(`Worker ${process.pid} received SIGTERM, shutting down...`);
	rl.close();
	process.exit(0);
});

process.on("SIGINT", () => {
	console.error(`Worker ${process.pid} received SIGINT, shutting down...`);
	rl.close();
	process.exit(0);
});
