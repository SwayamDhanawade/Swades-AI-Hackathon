import { db } from "@my-better-t-app/db";
import { chunks, chunkAcks, sessions } from "@my-better-t-app/db/schema";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { uploadChunk, generateBucketKey, chunkExists } from "../lib/storage";

const app = new Hono();

app.post("/upload", async (c) => {
  const body = await c.req.arrayBuffer();
  const sessionId = c.req.header("x-session-id");
  const chunkId = c.req.header("x-chunk-id");
  const chunkIndex = c.req.header("x-chunk-index");
  const checksum = c.req.header("x-checksum");

  if (!sessionId || !chunkId || !chunkIndex || !checksum) {
    return c.json({ error: "Missing required headers" }, 400);
  }

  const index = Number.parseInt(chunkIndex, 10);
  const bucketKey = generateBucketKey(sessionId, chunkId, index);

  try {
    const uploadResult = await uploadChunk(bucketKey, new Uint8Array(body));

    const insertedChunks = await db
      .insert(chunks)
      .values({
        id: chunkId,
        sessionId,
        chunkIndex: index,
        size: body.byteLength,
        checksum,
        bucketKey,
      })
      .onConflictDoUpdate({
        target: chunks.id,
        set: {
          size: body.byteLength,
          checksum,
        },
      })
      .returning();

    const chunk = insertedChunks[0];
    if (!chunk) {
      return c.json({ error: "Failed to insert chunk" }, 500);
    }

    await db.insert(chunkAcks).values({
      chunkId: chunk.id,
      verified: true,
    });

    await db
      .update(sessions)
      .set({ totalChunks: sessions.totalChunks })
      .where(eq(sessions.id, sessionId));

    return c.json({
      success: true,
      chunkId: chunk.id,
      url: uploadResult,
    });
  } catch (error) {
    console.error("Upload failed:", error);
    return c.json({ error: "Upload failed" }, 500);
  }
});

app.get("/status/:chunkId", async (c) => {
  const chunkId = c.req.param("chunkId");
  const [ack] = await db.select().from(chunkAcks).where(eq(chunkAcks.chunkId, chunkId));
  if (!ack) {
    return c.json({ status: "pending" });
  }
  return c.json({ status: "acknowledged", uploadedAt: ack.uploadedAt });
});

app.post("/verify/:sessionId", async (c) => {
  const sessionId = c.req.param("sessionId");
  const sessionChunks = await db
    .select()
    .from(chunks)
    .where(eq(chunks.sessionId, sessionId));

  const missing: string[] = [];

  for (const chunk of sessionChunks) {
    const exists = await chunkExists(chunk.bucketKey);
    if (!exists) {
      missing.push(chunk.id);
    }
  }

  return c.json({
    totalChunks: sessionChunks.length,
    missing,
    healthy: missing.length === 0,
  });
});

export default app;
