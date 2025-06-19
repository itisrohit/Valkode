import { Hono } from "hono";
import { runnerRegistry } from "@/engine/runner-registry";
import { JavaScriptRunner } from "@/runners/javascript";
import { asyncHandler, sendResponse } from "@/utils/apiHandler";

const healthApi = new Hono();

healthApi.get(
	"/health",
	asyncHandler(async (c) => {
		const healthData = {
			status: "ok",
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			service: "valkode-executor",
			processPool: JavaScriptRunner.getPoolStats(),
			runners: runnerRegistry.getAllStats(),
		};

		return sendResponse(c, 200, healthData, "Service is healthy");
	}),
);

export { healthApi };
