import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2, CloudUpload, FileAudio, FileImage,
  FileText, FileVideo, File as FileIcon,
  Loader2, RotateCcw, WifiOff, X, Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { uploadVaultFile, type UploadProgress } from "@/features/vault/upload";
import { MAX_FILE_BYTES } from "@/features/vault/types";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteDraft, listDrafts, saveDraft } from "@/lib/offline-db";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const MAX_FILES_PER_BATCH = 10;

type Item = {
  id: string;
  name: string;
  size: number;
  loaded: number;
  percent: number;
  bytesPerSec: number;
  status: "queued" | "uploading" | "finalizing" | "completed" | "error" | "draft";
  error?: string;
  controller?: AbortController;
  fileRef: File;
  startedAt?: number;
  isDraft?: boolean;
};

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
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const activeCount = useRef(0);
  const isOnline = useOnlineStatus();

  // Restore drafts from IndexedDB on mount
  useEffect(() => {
    void listDrafts().then((drafts) => {
      if (!drafts.length) return;
      const restored: Item[] = drafts.map((d) => ({
        id: d.id,
        name: d.name,
        size: d.sizeBytes,
        loaded: 0,
        percent: 0,
        bytesPerSec: 0,
        status: "draft" as const,
        fileRef: new File([d.blob], d.name, { type: d.mimeType }),
        isDraft: true,
      }));
      setItems(restored);
      if (restored.length) toast.info(`${restored.length} draft upload${restored.length > 1 ? "s" : ""} restored`);
    });
  }, []);

  const update = (id: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const startUpload = useCallback(
    async (file: File, existingId?: string) => {
      const id = existingId ?? `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`;
      const controller = new AbortController();

      if (!existingId) {
        // Save as draft in IndexedDB immediately so it survives navigation
        await saveDraft({ id, name: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size, blob: file, savedAt: new Date().toISOString() }).catch(() => undefined);
        setItems((prev) => [
          ...prev,
          {
            id, name: file.name, size: file.size,
            loaded: 0, percent: 0, bytesPerSec: 0,
            status: "queued", controller, fileRef: file, isDraft: true,
          },
        ]);
      } else {
        update(id, { status: "queued", error: undefined, percent: 0, loaded: 0, bytesPerSec: 0, controller });
      }

      // If offline, keep as draft and notify
      if (!isOnline) {
        update(id, { status: "draft" });
        toast.info(`"${file.name}" saved as draft — will upload when you're back online.`);
        return;
      }

      // Small delay so "queued" state is visible
      await new Promise((r) => setTimeout(r, 80));
      update(id, { status: "uploading", startedAt: Date.now() });
      activeCount.current += 1;

      try {
        if (file.size > MAX_FILE_BYTES) throw new Error("File exceeds the 1 GB maximum limit.");

        const remaining = Math.max(0, quotaBytes - usedBytes);
        if (file.size > remaining) {
          throw new Error(
            remaining <= 0
              ? "Your vault is full. Delete some files to free up space."
              : `Not enough space. You have ${formatBytes(remaining)} left but this file is ${formatBytes(file.size)}.`,
          );
        }

        await uploadVaultFile(
          file,
          (progress: UploadProgress) => {
            if (progress.percent >= 99) {
              update(id, { percent: 99, loaded: progress.loaded, bytesPerSec: 0, status: "finalizing" });
            } else {
              update(id, {
                percent: progress.percent,
                loaded: progress.loaded,
                bytesPerSec: progress.bytesPerSec ?? 0,
                status: "uploading",
              });
            }
          },
          controller.signal,
        );

        // Remove draft from IndexedDB on success
        await deleteDraft(id).catch(() => undefined);
        update(id, { percent: 100, loaded: file.size, bytesPerSec: 0, status: "completed", isDraft: false });
        toast.success(`"${file.name}" secured in your vault`);
        onUploaded();

        setTimeout(() => {
          setItems((prev) => prev.filter((item) => item.id !== id));
        }, 3500);
      } catch (error) {
        if (controller.signal.aborted) {
          await deleteDraft(id).catch(() => undefined);
          setItems((prev) => prev.filter((item) => item.id !== id));
          toast.info(`Upload of "${file.name}" cancelled.`);
        } else {
          const message = error instanceof Error ? error.message : "Upload failed.";
          update(id, { error: message, status: "error" });
          toast.error(message);
        }
      } finally {
        activeCount.current -= 1;
      }
    },
    [onUploaded, usedBytes, quotaBytes, isOnline],
  );

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList);
    if (files.length > MAX_FILES_PER_BATCH) toast.error(`Max ${MAX_FILES_PER_BATCH} files at once.`);
    for (const file of files.slice(0, MAX_FILES_PER_BATCH)) void startUpload(file);
  };

  const cancelItem = (item: Item) => {
    if (item.status === "uploading" || item.status === "queued") {
      item.controller?.abort();
    } else {
      void deleteDraft(item.id).catch(() => undefined);
      setItems((prev) => prev.filter((e) => e.id !== item.id));
    }
  };

  // When coming back online, auto-resume draft items
  useEffect(() => {
    if (!isOnline) return;
    const drafts = items.filter((i) => i.status === "draft");
    if (!drafts.length) return;
    toast.info(`Back online — resuming ${drafts.length} draft upload${drafts.length > 1 ? "s" : ""}...`);
    for (const d of drafts) void startUpload(d.fileRef, d.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const uploading = items.filter((i) => i.status === "uploading" || i.status === "finalizing" || i.status === "queued" || i.status === "draft");
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
            Videos, images, audio, docs up to 1 GB · max 10 files
          </p>
        </div>
        {uploading.length > 0 && (
          <div className="flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1">
            <Zap className="size-3 text-primary animate-pulse" />
            <span className="font-mono text-[11px] text-muted-foreground">
              {uploading.length} uploading · {totalPercent}%
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
                  {/* File type icon */}
                  <span className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-xl",
                    item.status === "completed" ? "bg-emerald-500/15" :
                    item.status === "error" ? "bg-destructive/15" : "bg-surface-2",
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

                  {/* Name + stats */}
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

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    {item.status === "draft" && isOnline && (
                      <button
                        className="focus-ring rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
                        title="Upload now"
                        onClick={() => void startUpload(item.fileRef, item.id)}
                      >
                        <RotateCcw className="size-3.5" />
                      </button>
                    )}
                    {item.status === "error" && (
                      <button
                        className="focus-ring rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
                        title="Retry"
                        onClick={() => void startUpload(item.fileRef, item.id)}
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

                {/* Progress bar */}
                {item.status !== "error" && (
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

      {/* Batch upload button when items exist */}
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
