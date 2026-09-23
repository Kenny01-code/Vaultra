import { useRef, useState } from "react";
import {
  CheckCircle2, CloudUpload, FileAudio, FileImage,
  FileText, FileVideo, File as FileIcon,
  Loader2, RotateCcw, WifiOff, X, Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useUploadStore } from "@/hooks/useUploadStore";

const MAX_FILES_PER_BATCH = 10;

function mimeIcon(file: File) {
  const t = file.type;
  if (t.startsWith("image/")) return FileImage;
  if (t.startsWith("video/")) return FileVideo;
  if (t.startsWith("audio/")) return FileAudio;
  if (t.startsWith("text/") || t.includes("pdf") || t.includes("document")) return FileText;
  return FileIcon;
}

function formatEta(remainingBytes: number, bytesPerSec: number): string {
  if (bytesPerSec <= 0) return "";
  const secs = Math.ceil(remainingBytes / bytesPerSec);
  if (secs < 60) return `${secs}s left`;
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  return `${mins}m ${s}s left`;
}

function formatSpeed(bps: number): string {
  if (bps <= 0) return "";
  return `${formatBytes(bps)}/s`;
}

export function UploadPanel({
  inputRef,
  onUploaded,
  usedBytes = 0,
  quotaBytes = 5 * 1024 * 1024 * 1024,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onUploaded: () => void;
  usedBytes?: number;
  quotaBytes?: number;
}) {
  const { items, isOnline, startUpload, cancelItem } = useUploadStore();
  const [dragging, setDragging] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList);
    if (files.length > MAX_FILES_PER_BATCH) toast.error(`Max ${MAX_FILES_PER_BATCH} files at once.`);
    for (const file of files.slice(0, MAX_FILES_PER_BATCH)) {
      void startUpload(file, undefined, { usedBytes, quotaBytes, onUploaded });
    }
  };

  const uploading = items.filter(
    (i) => i.status === "uploading" || i.status === "finalizing" || i.status === "queued" || i.status === "draft",
  );
  const totalPercent = uploading.length
    ? Math.round(uploading.reduce((s, i) => s + i.percent, 0) / uploading.length)
    : 0;

  return (
    <section aria-label="Upload files">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />

      {/* Offline notice */}
      {!isOnline && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-xs text-amber-300">
          <WifiOff className="size-3.5 shrink-0" />
          <span>Offline — files will be saved as drafts and uploaded when you reconnect</span>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        className={cn(
          "glass flex flex-col items-center gap-3 rounded-3xl border-dashed p-6 sm:p-7 text-center transition-all duration-300 cursor-pointer",
          dragging
            ? "border-primary bg-surface-2 scale-[1.02] shadow-[var(--shadow-glow)]"
            : "border-border hover:border-primary/40 hover:bg-surface/60",
        )}
        onClick={() => inputRef.current?.click()}
      >
        <span className={cn(
          "grid size-12 place-items-center rounded-2xl transition-all duration-300",
          dragging ? "bg-primary scale-110 shadow-[var(--shadow-glow)]" : "bg-brand shadow-[var(--shadow-glow)]",
        )}>
          <CloudUpload className="size-6 text-primary-foreground" aria-hidden="true" />
        </span>
        <div>
          <p className="font-display text-sm font-semibold">
            {dragging ? "Release to upload" : "Drop files or click to browse"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isOnline
              ? "Videos, images, audio, docs up to 1 GB · max 10 files"
              : "Offline — files saved as drafts until reconnected"}
          </p>
        </div>
        {uploading.length > 0 && (
          <div className="flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1">
            <Zap className="size-3 text-primary animate-pulse" />
            <span className="font-mono text-[11px] text-muted-foreground">
              {uploading.length} {isOnline ? "uploading" : "queued"} · {totalPercent}%
            </span>
          </div>
        )}
      </div>

      {/* Upload items */}
      {items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {items.map((item) => {
            const Icon = mimeIcon(item.fileRef);
            const remaining = item.size - item.loaded;
            const eta = item.status === "uploading" && item.bytesPerSec > 0
              ? formatEta(remaining, item.bytesPerSec) : "";
            const speed = item.status === "uploading" && item.bytesPerSec > 0
              ? formatSpeed(item.bytesPerSec) : "";

            return (
              <li
                key={item.id}
                className="glass rounded-2xl p-3 shadow-[var(--shadow-card)]"
                style={{ animation: "var(--animate-fade-up)" }}
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-xl",
                    item.status === "completed" ? "bg-emerald-500/15" :
                    item.status === "error" ? "bg-destructive/15" :
                    item.status === "draft" ? "bg-amber-500/15" : "bg-surface-2",
                  )}>
                    {item.status === "uploading" || item.status === "queued" ? (
                      <Loader2 className="size-4 animate-spin text-primary" />
                    ) : item.status === "finalizing" ? (
                      <Loader2 className="size-4 animate-spin text-primary opacity-60" />
                    ) : item.status === "completed" ? (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    ) : item.status === "draft" ? (
                      <WifiOff className="size-4 text-amber-400" />
                    ) : (
                      <Icon className="size-4 text-muted-foreground" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium" title={item.name}>{item.name}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {item.status === "queued" && "Preparing…"}
                      {item.status === "draft" && (
                        <span className="text-amber-400">Saved as draft — waiting for connection</span>
                      )}
                      {item.status === "uploading" && (
                        <>
                          {formatBytes(item.loaded)} / {formatBytes(item.size)}
                          {speed && <span className="ml-2 text-primary">{speed}</span>}
                          {eta && <span className="ml-2">{eta}</span>}
                        </>
                      )}
                      {item.status === "finalizing" && "Securing in vault…"}
                      {item.status === "completed" && `${formatBytes(item.size)} · secured`}
                      {item.status === "error" && (
                        <span className="text-destructive">{item.error}</span>
                      )}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {item.status === "draft" && isOnline && (
                      <button
                        className="focus-ring rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
                        title="Upload now"
                        onClick={() => void startUpload(item.fileRef, item.id, { usedBytes, quotaBytes, onUploaded })}
                      >
                        <RotateCcw className="size-3.5" />
                      </button>
                    )}
                    {item.status === "error" && (
                      <button
                        className="focus-ring rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
                        title="Retry"
                        onClick={() => void startUpload(item.fileRef, item.id, { usedBytes, quotaBytes, onUploaded })}
                      >
                        <RotateCcw className="size-3.5" />
                      </button>
                    )}
                    <button
                      className="focus-ring rounded-lg p-1.5 text-muted-foreground hover:text-destructive"
                      title={item.status === "uploading" ? "Cancel" : item.status === "draft" ? "Discard draft" : "Dismiss"}
                      onClick={() => cancelItem(item)}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>

                {item.status !== "error" && item.status !== "draft" && (
                  <div className="mt-2.5 space-y-1">
                    <Progress
                      value={item.percent}
                      className={cn(
                        "h-1.5 transition-all",
                        item.status === "completed" && "[&>div]:bg-emerald-500",
                        item.status === "finalizing" && "[&>div]:animate-pulse",
                      )}
                    />
                    {item.status === "uploading" && (
                      <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                        <span>{item.percent}%</span>
                        <span>{formatBytes(item.size)}</span>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {items.length > 0 && (
        <Button
          variant="glass"
          size="sm"
          className="mt-2 w-full gap-2 text-xs"
          onClick={() => inputRef.current?.click()}
        >
          <CloudUpload className="size-3.5" /> Add more files
        </Button>
      )}
    </section>
  );
}
