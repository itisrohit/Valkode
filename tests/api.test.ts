import { describe, test, expect } from "bun:test";
import app from "../src/app";

describe("Valkode API", () => {
  test("GET /api/v1/health returns healthy status", async () => {
    const req = new Request("http://localhost/api/v1/health");
    const res = await app.fetch(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe("ok");
  });

  test("GET /api/v1/languages returns supported languages", async () => {
    const req = new Request("http://localhost/api/v1/languages");
    const res = await app.fetch(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.data.languages).toContain("javascript");
    expect(data.data.languages).toContain("python");
  });

  test("POST /api/v1/execute - JavaScript execution", async () => {
    const req = new Request("http://localhost/api/v1/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: 'console.log("Hello Test!");',
        language: "javascript"
      })
    });
    
    const res = await app.fetch(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.output).toBe("Hello Test!");
  });

  test("POST /api/v1/execute - Empty code validation", async () => {
    const req = new Request("http://localhost/api/v1/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "",
        language: "javascript"
      })
    });
    
    const res = await app.fetch(req);
    const data = await res.json();
    
    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("Code cannot be empty");
  });

  test("POST /api/v1/execute - Security validation", async () => {
    const req = new Request("http://localhost/api/v1/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: 'require("fs");',
        language: "javascript"
      })
    });
    
    const res = await app.fetch(req);
    const data = await res.json();
    
    expect(res.status).toBe(403);
    expect(data.message).toBe("Code contains potentially dangerous operations");
  });
});