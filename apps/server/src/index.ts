import { env } from "@my-better-t-app/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import sessionRoute from "./routes/session";
import chunksRoute from "./routes/chunks";
import reconcileRoute from "./routes/reconcile";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

app.get("/", (c) => {
  return c.text("OK");
});

app.route("/api/session", sessionRoute);
app.route("/api/chunks", chunksRoute);
app.route("/api/reconcile", reconcileRoute);

const port = 3000;

console.log(`Server running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
