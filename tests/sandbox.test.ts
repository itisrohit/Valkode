import { describe, expect, test } from "bun:test";
import { Sandbox } from "../src/engine/sandbox";
import { ApiError } from "../src/utils/apiHandler";

describe("Sandbox", () => {
	const sandbox = new Sandbox();

	test("JavaScript execution works", async () => {
		const result = await sandbox.execute('console.log("Hello");', "javascript");

		expect(result.success).toBe(true);
		expect(result.output).toBe("Hello");
		expect(result.executionTime).toBeGreaterThan(0);
	});

	test("Python execution works", async () => {
		const result = await sandbox.execute('print("Hello Python")', "python");

		expect(result.success).toBe(true);
		expect(result.output).toBe("Hello Python");
	});

	test("Unsupported language throws ApiError", async () => {
		try {
			await sandbox.execute('print("test")', "unsupported");
			expect(true).toBe(false); // Should not reach here
		} catch (error) {
			expect(error).toBeInstanceOf(ApiError);
			expect((error as ApiError).statusCode).toBe(400);
		}
	});

	test("Empty code throws ApiError", async () => {
		try {
			await sandbox.execute("", "javascript");
			expect(true).toBe(false); // Should not reach here
		} catch (error) {
			expect(error).toBeInstanceOf(ApiError);
			expect((error as ApiError).statusCode).toBe(400);
		}
	});

	test("Security validation works", async () => {
		try {
			// With isolated-vm, require is simply not available, so this will throw a ReferenceError
			await sandbox.execute('require("fs");', "javascript");
			expect(true).toBe(false); // Should not reach here
		} catch (error) {
			expect(error).toBeInstanceOf(ApiError);
			// isolated-vm will return a 400 error because require is not defined
			expect((error as ApiError).statusCode).toBe(400);
			expect((error as ApiError).message).toContain("require is not defined");
		}
	});
});
