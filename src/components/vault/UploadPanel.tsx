import { useCallback, useRef, useState } from "react";
import { CheckCircle2, CloudUpload, Loader2, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { uploadVaultFile, type UploadProgress } from "@/features/vault/upload";
import { MAX_FILE_BYTES } from "@/features/vault/types";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  name: string;
  size: number;
  loaded: number;
  percent: number;
  status: "uploading" | "completed" | "error";
  error?: string | undefined;
  controller?: AbortController | undefined;
  fileRef: File;
};

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

  const update = (id: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const startUpload = useCallback(
    async (file: File, existingId?: string) => {
      const id = existingId ?? `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`;
      const controller = new AbortController();

      if (!existingId) {
        setItems((prev) => [
          ...prev,
          {
            id,
            name: file.name,
            size: file.size,
            loaded: 0,
            percent: 0,
            status: "uploading",
            controller,
            fileRef: file,
          },
        ]);
      } else {
        update(id, { status: "uploading", error: undefined, percent: 0, loaded: 0, controller });
      }

      activeCount.current += 1;

      try {
        if (file.size > MAX_FILE_BYTES) {
          throw new Error("File exceeds the 1 GB maximum limit.");
        }

        // Pre-flight quota check â€” alert user before any bytes leave the browser
        const remaining = Math.max(0, quotaBytes - usedBytes);
        if (file.size > remaining) {
          throw new Error(
            remaining <= 0
              ? "Your vault is full. Delete some files or free up space before uploading."
              : `Not enough storage left. You have ${formatBytes(remaining)} remaining, but this file is ${formatBytes(file.size)}.`,
          );
        }

        await uploadVaultFile(
          file,
          (progress: UploadProgress) => {
            update(id, {
              percent: progress.percent,
              loaded: progress.loaded,
            });
          },
          controller.signal,
        );

        update(id, { percent: 100, loaded: file.size, status: "completed" });
        toast.success(`"${file.name}" secured in your vault`);
        onUploaded();

        // Auto remove completed item after 3 seconds
        setTimeout(() => {
          setItems((prev) => prev.filter((item) => item.id !== id));
        }, 3200);
      } catch (error) {
        if (controller.signal.aborted) {
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
    [onUploaded, usedBytes, quotaBytes],
  );

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    for (const file of Array.from(fileList)) {
      void startUpload(file);
    }
  };

  const cancelItem = (item: Item) => {
    if (item.status === "uploading" && item.controller) {
      item.controller.abort();
    } else {
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    }
  };

  return (
    <section aria-label="Upload files">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "glass flex flex-col items-center gap-3 rounded-3xl border-dashed p-6 sm:p-7 text-center transition-all duration-300",
          dragging
            ? "border-primary bg-surface-2 scale-[1.01] shadow-[var(--shadow-glow)]"
            : "border-border hover:border-border/80",
        )}
      >
        <span className="grid size-12 place-items-center rounded-2xl bg-brand shadow-[var(--shadow-glow)]">
          <CloudUpload className="size-6 text-primary-foreground" aria-hidden="true" />
        </span>
        <div>
          <p className="font-display text-sm font-semibold">Drop files or media here</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Videos, images, audio, docs & archives up to 1 GB
          </p>
        </div>
        <Button variant="subtle" size="sm" onClick={() => inputRef.current?.click()} className="mt-1">
          Browse files
        </Button>
      </div>

      {items.length ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="glass rounded-2xl p-3 shadow-[var(--shadow-card)]"
              style={{ animation: "var(--animate-fade-up)" }}
            >
              <div className="flex items-center gap-2 text-xs">
                {item.status === "uploading" ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
                ) : item.status === "completed" ? (
                  <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                ) : null}

                <span className="truncate font-medium" title={item.name}>
                  {item.name}
                </span>

                <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                  {item.status === "error"
                    ? "failed"
                    : item.status === "completed"
                      ? "done"
                      : `${item.percent}% (${formatBytes(item.loaded)} / ${formatBytes(item.size)})`}
                </span>

                {item.status === "error" ? (
                  <button
                    className="focus-ring rounded-md p-1 text-muted-foreground hover:text-foreground"
                    title="Retry upload"
                    aria-label="Retry upload"
                    onClick={() => void startUpload(item.fileRef, item.id)}
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                ) : null}

                <button
                  className="focus-ring rounded-md p-1 text-muted-foreground hover:text-destructive"
                  title={item.status === "uploading" ? "Cancel upload" : "Dismiss"}
                  aria-label={item.status === "uploading" ? "Cancel upload" : "Dismiss"}
                  onClick={() => cancelItem(item)}
                >
                  <X className="size-3.5" />
                </button>
              </div>

              {item.status === "error" && item.error ? (
                <p className="mt-1.5 text-[11px] text-destructive">{item.error}</p>
              ) : (
                <Progress
                  value={item.percent}
                  className={cn(
                    "mt-2 h-1.5",
                    item.status === "completed" && "[&>div]:bg-emerald-500",
                  )}
                />
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}