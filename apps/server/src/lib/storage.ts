import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@my-better-t-app/env/server";

const s3 = new S3Client({
  region: env.BUCKET_REGION,
  endpoint: env.BUCKET_ENDPOINT,
  credentials: {
    accessKeyId: env.BUCKET_ACCESS_KEY,
    secretAccessKey: env.BUCKET_SECRET_KEY,
  },
  forcePathStyle: true,
});

const BUCKET_NAME = env.BUCKET_NAME;

export async function uploadChunk(key: string, data: Uint8Array): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: data,
      ContentType: "audio/wav",
    }),
  );
  return `${env.BUCKET_PUBLIC_URL}/${key}`;
}

export async function getChunk(key: string): Promise<Uint8Array | null> {
  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      }),
    );
    if (!response.Body) return null;
    const chunks: Uint8Array[] = [];
    // @ts-expect-error - Body is a streaming body
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  } catch {
    return null;
  }
}

export async function chunkExists(key: string): Promise<boolean> {
  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function generateBucketKey(sessionId: string, chunkId: string, index: number): string {
  return `sessions/${sessionId}/chunks/${chunkId}-${index}.wav`;
}
