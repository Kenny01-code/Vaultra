import { createUploadTicket, discardUpload, finalizeUpload } from "@/lib/files.functions";
import type { VaultFile } from "./types";
import { setThumbnailCache } from "./useThumbnails";

export type UploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

/**
 * Secure upload flow:
 * 1. Call createUploadTicket (server) — validates type/size/quota, returns signed PUT URL
 * 2. PUT file directly to Supabase Storage via the signed URL (no server bandwidth)
 * 3. Call finalizeUpload (server) — verifies object exists, reads real size, creates DB record
 */
export async function uploadVaultFile(
  file: File,
  onProgress: (progress: UploadProgress) => void,
  signal?: AbortSignal,
): Promise<VaultFile> {
  // Step 1 — server validates and issues a signed upload URL
  const ticket = await createUploadTicket({
    data: {
      name: file.name,
      sizeBytes: file.size,
      mimeType: file.type || "application/octet-stream",
    },
  });

  let row: VaultFile;
  try {
    // Step 2 — PUT directly to Supabase Storage with progress tracking
    await putWithProgress(ticket.signedUrl, file, onProgress, signal);

    // Step 3 — server verifies the object and creates the DB record with real size
    row = (await finalizeUpload({
      data: {
        path: ticket.path,
        name: ticket.safeName,
        mimeType: file.type || "application/octet-stream",
      },
    })) as VaultFile;
  } catch (error) {
    // Best-effort cleanup for cancelled uploads and failed finalization.
    await discardUpload({ data: { path: ticket.path } }).catch(() => undefined);
    throw error;
  }

  // Cache thumbnail URL for images so the vault grid shows them immediately
  if (file.type.startsWith("image/")) {
    const objectUrl = URL.createObjectURL(file);
    setThumbnailCache(ticket.path, objectUrl);
  }

  onProgress({ loaded: file.size, total: file.size, percent: 100 });
  return row;
}

function putWithProgress(
  url: string,
  file: File,
  onProgress: (p: UploadProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let lastProgressAt = 0;
    let pendingProgress: UploadProgress | undefined;
    let progressTimer: number | undefined;

    const flushProgress = () => {
      progressTimer = undefined;
      if (pendingProgress) {
        onProgress(pendingProgress);
        pendingProgress = undefined;
        lastProgressAt = performance.now();
      }
    };

    const reportProgress = (progress: UploadProgress) => {
      pendingProgress = progress;
      const elapsed = performance.now() - lastProgressAt;
      if (elapsed >= 80) {
        flushProgress();
      } else if (progressTimer === undefined) {
        progressTimer = window.setTimeout(flushProgress, 80 - elapsed);
      }
    };

    const clearProgressTimer = () => {
      if (progressTimer !== undefined) window.clearTimeout(progressTimer);
    };

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        reportProgress({
          loaded: e.loaded,
          total: e.total,
          percent: Math.min(99, Math.round((e.loaded / e.total) * 100)),
        });
      }
    });

    xhr.addEventListener("load", () => {
      clearProgressTimer();
      if (xhr.status >= 200 && xhr.status < 300) {
        if (pendingProgress) onProgress(pendingProgress);
        resolve();
      } else {
        reject(new Error(`Upload failed (HTTP ${xhr.status}). Please try again.`));
      }
    });

    xhr.addEventListener("error", () => {
      clearProgressTimer();
      reject(new Error("Upload failed. Check your connection."));
    });
    xhr.addEventListener("abort", () => {
      clearProgressTimer();
      reject(new DOMException("Upload cancelled.", "AbortError"));
    });

    signal?.addEventListener("abort", () => xhr.abort());

    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.send(file);
  });
}
