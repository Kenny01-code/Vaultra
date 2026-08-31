// Server-only validation helpers — no Firebase, no Supabase imports here.
// Pure functions only; safe to import from any server function.

export const MAX_FILE_BYTES = 1024 * 1024 * 1024; // 1 GB per file
export const DEFAULT_QUOTA_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB per account
export const VAULT_BUCKET = "vault";

/** Executables / server-interpretable types rejected outright (OWASP file upload). */
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

/** Strips paths, control characters and traversal sequences from a display name. */
export function sanitizeFileName(rawName: string): string {
  const base = rawName.split(/[\\\/]/).pop() ?? "file";
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

export type UploadIntent = { name: string; sizeBytes: number; mimeType: string };

export function validateUploadIntent({ name, sizeBytes, mimeType }: UploadIntent): {
  safeName: string;
  extension: string;
} {
  const safeName = sanitizeFileName(name);
  const extension = extensionOf(safeName);

  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error("File appears to be empty.");
  }
  if (sizeBytes > MAX_FILE_BYTES) {
    throw new Error("File is larger than the 1 GB per-file limit.");
  }
  if (BLOCKED_EXTENSIONS.has(extension)) {
    throw new Error(`Files of type ".${extension}" are not allowed for security reasons.`);
  }
  if (BLOCKED_MIME_PATTERNS.some((p) => p.test(mimeType))) {
    throw new Error("This file type is not allowed for security reasons.");
  }
  return { safeName, extension };
}

/** Storage keys are always namespaced by owner id so RLS enforces ownership. */
export function buildStoragePath(userId: string, extension: string): string {
  const id = crypto.randomUUID();
  return extension ? `${userId}/${id}.${extension}` : `${userId}/${id}`;
}

export function assertOwnedPath(userId: string, path: string): void {
  if (!path.startsWith(`${userId}/`) || path.includes("..")) {
    throw new Error("Forbidden: storage path does not belong to this account.");
  }
}
