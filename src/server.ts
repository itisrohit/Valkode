import app from "./app";
import { JavaScriptRunner } from "./runners/javascript";

const port = process.env.PORT || 3000;

console.log(`🚀 Valkode server starting on port ${port}`);

// Graceful shutdown
process.on("SIGTERM", async () => {
	console.log("Received SIGTERM, shutting down gracefully...");
	await JavaScriptRunner.shutdownPool();
	process.exit(0);
});

process.on("SIGINT", async () => {
	console.log("Received SIGINT, shutting down gracefully...");
	await JavaScriptRunner.shutdownPool();
	process.exit(0);
});

export default {
	port,
	fetch: app.fetch,
};
