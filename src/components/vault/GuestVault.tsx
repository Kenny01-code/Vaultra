import { useRef, useState } from "react";
import {
  CloudUpload,
  Download,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  File as FileIcon,
  FolderOpen,
  LogIn,
  Trash2,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GuestFile } from "@/lib/offline-db";

const MAX_GUEST_FILE = 500 * 1024 * 1024; // 500 MB per file in guest mode
const MAX_GUEST_TOTAL = 2 * 1024 * 1024 * 1024; // 2 GB total guest storage

function mimeIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType.startsWith("text/") || mimeType.includes("pdf")) return FileText;
  return FileIcon;
}

export function GuestVault({
  files,
  loading,
  onAdd,
  onRemove,
  onSignIn,
  onExitGuest,
}: {
  files: GuestFile[];
  loading: boolean;
  onAdd: (file: File) => Promise<GuestFile>;
  onRemove: (id: string) => Promise<void>;
  onSignIn: () => void;
  onExitGuest: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const totalUsed = files.reduce((s, f) => s + f.sizeBytes, 0);
  const usedPct = Math.min(100, Math.round((totalUsed / MAX_GUEST_TOTAL) * 100));

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    for (const file of Array.from(fileList).slice(0, 10)) {
      if (file.size > MAX_GUEST_FILE) {
        toast.error(`"${file.name}" exceeds the 500 MB guest limit.`);
        continue;
      }
      if (totalUsed + file.size > MAX_GUEST_TOTAL) {
        toast.error("Guest storage full (2 GB). Delete some files or sign in for 5 GB.");
        break;
      }
      try {
        await onAdd(file);
        toast.success(`"${file.name}" saved locally`);
      } catch {
        toast.error(`Failed to save "${file.name}"`);
      }
    }
  };

  const downloadFile = (gf: GuestFile) => {
    const url = URL.createObjectURL(gf.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = gf.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const removeFile = async (id: string) => {
    setBusy(id);
    try {
      await onRemove(id);
      toast.success("File removed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Guest mode notice */}
      <div className="glass rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <UserX className="mt-0.5 size-4 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Guest mode — local storage only</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Files are saved in your browser only. They won't sync across devices or survive clearing browser data.
                Sign in for encrypted cloud storage with 5 GB quota.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="hero" size="sm" className="gap-1.5 text-xs" onClick={onSignIn}>
              <LogIn className="size-3.5" /> Sign in
            </Button>
            <Button variant="glass" size="sm" className="text-xs" onClick={onExitGuest}>
              Exit guest
            </Button>
          </div>
        </div>
      </div>

      {/* Storage meter */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Local storage used</span>
          <span className="font-mono font-medium">
            {formatBytes(totalUsed)} / {formatBytes(MAX_GUEST_TOTAL)}
          </span>
        </div>
        <Progress value={usedPct} className="h-1.5" />
        <p className="text-[10px] text-muted-foreground">{files.length} file{files.length !== 1 ? "s" : ""} · max 500 MB per file</p>
      </div>

      {/* Drop zone */}
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={(e) => { void handleFiles(e.target.files); e.target.value = ""; }}
      />
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "glass flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-dashed p-6 text-center transition-all duration-300",
          dragging
            ? "border-primary bg-surface-2 scale-[1.02]"
            : "border-border hover:border-primary/40 hover:bg-surface/60",
        )}
      >
        <span className={cn(
          "grid size-12 place-items-center rounded-2xl transition-all duration-300",
          dragging ? "bg-primary scale-110" : "bg-brand",
        )}>
          <CloudUpload className="size-6 text-primary-foreground" />
        </span>
        <div>
          <p className="font-display text-sm font-semibold">
            {dragging ? "Release to save locally" : "Drop files or click to browse"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Saved in your browser · up to 500 MB per file · max 10 files
          </p>
        </div>
      </div>

      {/* File list */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass h-16 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : files.length === 0 ? (
        <div className="glass grid place-items-center gap-3 rounded-3xl p-10 text-center">
          <FolderOpen className="size-10 text-muted-foreground opacity-50" />
          <div>
            <p className="font-display text-sm font-semibold">No local files yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Files you add here are stored only in this browser.
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {files.map((gf) => {
            const Icon = mimeIcon(gf.mimeType);
            return (
              <li key={gf.id} className="glass flex items-center gap-3 rounded-2xl p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2">
                  <Icon className="size-4 text-muted-foreground" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium" title={gf.name}>{gf.name}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {formatBytes(gf.sizeBytes)} · local only
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    className="focus-ring rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
                    title="Download"
                    onClick={() => downloadFile(gf)}
                  >
                    <Download className="size-3.5" />
                  </button>
                  <button
                    className="focus-ring rounded-lg p-1.5 text-muted-foreground hover:text-destructive"
                    title="Delete"
                    disabled={busy === gf.id}
                    onClick={() => void removeFile(gf.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
