import { afterAll, beforeAll } from "bun:test";
import { runnerRegistry } from "../src/engine/runner-registry";
import { JavaScriptRunner } from "../src/runners/javascript";

// Global test setup
beforeAll(async () => {
	console.log("🧪 Setting up test environment...");
	console.log("🚀 Initializing daemonized runner registry...");

	// Initialize the new runner registry (with Python daemon)
	await runnerRegistry.initialize();

	// Give more time for Python daemons to fully initialize and warm up
	console.log("⏱️  Waiting for all workers to be ready...");
	await new Promise((resolve) => setTimeout(resolve, 5000)); // Increase to 5 seconds

	console.log("✅ Test environment ready with daemon architecture");
}); // Remove the timeout object - Bun handles this differently

// Global test cleanup
afterAll(async () => {
	console.log("🧹 Cleaning up test environment...");

	// Shutdown all systems
	await Promise.all([
		JavaScriptRunner.shutdownPool(),
		runnerRegistry.shutdown(),
	]);

	console.log("✅ Test cleanup complete");
});
