import { Hono } from "hono";
import { asyncHandler, sendResponse } from "@/utils/apiHandler";

const docsApi = new Hono();

docsApi.get(
	"/docs",
	asyncHandler(async (c) => {
		const docs = {
			title: "Valkode Code Execution API",
			version: "1.0.0",
			endpoints: {
				"GET /api/v1/health": "Health check",
				"GET /api/v1/languages": "Get supported languages",
				"POST /api/v1/execute": "Execute code",
				"GET /api/v1/docs": "API documentation",
			},
			examples: {
				execute: {
					url: "POST /api/v1/execute",
					body: {
						code: 'console.log("Hello World!");',
						language: "javascript",
						timeout: 5000,
					},
				},
			},
			supportedLanguages: [
				"javascript",
				"js",
				"typescript",
				"ts",
				"python",
				"py",
			],
		};

		return sendResponse(c, 200, docs, "API documentation retrieved");
	}),
);

export { docsApi };
