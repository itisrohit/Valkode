import app from "./app";
import { runnerRegistry } from "./engine/runner-registry"; // Add registry import
import { JavaScriptRunner } from "./runners/javascript";

const port = process.env.PORT || 3000;

console.log(`🚀 Valkode server starting on port ${port}`);

// Initialize runner registry
runnerRegistry.initialize().catch((error) => {
	console.error("Failed to initialize runner registry:", error);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
	console.log("Received SIGTERM, shutting down gracefully...");
	await Promise.all([
		JavaScriptRunner.shutdownPool(),
		runnerRegistry.shutdown(),
	]);
	process.exit(0);
});

process.on("SIGINT", async () => {
	console.log("Received SIGINT, shutting down gracefully...");
	await Promise.all([
		JavaScriptRunner.shutdownPool(),
		runnerRegistry.shutdown(),
	]);
	process.exit(0);
});

export default {
	port,
	fetch: app.fetch,
};
