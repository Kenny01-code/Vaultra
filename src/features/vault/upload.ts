import { createUploadTicket, discardUpload, finalizeUpload } from "@/lib/files.functions";
import { supabase } from "@/integrations/supabase/client";
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
    await putWithProgress(ticket.path, ticket.token, file, onProgress, signal);

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
  const { error } = await supabase.storage.from("vault").uploadToSignedUrl(path, token, file, {
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw error;
  onProgress({ loaded: file.size, total: file.size, percent: 99 });
}
