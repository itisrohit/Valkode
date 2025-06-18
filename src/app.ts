import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { executeApi } from "@/api/execute";
import { healthApi } from "@/api/health";
import { docsApi } from '@/api/docs';

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

const apiPath = "/api/v1";

// Routes
app.route(apiPath, executeApi);
app.route(apiPath, healthApi);
app.route(apiPath, docsApi);

// Root endpoint
app.get("/", (c) => {
  return c.json({
    message: "Valkode Code Execution Engine",
    version: "1.0.0",
    docs: "/api/v1/health",
  });
});

export default app;