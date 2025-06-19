import { describe, expect, test } from "bun:test";
import { Sandbox } from "../src/engine/sandbox";

describe("Performance Benchmarks", () => {
	const sandbox = new Sandbox();

	describe("🚀 Cold Start vs Warm Execution", () => {
		test("JavaScript: First vs subsequent executions", async () => {
			const code = 'console.log("Performance test");';
			const results: number[] = [];

			// Run 5 times to measure warmup
			for (let i = 0; i < 5; i++) {
				const start = performance.now();
				const result = await sandbox.execute(code, "javascript");
				const totalTime = performance.now() - start;

				expect(result.success).toBe(true);
				results.push(totalTime);

				console.log(
					`⚡ JS Run ${i + 1}: ${result.executionTime}ms (total: ${totalTime.toFixed(2)}ms)`,
				);
			}

			const [first, ...rest] = results;
			const avgWarm = rest.reduce((a, b) => a + b, 0) / rest.length;

			console.log(
				`📊 JS Cold start: ${first.toFixed(2)}ms | Warm avg: ${avgWarm.toFixed(2)}ms`,
			);
			expect(avgWarm).toBeLessThan(50); // Should be very fast when warm
		});

		test("Python: Daemon vs traditional performance", async () => {
			const code = 'print("Python daemon test")';
			const results: number[] = [];

			console.log("🐍 Waiting for Python daemons to be ready...");

			// Wait a bit longer for Python daemons to fully initialize
			await new Promise((resolve) => setTimeout(resolve, 2000));

			// Run 5 times to measure daemon performance
			for (let i = 0; i < 5; i++) {
				const start = performance.now();
				const result = await sandbox.execute(code, "python");
				const totalTime = performance.now() - start;

				expect(result.success).toBe(true);
				results.push(totalTime);

				console.log(
					`🐍 Python Run ${i + 1}: ${result.executionTime}ms (total: ${totalTime.toFixed(2)}ms)`,
				);
			}

			const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
			console.log(`📊 Python Daemon Average: ${avgTime.toFixed(2)}ms`);

			// Daemon should be consistently fast (no cold start)
			expect(avgTime).toBeLessThan(100); // Should be sub-100ms
			expect(Math.max(...results) - Math.min(...results)).toBeLessThan(50); // Low variance
		});

		test("TypeScript: Compilation + execution performance", async () => {
			const code = 'const x: number = 42; console.log("TypeScript:", x);';
			const results: number[] = [];

			// Test TypeScript compilation performance
			for (let i = 0; i < 3; i++) {
				const start = performance.now();
				const result = await sandbox.execute(code, "typescript");
				const totalTime = performance.now() - start;

				expect(result.success).toBe(true);
				results.push(totalTime);

				console.log(
					`📝 TS Run ${i + 1}: ${result.executionTime}ms (total: ${totalTime.toFixed(2)}ms)`,
				);
			}

			const [first, ...rest] = results;
			const avgWarm = rest.reduce((a, b) => a + b, 0) / rest.length;

			console.log(
				`📊 TS First: ${first.toFixed(2)}ms | Warm avg: ${avgWarm.toFixed(2)}ms`,
			);
		});
	});

	describe("🏁 Language Speed Comparison", () => {
		test("Fibonacci calculation across languages", async () => {
			const fibTests = {
				javascript: `
                    function fib(n) { 
                        return n <= 1 ? n : fib(n-1) + fib(n-2); 
                    }
                    console.log(fib(10));
                `,
				python: `
def fib(n):
    return n if n <= 1 else fib(n-1) + fib(n-2)

print(fib(10))
                `,
				typescript: `
                    function fib(n: number): number { 
                        return n <= 1 ? n : fib(n-1) + fib(n-2); 
                    }
                    console.log(fib(10));
                `,
			};

			const results: Record<string, number> = {};

			for (const [lang, code] of Object.entries(fibTests)) {
				const start = performance.now();
				const result = await sandbox.execute(code, lang);
				const totalTime = performance.now() - start;

				expect(result.success).toBe(true);
				expect(result.output.trim()).toBe("55"); // fib(10) = 55

				results[lang] = totalTime;
				console.log(
					`🏃 ${lang}: ${result.executionTime}ms (total: ${totalTime.toFixed(2)}ms)`,
				);
			}

			console.log("📊 Fibonacci Performance Ranking:");
			Object.entries(results)
				.sort(([, a], [, b]) => a - b)
				.forEach(([lang, time], i) =>
					console.log(`  ${i + 1}. ${lang}: ${time.toFixed(2)}ms`),
				);
		});

		test("Array operations performance", async () => {
			const arrayTests = {
				javascript: `
                    const arr = Array.from({length: 1000}, (_, i) => i);
                    const result = arr.map(x => x * 2).filter(x => x % 4 === 0).reduce((a, b) => a + b, 0);
                    console.log(result);
                `,
				python: `
arr = list(range(1000))
result = sum(x for x in [i * 2 for i in arr] if x % 4 == 0)
print(result)
                `,
				typescript: `
                    const arr: number[] = Array.from({length: 1000}, (_, i) => i);
                    const result: number = arr.map(x => x * 2).filter(x => x % 4 === 0).reduce((a, b) => a + b, 0);
                    console.log(result);
                `,
			};

			const results: Record<string, number> = {};

			for (const [lang, code] of Object.entries(arrayTests)) {
				const start = performance.now();
				const result = await sandbox.execute(code, lang);
				const totalTime = performance.now() - start;

				expect(result.success).toBe(true);

				results[lang] = totalTime;
				console.log(
					`🔢 ${lang} array ops: ${result.executionTime}ms (total: ${totalTime.toFixed(2)}ms)`,
				);
			}

			console.log("📊 Array Operations Performance:");
			Object.entries(results)
				.sort(([, a], [, b]) => a - b)
				.forEach(([lang, time], i) =>
					console.log(`  ${i + 1}. ${lang}: ${time.toFixed(2)}ms`),
				);
		});
	});

	describe("📈 Throughput & Concurrency", () => {
		test("Concurrent execution handling", async () => {
			const code =
				'console.log("Concurrent test:", Math.random().toString(36).slice(2));';
			const concurrentRequests = 10;

			console.log(
				`🚀 Testing ${concurrentRequests} concurrent JavaScript executions...`,
			);

			const start = performance.now();
			const promises = Array.from({ length: concurrentRequests }, () =>
				sandbox.execute(code, "javascript"),
			);

			const results = await Promise.all(promises);
			const totalTime = performance.now() - start;

			// All should succeed
			results.forEach((result) => {
				expect(result.success).toBe(true);
				expect(result.output).toContain("Concurrent test:");
			});

			const avgPerRequest = totalTime / concurrentRequests;
			console.log(`📊 Concurrent Performance:`);
			console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
			console.log(`  Avg per request: ${avgPerRequest.toFixed(2)}ms`);
			console.log(`  Throughput: ${(1000 / avgPerRequest).toFixed(0)} req/sec`);

			expect(avgPerRequest).toBeLessThan(100); // Should handle concurrency well
		});

		test("Mixed language concurrent execution", async () => {
			const tests = [
				{ code: 'console.log("JS:", Date.now());', language: "javascript" },
				{ code: 'print("Python:", 123)', language: "python" },
				{
					code: 'const x: number = 456; console.log("TS:", x);',
					language: "typescript",
				},
				{ code: 'console.log("JS2:", Math.PI);', language: "javascript" },
				{ code: 'print("Python2:", "hello")', language: "python" },
			];

			console.log(`🌐 Testing ${tests.length} mixed concurrent executions...`);

			const start = performance.now();
			const promises = tests.map((test) =>
				sandbox.execute(test.code, test.language),
			);

			const results = await Promise.all(promises);
			const totalTime = performance.now() - start;

			// All should succeed
			results.forEach((result, i) => {
				expect(result.success).toBe(true);
				console.log(`  ${tests[i].language}: ${result.executionTime}ms`);
			});

			console.log(
				`📊 Mixed Concurrent Performance: ${totalTime.toFixed(2)}ms total`,
			);
		});
	});

	describe("🔥 Stress Testing", () => {
		test("Large output handling", async () => {
			const jsCode = `
                const arr = Array.from({length: 100}, (_, i) => \`Item \${i + 1}\`);
                arr.forEach(item => console.log(item));
            `;

			const pythonCode = `
for i in range(100):
    print(f"Item {i + 1}")
            `;

			const jsResult = await sandbox.execute(jsCode, "javascript");
			const pythonResult = await sandbox.execute(pythonCode, "python");

			expect(jsResult.success).toBe(true);
			expect(pythonResult.success).toBe(true);

			expect(jsResult.output.split("\n")).toHaveLength(100);
			expect(pythonResult.output.split("\n")).toHaveLength(100);

			console.log(`📊 Large Output Performance:`);
			console.log(`  JavaScript: ${jsResult.executionTime}ms`);
			console.log(`  Python: ${pythonResult.executionTime}ms`);
		});

		test("Complex computation performance", async () => {
			const complexJS = `
                function isPrime(n) {
                    if (n < 2) return false;
                    for (let i = 2; i <= Math.sqrt(n); i++) {
                        if (n % i === 0) return false;
                    }
                    return true;
                }
                
                const primes = [];
                for (let i = 2; i < 100; i++) {
                    if (isPrime(i)) primes.push(i);
                }
                console.log(\`Found \${primes.length} primes\`);
            `;

			const complexPython = `
def is_prime(n):
    if n < 2:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True

primes = [i for i in range(2, 100) if is_prime(i)]
print(f"Found {len(primes)} primes")
            `;

			const jsResult = await sandbox.execute(complexJS, "javascript");
			const pythonResult = await sandbox.execute(complexPython, "python");

			expect(jsResult.success).toBe(true);
			expect(pythonResult.success).toBe(true);
			expect(jsResult.output).toContain("Found 25 primes");
			expect(pythonResult.output).toContain("Found 25 primes");

			console.log(`📊 Complex Computation Performance:`);
			console.log(`  JavaScript: ${jsResult.executionTime}ms`);
			console.log(`  Python: ${pythonResult.executionTime}ms`);

			// Both should complete reasonably fast
			expect(jsResult.executionTime).toBeLessThan(500);
			expect(pythonResult.executionTime).toBeLessThan(500);
		});
	});

	describe("🎯 Real-World Scenarios", () => {
		test("JSON processing performance", async () => {
			const data = JSON.stringify({
				users: Array.from({ length: 50 }, (_, i) => ({
					id: i + 1,
					name: `User ${i + 1}`,
					email: `user${i + 1}@example.com`,
					age: 20 + (i % 50),
				})),
			});

			const jsCode = `
                const data = ${data};
                const adults = data.users.filter(u => u.age >= 25);
                console.log(\`Adults: \${adults.length}/\${data.users.length}\`);
            `;

			const pythonCode = `
import json
data = json.loads('${data}')
adults = [u for u in data['users'] if u['age'] >= 25]
print(f"Adults: {len(adults)}/{len(data['users'])}")
            `;

			const jsResult = await sandbox.execute(jsCode, "javascript");
			const pythonResult = await sandbox.execute(pythonCode, "python");

			expect(jsResult.success).toBe(true);
			expect(pythonResult.success).toBe(true);

			console.log(`📊 JSON Processing Performance:`);
			console.log(`  JavaScript: ${jsResult.executionTime}ms`);
			console.log(`  Python: ${pythonResult.executionTime}ms`);
		});
	});
});
