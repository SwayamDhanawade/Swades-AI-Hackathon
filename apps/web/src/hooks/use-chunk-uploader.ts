import { useCallback, useRef, useState } from "react";

export interface UploadStatus {
  chunkId: string;
  status: "pending" | "uploading" | "acknowledged" | "failed";
  retries: number;
}

export interface UseChunkUploaderOptions {
  apiBaseUrl?: string;
  maxRetries?: number;
  onChunkAcknowledged?: (chunkId: string) => void;
  onChunkFailed?: (chunkId: string, error: Error) => void;
}

export function useChunkUploader(options: UseChunkUploaderOptions = {}) {
  const {
    apiBaseUrl = "/api",
    maxRetries = 3,
    onChunkAcknowledged,
    onChunkFailed,
  } = options;

  const [uploadStatuses, setUploadStatuses] = useState<Map<string, UploadStatus>>(new Map());
  const sessionIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const createSession = useCallback(async (deviceId?: string): Promise<string> => {
    const res = await fetch(`${apiBaseUrl}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    });
    const { sessionId } = await res.json();
    sessionIdRef.current = sessionId;
    abortControllerRef.current = new AbortController();
    return sessionId;
  }, [apiBaseUrl]);

  const uploadChunk = useCallback(
    async (chunkId: string, blob: Blob, chunkIndex: number): Promise<boolean> => {
      if (!sessionIdRef.current) {
        throw new Error("No session created");
      }

      setUploadStatuses((prev) => {
        const next = new Map(prev);
        next.set(chunkId, { chunkId, status: "uploading", retries: 0 });
        return next;
      });

      const checksum = await computeChecksum(blob);
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const res = await fetch(`${apiBaseUrl}/chunks/upload`, {
            method: "POST",
            headers: {
              "x-session-id": sessionIdRef.current,
              "x-chunk-id": chunkId,
              "x-chunk-index": String(chunkIndex),
              "x-checksum": checksum,
            },
            body: await blob.arrayBuffer(),
            signal: abortControllerRef.current?.signal,
          });

          if (!res.ok) {
            throw new Error(`Upload failed: ${res.status}`);
          }

          setUploadStatuses((prev) => {
            const next = new Map(prev);
            next.set(chunkId, { chunkId, status: "acknowledged", retries: attempt });
            return next;
          });

          onChunkAcknowledged?.(chunkId);
          return true;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (err instanceof Error && err.name === "AbortError") {
            throw err;
          }
        }
      }

      setUploadStatuses((prev) => {
        const next = new Map(prev);
        const current = next.get(chunkId);
        next.set(chunkId, {
          chunkId,
          status: "failed",
          retries: current?.retries ?? maxRetries,
        });
        return next;
      });

      onChunkFailed?.(chunkId, lastError!);
      return false;
    },
    [apiBaseUrl, maxRetries, onChunkAcknowledged, onChunkFailed],
  );

  const uploadChunkFromOPFS = useCallback(
    async (chunkId: string, chunkIndex: number): Promise<boolean> => {
      if (!sessionIdRef.current) {
        throw new Error("No session created");
      }

      const blob = await getChunkFromOPFS(sessionIdRef.current, chunkId);
      if (!blob) {
        throw new Error(`Chunk ${chunkId} not found in OPFS`);
      }

      return uploadChunk(chunkId, blob, chunkIndex);
    },
    [uploadChunk],
  );

  const checkChunkStatus = useCallback(
    async (chunkId: string): Promise<"pending" | "acknowledged"> => {
      const res = await fetch(`${apiBaseUrl}/chunks/status/${chunkId}`);
      const { status } = await res.json();
      return status;
    },
    [apiBaseUrl],
  );

  const verifySession = useCallback(
    async (sessionId: string): Promise<{ healthy: boolean; missing: string[] }> => {
      const res = await fetch(`${apiBaseUrl}/chunks/verify/${sessionId}`);
      return res.json();
    },
    [apiBaseUrl],
  );

  const completeSession = useCallback(async (): Promise<void> => {
    if (!sessionIdRef.current) return;
    await fetch(`${apiBaseUrl}/session/${sessionIdRef.current}/complete`, {
      method: "POST",
    });
    sessionIdRef.current = null;
    abortControllerRef.current = null;
  }, [apiBaseUrl]);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    uploadStatuses: Object.fromEntries(uploadStatuses),
    createSession,
    uploadChunk,
    uploadChunkFromOPFS,
    checkChunkStatus,
    verifySession,
    completeSession,
    abort,
    sessionId: sessionIdRef.current,
  };
}

async function computeChecksum(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getChunkFromOPFS(sessionId: string, chunkId: string): Promise<Blob | null> {
  try {
    const root = await navigator.storage.getDirectory();
    const sessionDir = await root.getDirectoryHandle("recordings");
    const dir = await sessionDir.getDirectoryHandle(sessionId);
    const fileHandle = await dir.getFileHandle(`${chunkId}.wav`);
    const file = await fileHandle.getFile();
    return file;
  } catch {
    return null;
  }
}
