import { Hono } from "hono";
import { CodeExecutor } from "@/engine/executor";
import type { ExecutionRequest } from "@/types/execution";
import {
	ApiError,
	asyncHandler,
	sendResponse,
	validateRequest,
} from "@/utils/apiHandler";

const executeApi = new Hono();
const executor = new CodeExecutor();

// Validator for execution request
const isExecutionRequest = (data: unknown): data is ExecutionRequest => {
	if (typeof data !== "object" || data === null) {
		throw new ApiError(400, "Request body must be a JSON object");
	}

	const obj = data as Record<string, unknown>;

	if (!obj.code) {
		throw new ApiError(400, "Code cannot be empty");
	}

	if (!obj.language) {
		throw new ApiError(400, "Missing required field: language");
	}

	if (typeof obj.code !== "string") {
		throw new ApiError(400, 'Field "code" must be a string');
	}

	if (typeof obj.language !== "string") {
		throw new ApiError(400, 'Field "language" must be a string');
	}

	return true;
};

executeApi.post(
	"/execute",
	asyncHandler(async (c) => {
		const body = await c.req.json();
		const request = validateRequest(body, isExecutionRequest);

		// Log execution
		console.log(
			`[EXECUTE] Language: ${request.language}, Code length: ${request.code.length}`,
		);

		const result = await executor.execute(request);

		console.log(
			`[RESULT] Success: ${result.success}, Time: ${result.executionTime}ms`,
		);

		return sendResponse(c, 200, result, "Code executed successfully");
	}),
);

executeApi.get(
	"/languages",
	asyncHandler(async (c) => {
		const languages = executor.getSupportedLanguages();

		return sendResponse(c, 200, { languages }, "Supported languages retrieved");
	}),
);

export { executeApi };
