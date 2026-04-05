const ROOT_NAME = "recordings";

async function getOrCreateRoot(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(ROOT_NAME, { create: true });
}

export async function saveChunkToOPFS(sessionId: string, chunkId: string, blob: Blob): Promise<string> {
  const root = await getOrCreateRoot();
  const sessionDir = await root.getDirectoryHandle(sessionId, { create: true });
  const fileHandle = await sessionDir.getFileHandle(`${chunkId}.wav`, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
  return `${sessionId}/${chunkId}.wav`;
}

export async function getChunkFromOPFS(sessionId: string, chunkId: string): Promise<Blob | null> {
  try {
    const root = await getOrCreateRoot();
    const sessionDir = await root.getDirectoryHandle(sessionId);
    const fileHandle = await sessionDir.getFileHandle(`${chunkId}.wav`);
    const file = await fileHandle.getFile();
    return file;
  } catch {
    return null;
  }
}

export async function getPendingChunks(sessionId: string): Promise<string[]> {
  try {
    const root = await getOrCreateRoot();
    const sessionDir = await root.getDirectoryHandle(sessionId);
    const chunkIds: string[] = [];
    for await (const [name] of sessionDir.entries()) {
      if (name.endsWith(".wav")) {
        chunkIds.push(name.replace(".wav", ""));
      }
    }
    return chunkIds;
  } catch {
    return [];
  }
}

export async function deleteChunkFromOPFS(sessionId: string, chunkId: string): Promise<void> {
  try {
    const root = await getOrCreateRoot();
    const sessionDir = await root.getDirectoryHandle(sessionId);
    await sessionDir.removeEntry(`${chunkId}.wav`);
  } catch {
    // Ignore errors
  }
}

export async function clearSessionFromOPFS(sessionId: string): Promise<void> {
  try {
    const root = await getOrCreateRoot();
    await root.removeEntry(sessionId, { recursive: true });
  } catch {
    // Ignore errors
  }
}

export async function computeChecksum(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
