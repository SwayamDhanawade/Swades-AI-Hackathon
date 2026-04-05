import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    CORS_ORIGIN: z.string().default("http://localhost:3001"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    BUCKET_ENDPOINT: z.string().min(1),
    BUCKET_REGION: z.string().min(1),
    BUCKET_NAME: z.string().min(1),
    BUCKET_ACCESS_KEY: z.string().min(1),
    BUCKET_SECRET_KEY: z.string().min(1),
    BUCKET_PUBLIC_URL: z.string().min(1),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
