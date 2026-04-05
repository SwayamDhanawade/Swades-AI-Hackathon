import { pgTable, text, timestamp, bigint, boolean, uuid, index } from "drizzle-orm/pg-core";

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    deviceId: text("device_id"),
    totalChunks: bigint("total_chunks", { mode: "number" }).default(0).notNull(),
    status: text("status", { enum: ["active", "completed", "failed"] }).default("active").notNull(),
  },
  (t) => [index("sessions_created_at_idx").on(t.createdAt)],
);

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").primaryKey(),
    sessionId: uuid("session_id")
      .references(() => sessions.id, { onDelete: "cascade" })
      .notNull(),
    chunkIndex: bigint("chunk_index", { mode: "number" }).notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    checksum: text("checksum").notNull(),
    bucketKey: text("bucket_key").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("chunks_session_id_idx").on(t.sessionId),
    index("chunks_bucket_key_idx").on(t.bucketKey),
  ],
);

export const chunkAcks = pgTable(
  "chunk_acks",
  {
    chunkId: uuid("chunk_id")
      .references(() => chunks.id, { onDelete: "cascade" })
      .primaryKey(),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
    retryCount: bigint("retry_count", { mode: "number" }).default(0).notNull(),
    verified: boolean("verified").default(false).notNull(),
  },
  (t) => [index("chunk_acks_uploaded_at_idx").on(t.uploadedAt)],
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Chunk = typeof chunks.$inferSelect;
export type NewChunk = typeof chunks.$inferInsert;
export type ChunkAck = typeof chunkAcks.$inferSelect;
export type NewChunkAck = typeof chunkAcks.$inferInsert;
