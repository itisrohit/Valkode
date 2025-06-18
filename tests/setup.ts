import { afterAll, beforeAll } from "bun:test";
import { JavaScriptRunner } from "../src/runners/javascript";

// Global test setup
beforeAll(async () => {
	console.log("🧪 Setting up test environment...");

	// Give process pool time to initialize
	await new Promise((resolve) => setTimeout(resolve, 2000));

	console.log("✅ Test environment ready");
});

// Global test cleanup
afterAll(async () => {
	console.log("🧹 Cleaning up test environment...");

	// Shutdown process pool
	await JavaScriptRunner.shutdownPool();

	console.log("✅ Test cleanup complete");
});
