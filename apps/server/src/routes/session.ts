import { db } from "@my-better-t-app/db";
import { sessions } from "@my-better-t-app/db/schema";
import { Hono } from "hono";
import { eq } from "drizzle-orm";

const app = new Hono();

app.post("/", async (c) => {
  const body = await c.req.json();
  const result = await db
    .insert(sessions)
    .values({
      deviceId: body.deviceId,
      status: "active",
    })
    .returning();

  const session = result[0];
  if (!session) {
    return c.json({ error: "Failed to create session" }, 500);
  }
  return c.json({ sessionId: session.id });
});

app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await db.select().from(sessions).where(eq(sessions.id, id));
  const session = result[0];
  if (!session) {
    return c.json({ error: "Session not found" }, 404);
  }
  return c.json(session);
});

app.post("/:id/complete", async (c) => {
  const id = c.req.param("id");
  await db.update(sessions).set({ status: "completed" }).where(eq(sessions.id, id));
  return c.json({ success: true });
});

export default app;
