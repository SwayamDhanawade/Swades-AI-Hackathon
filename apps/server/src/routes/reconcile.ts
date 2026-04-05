import { db } from "@my-better-t-app/db";
import { chunks, chunkAcks } from "@my-better-t-app/db/schema";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { chunkExists } from "../lib/storage";

const app = new Hono();

app.post("/check/:chunkId", async (c) => {
  const chunkId = c.req.param("chunkId");

  const chunkResult = await db.select().from(chunks).where(eq(chunks.id, chunkId));
  const chunk = chunkResult[0];
  if (!chunk) {
    return c.json({ error: "Chunk not found" }, 404);
  }

  const ackResult = await db.select().from(chunkAcks).where(eq(chunkAcks.chunkId, chunkId));
  const ack = ackResult[0];

  const exists = await chunkExists(chunk.bucketKey);

  if (!exists && ack) {
    await db.update(chunkAcks).set({ verified: false }).where(eq(chunkAcks.chunkId, chunkId));
    return c.json({
      status: "missing",
      needsReupload: true,
      bucketKey: chunk.bucketKey,
    });
  }

  return c.json({
    status: "healthy",
    exists,
    acknowledged: !!ack,
  });
});

app.post("/repair/:sessionId", async (c) => {
  const sessionId = c.req.param("sessionId");

  const sessionChunks = await db.select().from(chunks).where(eq(chunks.sessionId, sessionId));
  const repairList: string[] = [];

  for (const chunk of sessionChunks) {
    const exists = await chunkExists(chunk.bucketKey);
    if (!exists) {
      repairList.push(chunk.id);
    }
  }

  return c.json({
    sessionId,
    chunksNeedingRepair: repairList.length,
    chunkIds: repairList,
  });
});

export default app;
