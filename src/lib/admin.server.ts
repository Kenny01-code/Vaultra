export function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function buildDailySeries(
  rows: { created_at: string; size_bytes: number | string }[],
  days = 14,
): { date: string; uploads: number; bytes: number }[] {
  const buckets = new Map<string, { uploads: number; bytes: number }>();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(Date.now() - index * 86_400_000).toISOString().slice(0, 10);
    buckets.set(date, { uploads: 0, bytes: 0 });
  }
  for (const row of rows) {
    const key = dayKey(row.created_at);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.uploads += 1;
    bucket.bytes += Number(row.size_bytes ?? 0);
  }
  return [...buckets.entries()].map(([date, value]) => ({ date, ...value }));
}

export function kindOf(mimeType: string): string {
  const mime = (mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return "Images";
  if (mime.startsWith("video/")) return "Video";
  if (mime.startsWith("audio/")) return "Audio";
  if (mime === "application/pdf") return "PDF";
  if (mime.startsWith("text/") || mime.includes("json") || mime.includes("csv")) return "Text";
  if (mime.includes("zip") || mime.includes("compressed") || mime.includes("tar"))
    return "Archives";
  return "Other";
}

export function groupByKind(
  rows: { mime_type: string; size_bytes: number | string }[],
): { kind: string; files: number; bytes: number }[] {
  const map = new Map<string, { files: number; bytes: number }>();
  for (const row of rows) {
    const kind = kindOf(row.mime_type);
    const entry = map.get(kind) ?? { files: 0, bytes: 0 };
    entry.files += 1;
    entry.bytes += Number(row.size_bytes ?? 0);
    map.set(kind, entry);
  }
  return [...map.entries()]
    .map(([kind, value]) => ({ kind, ...value }))
    .sort((a, b) => b.bytes - a.bytes);
}
