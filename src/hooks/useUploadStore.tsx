/**
 * Global upload store — lives at root level so upload state survives navigation.
 * UploadPanel reads/writes this store instead of local useState.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { uploadVaultFile, type UploadProgress } from "@/features/vault/upload";
import { MAX_FILE_BYTES } from "@/features/vault/types";
import { formatBytes } from "@/lib/format";
import { deleteDraft, listDrafts, saveDraft } from "@/lib/offline-db";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export type UploadItem = {
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

type UploadStore = {
  items: UploadItem[];
  isOnline: boolean;
  startUpload: (file: File, existingId?: string, opts?: { usedBytes?: number; quotaBytes?: number; onUploaded?: () => void }) => Promise<void>;
  cancelItem: (item: UploadItem) => void;
  clearCompleted: () => void;
};

const UploadContext = createContext<UploadStore>({
  items: [],
  isOnline: true,
  startUpload: async () => {},
  cancelItem: () => {},
  clearCompleted: () => {},
});

export function UploadStoreProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const isOnline = useOnlineStatus();
  const isOnlineRef = useRef(isOnline);
  useEffect(() => { isOnlineRef.current = isOnline; }, [isOnline]);

  const update = useCallback((id: string, patch: Partial<UploadItem>) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item))), []);

  // Restore drafts from IndexedDB on first mount
  useEffect(() => {
    void listDrafts().then((drafts) => {
      if (!drafts.length) return;
      const restored: UploadItem[] = drafts.map((d) => ({
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
      if (restored.length)
        toast.info(`${restored.length} draft upload${restored.length > 1 ? "s" : ""} restored — ready to upload`);
    });
  }, []);

  const startUpload = useCallback(
    async (
      file: File,
      existingId?: string,
      opts: { usedBytes?: number; quotaBytes?: number; onUploaded?: () => void } = {},
    ) => {
      const { usedBytes = 0, quotaBytes = 5 * 1024 * 1024 * 1024, onUploaded } = opts;
      const id = existingId ?? `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`;
      const controller = new AbortController();

      if (!existingId) {
        // Persist blob to IndexedDB immediately
        await saveDraft({
          id,
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          blob: file,
          savedAt: new Date().toISOString(),
        }).catch(() => undefined);

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

      // If offline → save as draft, don't attempt upload
      if (!isOnlineRef.current) {
        update(id, { status: "draft" });
        toast.info(`"${file.name}" saved as draft — will upload when you're back online`);
        return;
      }

      await new Promise((r) => setTimeout(r, 80));
      update(id, { status: "uploading", startedAt: Date.now() });

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

        await deleteDraft(id).catch(() => undefined);
        update(id, { percent: 100, loaded: file.size, bytesPerSec: 0, status: "completed", isDraft: false });
        toast.success(`"${file.name}" secured in your vault`);
        onUploaded?.();

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
      }
    },
    [update],
  );

  const cancelItem = useCallback((item: UploadItem) => {
    if (item.status === "uploading" || item.status === "queued") {
      item.controller?.abort();
    } else {
      void deleteDraft(item.id).catch(() => undefined);
      setItems((prev) => prev.filter((e) => e.id !== item.id));
    }
  }, []);

  const clearCompleted = useCallback(() => {
    setItems((prev) => prev.filter((i) => i.status !== "completed"));
  }, []);

  // Auto-resume drafts when coming back online
  useEffect(() => {
    if (!isOnline) return;
    const drafts = items.filter((i) => i.status === "draft");
    if (!drafts.length) return;
    toast.info(`Back online — resuming ${drafts.length} draft upload${drafts.length > 1 ? "s" : ""}...`);
    for (const d of drafts) void startUpload(d.fileRef, d.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  return (
    <UploadContext.Provider value={{ items, isOnline, startUpload, cancelItem, clearCompleted }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUploadStore() {
  return useContext(UploadContext);
}
