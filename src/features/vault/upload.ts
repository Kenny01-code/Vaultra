import { supabase } from "@/integrations/supabase/client";
import { MAX_FILE_BYTES, type VaultFile } from "./types";
import { setThumbnailCache } from "./useThumbnails";

export type UploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

/** Executables and dangerous script formats blocked per OWASP recommendations */
const BLOCKED_EXTENSIONS = new Set([
  "exe", "dll", "so", "bat", "cmd", "com", "cpl", "msi", "msc", "scr", "jar",
  "sh", "bash", "zsh", "ps1", "vbs", "js", "mjs", "cjs", "jse", "wsf", "wsh",
  "php", "php3", "php4", "php5", "phtml", "asp", "aspx", "jsp", "jspx",
  "cgi", "pl", "py", "rb", "app", "dmg", "pkg", "deb", "rpm", "htaccess",
  "svg", "html", "htm", "xhtml", "shtml",
]);

const BLOCKED_MIME_PATTERNS = [
  /^application\/x-(msdownload|dosexec|sh|shellscript|httpd-php)$/i,
  /^application\/(x-msdos-program|java-archive|x-executable)$/i,
  /^text\/(html|x-php|x-shellscript)$/i,
  /^image\/svg\+xml$/i,
];

export function extensionOf(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
}

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
  webp: "image/webp", avif: "image/avif", bmp: "image/bmp", ico: "image/x-icon",
  tiff: "image/tiff", tif: "image/tiff",
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", avi: "video/x-msvideo",
  mkv: "video/x-matroska", m4v: "video/mp4",
  mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", flac: "audio/flac",
  aac: "audio/aac", m4a: "audio/mp4",
  pdf: "application/pdf",
  zip: "application/zip", rar: "application/x-rar-compressed",
  "7z": "application/x-7z-compressed", tar: "application/x-tar",
  gz: "application/gzip",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain", csv: "text/csv", md: "text/markdown", json: "application/json",
  xml: "application/xml",
};

export function guessMimeFromExtension(ext: string): string {
  return MIME_MAP[ext] ?? "application/octet-stream";
}

export function sanitizeFileName(rawName: string): string {
  const base = rawName.split(/[\\/]/).pop() ?? "file";
  const cleaned = base
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/[^a-zA-Z0-9._()\-\[\]\s]+/g, "_")
    .replace(/^[._]+/, "")
    .trim();
  const safe = cleaned.length ? cleaned : "file";
  return safe.slice(0, 180);
}

export function validateFileToUpload(file: File): { safeName: string; extension: string } {
  if (!file || file.size <= 0) {
    throw new Error("File is empty or invalid.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File exceeds the 1 GB maximum limit.");
  }

  const safeName = sanitizeFileName(file.name);
  const extension = extensionOf(safeName);

  // Derive MIME from extension if browser didn't supply one
  const mimeType = file.type || guessMimeFromExtension(extension);

  if (BLOCKED_EXTENSIONS.has(extension)) {
    throw new Error(`Files with extension .${extension} are restricted for security.`);
  }

  if (BLOCKED_MIME_PATTERNS.some((p) => p.test(mimeType))) {
    throw new Error("This file MIME type is restricted for security.");
  }

  return { safeName, extension };
}

/**
 * High-speed direct client streaming upload with real-time progress and cancellation.
 */
export async function uploadVaultFile(
  file: File,
  onProgress: (progress: UploadProgress) => void,
  signal?: AbortSignal,
): Promise<VaultFile> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("You must be signed in to upload files.");
  const { safeName, extension } = validateFileToUpload(file);
  const contentType = file.type || guessMimeFromExtension(extension);
  const path = `${session.user.id}/${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;
  await tusUpload(path, file, contentType, session.access_token, onProgress, signal);
  const { data, error } = await supabase.from("files").insert({ owner_id: session.user.id, name: safeName, storage_path: path, mime_type: contentType, size_bytes: file.size }).select().single();
  if (error) { await supabase.storage.from("vault").remove([path]); throw error; }
  if (contentType.startsWith("image/")) {
    const signed = await supabase.storage.from("vault").createSignedUrl(path, 3600);
    if (signed.data?.signedUrl) setThumbnailCache(path, signed.data.signedUrl);
  }
  onProgress({ loaded: file.size, total: file.size, percent: 100 });
  return data as VaultFile;
}

async function tusUpload(path: string, file: File, contentType: string, token: string, onProgress: (p: UploadProgress) => void, signal?: AbortSignal) {
  const base = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/upload/resumable`;
  const metadata = `bucketName ${btoa("vault")},objectName ${btoa(path)},contentType ${btoa(contentType)}`;
  const created = await fetch(base, { method: "POST", headers: { authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "tus-resumable": "1.0.0", "upload-length": String(file.size), "upload-metadata": metadata, "x-upsert": "false" }, signal });
  if (!created.ok) throw new Error("Could not start resumable upload.");
  const location = created.headers.get("location");
  if (!location) throw new Error("Upload service did not return an upload URL.");
  let offset = 0; const chunkSize = 6 * 1024 * 1024;
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize);
    const response = await fetch(new URL(location, base), { method: "PATCH", headers: { authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "tus-resumable": "1.0.0", "upload-offset": String(offset), "content-type": "application/offset+octet-stream" }, body: chunk, signal });
    if (!response.ok) throw new Error("Upload failed. Please try again.");
    offset = Number(response.headers.get("upload-offset") ?? offset + chunk.size);
    onProgress({ loaded: offset, total: file.size, percent: Math.min(99, Math.round(offset / file.size * 100)) });
  }
}

export async function currentAccessToken(): Promise<string | null> {
  return (await supabase.auth.getSession()).data.session?.access_token ?? null;
}
