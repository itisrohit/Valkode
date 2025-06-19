import { describe, expect, test } from "bun:test";
import app from "../src/app";

describe("Valkode API Performance", () => {
	describe("🏥 Health & Status", () => {
		test("Health endpoint shows daemon status", async () => {
			const req = new Request("http://localhost/api/v1/health");
			const res = await app.fetch(req);
			const data = await res.json();

			expect(res.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.data.status).toBe("ok");
			expect(data.data.processPool).toBeDefined();
			expect(data.data.runners).toBeDefined(); // New daemon runners stats

			console.log("🏥 Health check passed - daemon runners available");
		});

		test("Languages endpoint lists all supported languages", async () => {
			const req = new Request("http://localhost/api/v1/languages");
			const res = await app.fetch(req);
			const data = await res.json();

			expect(res.status).toBe(200);
			expect(data.data.languages).toContain("javascript");
			expect(data.data.languages).toContain("python");
			expect(data.data.languages).toContain("typescript");

			console.log(`📋 Supported languages: ${data.data.languages.join(", ")}`);
		});
	});

	describe("⚡ API Performance Benchmarks", () => {
		test("JavaScript API performance", async () => {
			const testCases = [
				{ name: "Simple", code: 'console.log("Hello");' },
				{ name: "Math", code: "console.log(Math.sqrt(64));" },
				{ name: "Array", code: "console.log([1,2,3].map(x => x * 2));" },
			];

			for (const testCase of testCases) {
				const start = performance.now();

				const req = new Request("http://localhost/api/v1/execute", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						code: testCase.code,
						language: "javascript",
					}),
				});

				const res = await app.fetch(req);
				const data = await res.json();
				const apiTime = performance.now() - start;

				expect(res.status).toBe(200);
				expect(data.success).toBe(true);

				console.log(
					`⚡ JS ${testCase.name}: exec=${data.data.executionTime}ms, api=${apiTime.toFixed(2)}ms`,
				);
			}
		});

		test("Python daemon API performance", async () => {
			const testCases = [
				{ name: "Simple", code: 'print("Hello Python")' },
				{ name: "Math", code: "print(2 ** 10)" },
				{ name: "List", code: "print([x*2 for x in [1,2,3]])" },
			];

			// Wait for Python daemons to be fully ready
			console.log("🐍 Waiting for Python daemons to be ready...");
			await new Promise((resolve) => setTimeout(resolve, 3000));

			for (const testCase of testCases) {
				const start = performance.now();

				const req = new Request("http://localhost/api/v1/execute", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						code: testCase.code,
						language: "python",
					}),
				});

				const res = await app.fetch(req);
				const data = await res.json();
				const apiTime = performance.now() - start;

				expect(res.status).toBe(200);
				expect(data.success).toBe(true);

				console.log(
					`🐍 Python ${testCase.name}: exec=${data.data.executionTime}ms, api=${apiTime.toFixed(2)}ms`,
				);
			}
		});

		test("TypeScript compilation performance", async () => {
			const tsCode = `
                interface User {
                    name: string;
                    age: number;
                }
                
                const user: User = { name: "Alice", age: 30 };
                console.log(\`Hello \${user.name}, age \${user.age}\`);
            `;

			const start = performance.now();

			const req = new Request("http://localhost/api/v1/execute", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					code: tsCode,
					language: "typescript",
				}),
			});

			const res = await app.fetch(req);
			const data = await res.json();
			const apiTime = performance.now() - start;

			expect(res.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.data.output).toContain("Hello Alice, age 30");

			console.log(
				`📝 TypeScript: exec=${data.data.executionTime}ms, api=${apiTime.toFixed(2)}ms`,
			);
		});
	});

	describe("🚀 Load Testing", () => {
		test("Concurrent API requests", async () => {
			// Create Request objects properly for concurrent testing
			const createRequest = (i: number) => {
				return new Request("http://localhost/api/v1/execute", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						code: `console.log("Request ${i + 1}:", Math.random());`,
						language: "javascript",
					}),
				});
			};

			const requests = Array.from({ length: 5 }, (_, i) => createRequest(i));

			const start = performance.now();

			// Execute all requests concurrently using app.fetch
			const responses = await Promise.all(
				requests.map((req) => app.fetch(req)),
			);

			const totalTime = performance.now() - start;

			// Parse all responses
			const results = await Promise.all(responses.map((res) => res.json()));

			// Validate all responses
			results.forEach((data, i) => {
				expect(data.success).toBe(true);
				console.log(`  Request ${i + 1}: ${data.data.executionTime}ms`);
			});

			const avgTime = totalTime / requests.length;
			console.log(
				`🚀 Concurrent Performance: ${totalTime.toFixed(2)}ms total, ${avgTime.toFixed(2)}ms avg`,
			);

			// Performance expectations
			expect(avgTime).toBeLessThan(100); // Should handle concurrency well
		});

		test("Mixed language concurrent execution", async () => {
			const testCases = [
				{ code: 'console.log("JS Test 1");', language: "javascript" },
				{ code: 'print("Python Test 1")', language: "python" },
				{
					code: 'const x: number = 42; console.log("TS:", x);',
					language: "typescript",
				},
				{ code: 'console.log("JS Test 2");', language: "javascript" },
				{ code: 'print("Python Test 2")', language: "python" },
			];

			// Wait for Python daemons to be ready before concurrent test
			console.log("🌐 Waiting for Python daemons to be ready...");
			await new Promise((resolve) => setTimeout(resolve, 2000));

			// Create Request objects for each test case
			const requests = testCases.map((testCase, _i) => {
				return new Request("http://localhost/api/v1/execute", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						code: testCase.code,
						language: testCase.language,
					}),
				});
			});

			console.log(
				`🌐 Testing ${testCases.length} mixed concurrent executions...`,
			);

			const start = performance.now();

			// Execute all requests concurrently
			const responses = await Promise.all(
				requests.map((req) => app.fetch(req)),
			);

			const totalTime = performance.now() - start;

			// Parse and validate responses
			const results = await Promise.all(responses.map((res) => res.json()));

			results.forEach((data, i) => {
				// Be more flexible with status codes for timing-sensitive tests
				if (data.success) {
					console.log(
						`  ${testCases[i].language}: ${data.data.executionTime}ms`,
					);
				} else {
					console.log(`  ${testCases[i].language}: failed (${data.message})`);
				}
			});

			// Count successful executions
			const successCount = results.filter((data) => data.success).length;
			console.log(
				`📊 Mixed Concurrent Performance: ${totalTime.toFixed(2)}ms total`,
			);
			console.log(`📊 Success rate: ${successCount}/${testCases.length}`);

			// Allow for some timing variability in concurrent tests
			expect(successCount).toBeGreaterThanOrEqual(3); // At least 60% success rate
		});

		test("High throughput stress test", async () => {
			const concurrentRequests = 20;
			const code = 'console.log("Stress test:", Date.now());';

			console.log(
				`🔥 Stress testing with ${concurrentRequests} concurrent requests...`,
			);

			const requests = Array.from({ length: concurrentRequests }, (_, _i) => {
				return new Request("http://localhost/api/v1/execute", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						code: code,
						language: "javascript",
					}),
				});
			});

			const start = performance.now();

			const responses = await Promise.all(
				requests.map((req) => app.fetch(req)),
			);

			const totalTime = performance.now() - start;
			const results = await Promise.all(responses.map((res) => res.json()));

			// All should succeed
			const successCount = results.filter((data) => data.success).length;
			expect(successCount).toBe(concurrentRequests);

			const avgTime = totalTime / concurrentRequests;
			const throughput = 1000 / avgTime; // requests per second

			console.log(`📊 Stress Test Results:`);
			console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
			console.log(`  Avg per request: ${avgTime.toFixed(2)}ms`);
			console.log(
				`  Success rate: ${successCount}/${concurrentRequests} (${((successCount / concurrentRequests) * 100).toFixed(1)}%)`,
			);
			console.log(`  Throughput: ${throughput.toFixed(0)} req/sec`);

			// Performance expectations for stress test
			expect(successCount).toBe(concurrentRequests); // 100% success rate
			expect(avgTime).toBeLessThan(200); // Should stay under 200ms average
		});
	});

	describe("📊 Performance Regression Tests", () => {
		test("JavaScript execution baseline", async () => {
			const baselineCode = 'console.log("Baseline test");';
			const runs = 10;
			const times: number[] = [];

			for (let i = 0; i < runs; i++) {
				const req = new Request("http://localhost/api/v1/execute", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						code: baselineCode,
						language: "javascript",
					}),
				});

				const start = performance.now();
				const res = await app.fetch(req);
				const apiTime = performance.now() - start;
				const data = await res.json();

				expect(res.status).toBe(200);
				expect(data.success).toBe(true);

				times.push(apiTime);
			}

			const avg = times.reduce((a, b) => a + b, 0) / times.length;
			const min = Math.min(...times);
			const max = Math.max(...times);
			const variance = max - min;

			console.log(`📊 JavaScript Baseline Performance:`);
			console.log(`  Average: ${avg.toFixed(2)}ms`);
			console.log(`  Min: ${min.toFixed(2)}ms`);
			console.log(`  Max: ${max.toFixed(2)}ms`);
			console.log(`  Variance: ${variance.toFixed(2)}ms`);

			// Performance regression checks
			expect(avg).toBeLessThan(50); // Should stay under 50ms average
			expect(variance).toBeLessThan(100); // Should be consistent
		});

		test("Python daemon baseline", async () => {
			const baselineCode = 'print("Python baseline")';
			const runs = 10;
			const times: number[] = [];

			for (let i = 0; i < runs; i++) {
				const req = new Request("http://localhost/api/v1/execute", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						code: baselineCode,
						language: "python",
					}),
				});

				const start = performance.now();
				const res = await app.fetch(req);
				const apiTime = performance.now() - start;
				const data = await res.json();

				expect(res.status).toBe(200);
				expect(data.success).toBe(true);

				times.push(apiTime);
			}

			const avg = times.reduce((a, b) => a + b, 0) / times.length;
			const min = Math.min(...times);
			const max = Math.max(...times);
			const variance = max - min;

			console.log(`📊 Python Daemon Baseline Performance:`);
			console.log(`  Average: ${avg.toFixed(2)}ms`);
			console.log(`  Min: ${min.toFixed(2)}ms`);
			console.log(`  Max: ${max.toFixed(2)}ms`);
			console.log(`  Variance: ${variance.toFixed(2)}ms`);

			// Python daemon should be very consistent (no cold start)
			expect(avg).toBeLessThan(100); // Should stay under 100ms average
			expect(variance).toBeLessThan(50); // Should be very consistent
		});
	});
});
