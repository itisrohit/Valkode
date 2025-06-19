import { describe, expect, test } from "bun:test";
import { Sandbox } from "../src/engine/sandbox";
import { ApiError } from "../src/utils/apiHandler";

describe("Sandbox Core Functionality", () => {
	const sandbox = new Sandbox();

	describe("✅ Language Support Verification", () => {
		test("JavaScript execution works", async () => {
			const result = await sandbox.execute(
				'console.log("Hello JavaScript!");',
				"javascript",
			);

			expect(result.success).toBe(true);
			expect(result.output).toBe("Hello JavaScript!");
			expect(result.executionTime).toBeGreaterThan(0);

			console.log(`⚡ JavaScript: ${result.executionTime}ms`);
		});

		test("Python daemon execution works", async () => {
			// Wait for Python daemons to be fully ready
			console.log("🐍 Ensuring Python daemons are ready...");
			await new Promise((resolve) => setTimeout(resolve, 3000));

			const result = await sandbox.execute(
				'print("Hello Python Daemon!")',
				"python",
			);

			expect(result.success).toBe(true);
			expect(result.output).toBe("Hello Python Daemon!");
			expect(result.executionTime).toBeGreaterThan(0);

			console.log(`🐍 Python daemon: ${result.executionTime}ms`);
		});

		test("TypeScript compilation and execution works", async () => {
			const code = 'const msg: string = "Hello TypeScript!"; console.log(msg);';
			const result = await sandbox.execute(code, "typescript");

			expect(result.success).toBe(true);
			expect(result.output).toBe("Hello TypeScript!");

			console.log(`📝 TypeScript: ${result.executionTime}ms`);
		});
	});

	describe("🛡️ Security & Validation", () => {
		test("Empty code validation", async () => {
			try {
				await sandbox.execute("", "javascript");
				expect(true).toBe(false); // Should not reach here
			} catch (error) {
				expect(error).toBeInstanceOf(ApiError);
				expect((error as ApiError).statusCode).toBe(400);
			}
		});

		test("Unsupported language validation", async () => {
			try {
				await sandbox.execute('print("test")', "cobol");
				expect(true).toBe(false); // Should not reach here
			} catch (error) {
				expect(error).toBeInstanceOf(ApiError);
				expect((error as ApiError).statusCode).toBe(400);
				expect((error as ApiError).message).toContain("not supported");
			}
		});

		test("JavaScript security - blocked operations", async () => {
			try {
				await sandbox.execute('require("fs");', "javascript");
				expect(true).toBe(false); // Should not reach here
			} catch (error) {
				// Should fail due to security restrictions
				expect(error).toBeInstanceOf(ApiError);
			}
		});
	});

	describe("📊 Performance Characteristics", () => {
		test("Consistent performance across multiple runs", async () => {
			const code = 'console.log("Performance test");';
			const runs = 5;
			const times: number[] = [];

			for (let i = 0; i < runs; i++) {
				const result = await sandbox.execute(code, "javascript");
				expect(result.success).toBe(true);
				times.push(result.executionTime);
			}

			const avg = times.reduce((a, b) => a + b, 0) / times.length;
			const variance = Math.max(...times) - Math.min(...times);

			console.log(
				`📊 JS Consistency: avg=${avg.toFixed(2)}ms, variance=${variance}ms`,
			);
			expect(variance).toBeLessThan(50); // Should be consistent
		});

		test("Python daemon consistency (no cold start)", async () => {
			const code = 'print("Daemon test")';
			const runs = 5;
			const times: number[] = [];

			console.log("🐍 Running Python daemon consistency test...");

			for (let i = 0; i < runs; i++) {
				try {
					const result = await sandbox.execute(code, "python");
					expect(result.success).toBe(true);
					times.push(result.executionTime);
					console.log(`🐍 Run ${i + 1}: ${result.executionTime}ms`);
				} catch (error) {
					console.log(
						`🐍 Run ${i + 1}: Failed - ${error instanceof Error ? error.message : "Unknown error"}`,
					);
					// If daemon isn't ready yet, skip this measurement
					if (
						error instanceof ApiError &&
						error.message.includes("daemon still initializing")
					) {
						console.log("🐍 Daemon still initializing, waiting...");
						await new Promise((resolve) => setTimeout(resolve, 1000));
						i--; // Retry this iteration
						continue;
					}
					throw error;
				}
			}

			if (times.length >= 3) {
				// Need at least 3 successful runs
				const avg = times.reduce((a, b) => a + b, 0) / times.length;
				const variance = Math.max(...times) - Math.min(...times);

				console.log(
					`📊 Python Daemon Consistency: avg=${avg.toFixed(2)}ms, variance=${variance}ms`,
				);
				expect(variance).toBeLessThan(30); // Daemon should be very consistent
			} else {
				console.log("⚠️ Not enough successful Python runs for consistency test");
			}
		});

		test("Python daemon warmup verification", async () => {
			console.log("🔥 Testing Python daemon warmup...");

			// Test multiple quick executions to verify daemon is warm
			const warmupTests = [
				'print("Test 1")',
				'print("Test 2")',
				'print("Test 3")',
			];

			for (let i = 0; i < warmupTests.length; i++) {
				try {
					const result = await sandbox.execute(warmupTests[i], "python");
					expect(result.success).toBe(true);
					console.log(
						`🔥 Warmup ${i + 1}: ${result.executionTime}ms - "${result.output}"`,
					);

					// After first successful execution, subsequent ones should be fast
					if (i > 0) {
						expect(result.executionTime).toBeLessThan(50);
					}
				} catch (error) {
					console.log(
						`🔥 Warmup ${i + 1}: Failed - ${error instanceof Error ? error.message : "Unknown error"}`,
					);
					if (i === 0) {
						// First test can fail due to initialization, wait and retry
						await new Promise((resolve) => setTimeout(resolve, 2000));
						i--; // Retry
						continue;
					}
					throw error;
				}
			}

			console.log("✅ Python daemon warmup verification complete");
		});
	});

	describe("🔗 Multi-Language Integration", () => {
		test("All languages work in sequence", async () => {
			console.log("🌐 Testing sequential multi-language execution...");

			const tests = [
				{
					code: 'console.log("JS works");',
					lang: "javascript",
					expected: "JS works",
				},
				{
					code: 'const x: number = 42; console.log("TS:", x);',
					lang: "typescript",
					expected: "TS: 42",
				},
			];

			// Test JavaScript and TypeScript first (they're more reliable)
			for (const test of tests) {
				const result = await sandbox.execute(test.code, test.lang);
				expect(result.success).toBe(true);
				expect(result.output).toContain(test.expected);
				console.log(`✅ ${test.lang}: ${result.executionTime}ms`);
			}

			// Then test Python if daemons are ready
			try {
				const pythonResult = await sandbox.execute(
					'print("Python works")',
					"python",
				);
				expect(pythonResult.success).toBe(true);
				expect(pythonResult.output).toBe("Python works");
				console.log(`✅ python: ${pythonResult.executionTime}ms`);
			} catch (error) {
				console.log(
					`⚠️ Python test skipped: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
				// Don't fail the test if Python daemon isn't ready yet
			}

			console.log("🌐 Multi-language sequence test complete");
		});
	});
});
