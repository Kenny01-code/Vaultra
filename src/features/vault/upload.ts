import { createUploadTicket, discardUpload, finalizeUpload } from "@/lib/files.functions";
import { supabase } from "@/integrations/supabase/client";
import type { VaultFile } from "./types";
import { setThumbnailCache } from "./useThumbnails";

export type UploadProgress = {
  loaded: number;
  total: number;
  percent: number;
  bytesPerSec?: number;
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
  let ticket: Awaited<ReturnType<typeof createUploadTicket>>;
  try {
    ticket = await createUploadTicket({
      data: {
        name: file.name,
        sizeBytes: file.size,
        mimeType: file.type || "application/octet-stream",
      },
    });
  } catch (error) {
    throw new Error(`Upload ticket failed: ${getErrorMessage(error)}`);
  }

  let row: VaultFile;
  try {
    // Step 2 — PUT directly to Supabase Storage with progress tracking
    try {
      await putWithProgress(ticket.path, ticket.token, file, onProgress, signal);
    } catch (error) {
      throw new Error(`Storage transfer failed: ${getErrorMessage(error)}`);
    }

    // Step 3 — server verifies the object and creates the DB record with real size
    try {
      row = (await finalizeUpload({
        data: {
          path: ticket.path,
          name: ticket.safeName,
          mimeType: file.type || "application/octet-stream",
        },
      })) as VaultFile;
    } catch (error) {
      throw new Error(`Upload finalization failed: ${getErrorMessage(error)}`);
    }
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  return "Unknown upload error.";
}

function putWithProgress(
  path: string,
  token: string,
  file: File,
  onProgress: (p: UploadProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  return putWithSdk(path, token, file, onProgress, signal);
}

async function putWithSdk(
  path: string,
  token: string,
  file: File,
  onProgress: (progress: UploadProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (signal?.aborted) throw new DOMException("Upload cancelled.", "AbortError");

  // Get the signed upload URL from Supabase so we can PUT with real XHR progress
  const { data: signedData, error: signedError } = await supabase.storage
    .from("vault")
    .createSignedUploadUrl(path);
  if (signedError) throw signedError;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let lastLoaded = 0;
    let lastTime = Date.now();

    xhr.upload.addEventListener("progress", (e) => {
      if (!e.lengthComputable) return;
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      const dl = e.loaded - lastLoaded;
      lastLoaded = e.loaded;
      lastTime = now;
      const bytesPerSec = dt > 0 ? dl / dt : 0;
      const percent = Math.min(99, Math.round((e.loaded / e.total) * 100));
      onProgress({ loaded: e.loaded, total: e.total, percent, bytesPerSec });
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Storage upload failed: HTTP ${xhr.status}`));
    });
    xhr.addEventListener("error", () => reject(new Error("Network error during upload.")));
    xhr.addEventListener("abort", () => reject(new DOMException("Upload cancelled.", "AbortError")));

    signal?.addEventListener("abort", () => xhr.abort());

    xhr.open("PUT", signedData.signedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.send(file);
  });
}
