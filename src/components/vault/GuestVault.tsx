import { lazy, Suspense, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  CloudUpload,
  Copy,
  CropIcon,
  Download,
  Eye,
  FolderOpen,
  Globe,
  LayoutGrid,
  List as ListIcon,
  Lock,
  LogIn,
  MoreVertical,
  Pencil,
  Search,
  Share2,
  Trash2,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { FileTypeIcon } from "@/components/vault/FileTypeIcon";
import { ImageCropDialog } from "@/components/vault/ImageCropDialog";
import { StorageMeter } from "@/components/vault/StorageMeter";
import { fileKind, formatBytes, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GuestFile } from "@/lib/offline-db";

const FilePreviewDialog = lazy(() =>
  import("@/components/vault/FilePreviewDialog").then((m) => ({ default: m.FilePreviewDialog })),
);

const MAX_GUEST_FILE = 500 * 1024 * 1024;
const MAX_GUEST_TOTAL = 2 * 1024 * 1024 * 1024;
const MAX_FILES_PER_BATCH = 10;

type Sort = "date-desc" | "date-asc" | "size-desc" | "size-asc" | "name-asc" | "name-desc";
const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "size-desc", label: "Largest size" },
  { value: "size-asc", label: "Smallest size" },
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
];

// Convert a GuestFile into a fake VaultFile shape for FilePreviewDialog
function toVaultFile(gf: GuestFile) {
  return {
    id: gf.id,
    owner_id: "guest",
    name: gf.name,
    storage_path: gf.id,
    mime_type: gf.mimeType,
    size_bytes: gf.sizeBytes,
    is_public: gf.isPublic,
    share_token: gf.shareToken,
    download_count: gf.downloadCount,
    created_at: gf.createdAt,
    updated_at: gf.updatedAt,
  };
}

export function GuestVault({
  files,
  loading,
  onAdd,
  onRemove,
  onToggleVisibility,
  onRename,
  onSignIn,
  onExitGuest,
}: {
  files: GuestFile[];
  loading: boolean;
  onAdd: (file: File) => Promise<GuestFile>;
  onRemove: (id: string) => Promise<void>;
  onToggleVisibility: (id: string, isPublic: boolean) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onSignIn: () => void;
  onExitGuest: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("date-desc");
  const [displayMode, setDisplayMode] = useState<"grid" | "list">("grid");

  // Preview
  const [previewFile, setPreviewFile] = useState<GuestFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Rename
  const [renameTarget, setRenameTarget] = useState<GuestFile | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<GuestFile | null>(null);

  // Image crop
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const pendingFiles = useRef<File[]>([]);

  const totalUsed = files.reduce((s, f) => s + f.sizeBytes, 0);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    let result = term ? files.filter((f) => f.name.toLowerCase().includes(term)) : [...files];
    result.sort((a, b) => {
      if (sort === "date-desc") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === "date-asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === "size-desc") return b.sizeBytes - a.sizeBytes;
      if (sort === "size-asc") return a.sizeBytes - b.sizeBytes;
      if (sort === "name-asc") return a.name.localeCompare(b.name);
      if (sort === "name-desc") return b.name.localeCompare(a.name);
      return 0;
    });
    return result;
  }, [files, query, sort]);

  const saveFile = async (file: File) => {
    if (file.size > MAX_GUEST_FILE) { toast.error(`"${file.name}" exceeds the 500 MB guest limit.`); return; }
    if (totalUsed + file.size > MAX_GUEST_TOTAL) { toast.error("Guest storage full (2 GB). Delete files or sign in for 5 GB."); return; }
    try { await onAdd(file); toast.success(`"${file.name}" saved locally`); }
    catch { toast.error(`Failed to save "${file.name}"`); }
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const arr = Array.from(fileList).slice(0, MAX_FILES_PER_BATCH);
    // Pull out the first image for cropping; save the rest directly
    const images = arr.filter((f) => f.type.startsWith("image/"));
    const others = arr.filter((f) => !f.type.startsWith("image/"));
    for (const file of others) await saveFile(file);
    if (images.length > 0) {
      // Queue remaining images after the first
      pendingFiles.current = images.slice(1);
      setCropFile(images[0]);
      setCropOpen(true);
    }
  };

  const handleCropDone = async (cropped: File) => {
    await saveFile(cropped);
    // Process next queued image if any
    if (pendingFiles.current.length > 0) {
      const next = pendingFiles.current.shift()!;
      setCropFile(next);
      setCropOpen(true);
    }
  };

  const handleCropSkip = async () => {
    // User skipped crop — save original
    if (cropFile) await saveFile(cropFile);
    if (pendingFiles.current.length > 0) {
      const next = pendingFiles.current.shift()!;
      setCropFile(next);
      setCropOpen(true);
    }
  };

  const openPreview = (gf: GuestFile) => {
    setPreviewFile(gf);
    const url = URL.createObjectURL(gf.blob);
    setPreviewUrl(url);
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  const downloadFile = (gf: GuestFile) => {
    const url = URL.createObjectURL(gf.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = gf.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const copyShareLink = (gf: GuestFile) => {
    // Guest share links are local — copy a data note since there's no server
    const text = `${window.location.origin}/s/${gf.shareToken}`;
    void navigator.clipboard.writeText(text);
    toast.success("Share link copied — note: guest links only work on this device");
  };

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    setRenameBusy(true);
    try {
      await onRename(renameTarget.id, renameValue.trim());
      toast.success("File renamed");
      setRenameTarget(null);
    } finally {
      setRenameBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    await onRemove(id);
    toast.success("File deleted");
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-5">
      {/* Guest banner */}
      <div className="glass rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <UserX className="mt-0.5 size-4 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Guest mode — local storage only</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Files live in this browser only. Sign in for encrypted cloud storage, cross-device sync, and 5 GB quota.
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
      <StorageMeter used={totalUsed} quota={MAX_GUEST_TOTAL} fileCount={files.length} />

      {/* Upload drop zone */}
      <input ref={inputRef} type="file" multiple className="sr-only"
        onChange={(e) => { void handleFiles(e.target.files); e.target.value = ""; }} />
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "glass flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-dashed p-6 text-center transition-all duration-300",
          dragging ? "border-primary bg-surface-2 scale-[1.02]" : "border-border hover:border-primary/40 hover:bg-surface/60",
        )}
      >
        <span className={cn("grid size-12 place-items-center rounded-2xl transition-all duration-300", dragging ? "bg-primary scale-110" : "bg-brand")}>
          <CloudUpload className="size-6 text-primary-foreground" />
        </span>
        <div>
          <p className="font-display text-sm font-semibold">{dragging ? "Release to save locally" : "Drop files or click to browse"}</p>
          <p className="mt-1 text-xs text-muted-foreground">Saved in your browser · up to 500 MB per file · max 10 files</p>
        </div>
      </div>

      {/* Search + sort + view toggle */}
      {files.length > 0 && (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files…" className="pl-9 pr-9" />
            {query && (
              <button type="button" onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="glass" size="sm" className="gap-1.5 text-xs min-h-[38px]">
                  <ArrowUpDown className="size-3.5" />
                  {SORT_OPTIONS.find((s) => s.value === sort)?.label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-xl">
                {SORT_OPTIONS.map((opt) => (
                  <DropdownMenuItem key={opt.value} onClick={() => setSort(opt.value)}
                    className={sort === opt.value ? "font-semibold text-primary" : ""}>
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex items-center rounded-xl border border-border/70 bg-surface/60 p-0.5">
              {(["grid", "list"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setDisplayMode(m)}
                  className={cn("grid size-8 place-items-center rounded-lg transition-colors",
                    displayMode === m ? "bg-surface-2 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  {m === "grid" ? <LayoutGrid className="size-4" /> : <ListIcon className="size-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* File grid / list */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 md:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="aspect-4/3 rounded-2xl" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="glass grid place-items-center gap-3 rounded-3xl p-10 text-center">
          <FolderOpen className="size-10 text-muted-foreground opacity-50" />
          <div>
            <p className="font-display text-sm font-semibold">{query ? "No matching files" : "No local files yet"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {query ? `No files matched "${query}".` : "Drop files above to save them locally in your browser."}
            </p>
          </div>
          {!query && (
            <Button variant="hero" size="sm" onClick={() => inputRef.current?.click()} className="gap-2 mt-1">
              <CloudUpload className="size-4" /> Add files
            </Button>
          )}
        </div>
      ) : displayMode === "list" ? (
        <GuestListView files={visible} onPreview={openPreview} onDownload={downloadFile}
          onToggle={onToggleVisibility} onCopyLink={copyShareLink}
          onRename={(f) => { setRenameTarget(f); setRenameValue(f.name); }}
          onDelete={(f) => setDeleteTarget(f)} />
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map((gf, index) => (
            <GuestFileCard key={gf.id} file={gf} index={index}
              onPreview={() => openPreview(gf)}
              onDownload={() => downloadFile(gf)}
              onToggle={(v) => void onToggleVisibility(gf.id, v)}
              onCopyLink={() => copyShareLink(gf)}
              onRename={() => { setRenameTarget(gf); setRenameValue(gf.name); }}
              onDelete={() => setDeleteTarget(gf)} />
          ))}
        </div>
      )}

      {/* Preview dialog — reuses FilePreviewDialog with blob URL */}
      <Suspense fallback={null}>
        <FilePreviewDialog
          file={previewFile ? toVaultFile(previewFile) : null}
          url={previewUrl}
          open={Boolean(previewFile)}
          onOpenChange={(open) => { if (!open) closePreview(); }}
          onDownload={() => previewFile && downloadFile(previewFile)}
        />
      </Suspense>

      {/* Image crop dialog */}
      <ImageCropDialog
        file={cropFile}
        open={cropOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCropOpen(false);
            void handleCropSkip();
          }
        }}
        onCrop={(cropped) => {
          setCropOpen(false);
          void handleCropDone(cropped);
        }}
      />

      {/* Rename dialog */}
      <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Rename file</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter new file name" autoFocus
              onKeyDown={(e) => e.key === "Enter" && void handleRename()} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button variant="hero" size="sm" disabled={!renameValue.trim() || renameBusy} onClick={() => void handleRename()}>
              {renameBusy ? "Saving…" : "Save name"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the file from your browser storage. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && void handleDelete(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Guest File Card (mirrors FileCard) ──────────────────────────────────────

function GuestFileCard({
  file, index, onPreview, onDownload, onToggle, onCopyLink, onRename, onDelete,
}: {
  file: GuestFile; index: number;
  onPreview: () => void; onDownload: () => void;
  onToggle: (v: boolean) => void; onCopyLink: () => void;
  onRename: () => void; onDelete: () => void;
}) {
  const kind = fileKind(file.mimeType, file.name);
  const [thumbUrl] = useState(() =>
    file.mimeType.startsWith("image/") ? URL.createObjectURL(file.blob) : null,
  );

  return (
    <article className="glass card-hover content-auto group relative flex flex-col overflow-hidden rounded-2xl"
      style={{ animation: "var(--animate-fade-up)", animationDelay: `${Math.min(index, 12) * 45}ms` }}>
      <button type="button" onClick={onPreview} aria-label={`Preview ${file.name}`}
        className="focus-ring relative block aspect-4/3 w-full overflow-hidden bg-surface-2">
        {thumbUrl && kind === "image" ? (
          <img src={thumbUrl} alt={file.name} loading="lazy" decoding="async"
            className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <span className="absolute inset-0 grid place-items-center bg-aurora">
            <FileTypeIcon mimeType={file.mimeType} name={file.name} className="size-10" />
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/80 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <span className="absolute bottom-2 left-2 flex translate-y-2 items-center gap-1.5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <Badge variant="secondary" className="gap-1 text-[10px]"><Eye className="size-3" /> Preview</Badge>
        </span>
        <span className="absolute right-2 top-2">
          <Badge variant={file.isPublic ? "default" : "secondary"}
            className={cn("gap-1 text-[10px]", file.isPublic && "bg-brand text-primary-foreground")}>
            {file.isPublic ? <><Globe className="size-3" /> Public</> : <><Lock className="size-3" /> Private</>}
          </Badge>
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div className="flex items-start gap-2">
          <FileTypeIcon mimeType={file.mimeType} name={file.name} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium" title={file.name}>{file.name}</h3>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {formatBytes(file.sizeBytes)} · {formatRelativeTime(file.createdAt)}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label="File actions">
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={onPreview}><Eye /> Preview</DropdownMenuItem>
              <DropdownMenuItem onClick={onDownload}><Download /> Download</DropdownMenuItem>
              <DropdownMenuItem onClick={onRename}><Pencil /> Rename</DropdownMenuItem>
              {file.isPublic && <DropdownMenuItem onClick={onCopyLink}><Copy /> Copy share link</DropdownMenuItem>}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={file.isPublic} onCheckedChange={onToggle}
              aria-label={`Make ${file.name} ${file.isPublic ? "private" : "public"}`} />
            {file.isPublic ? "Shared" : "Private"}
          </label>
          <div className="flex items-center gap-1">
            {file.isPublic && (
              <Button variant="ghost" size="icon" className="size-8" onClick={onCopyLink} aria-label="Copy share link">
                <Share2 />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="size-8" onClick={onDownload} aria-label="Download">
              <Download />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Guest List View ──────────────────────────────────────────────────────────

function GuestListView({
  files, onPreview, onDownload, onToggle, onCopyLink, onRename, onDelete,
}: {
  files: GuestFile[];
  onPreview: (f: GuestFile) => void; onDownload: (f: GuestFile) => void;
  onToggle: (id: string, v: boolean) => void; onCopyLink: (f: GuestFile) => void;
  onRename: (f: GuestFile) => void; onDelete: (f: GuestFile) => void;
}) {
  return (
    <div className="glass rounded-2xl divide-y divide-border/60 overflow-hidden">
      {files.map((gf) => (
        <div key={gf.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface/40 transition-colors">
          <button type="button" onClick={() => onPreview(gf)} className="shrink-0">
            <FileTypeIcon mimeType={gf.mimeType} name={gf.name} className="size-5" />
          </button>
          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onPreview(gf)}>
            <p className="truncate text-sm font-medium">{gf.name}</p>
            <p className="font-mono text-[10px] text-muted-foreground">
              {formatBytes(gf.sizeBytes)} · {formatRelativeTime(gf.createdAt)}
            </p>
          </div>
          <Badge variant={gf.isPublic ? "default" : "secondary"}
            className={cn("shrink-0 gap-1 text-[10px] hidden sm:flex", gf.isPublic && "bg-brand text-primary-foreground")}>
            {gf.isPublic ? <><Globe className="size-3" /> Public</> : <><Lock className="size-3" /> Private</>}
          </Badge>
          <Switch checked={gf.isPublic} onCheckedChange={(v) => onToggle(gf.id, v)} className="shrink-0" />
          <div className="flex shrink-0 items-center gap-0.5">
            {gf.isPublic && (
              <button className="focus-ring rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
                title="Copy share link" onClick={() => onCopyLink(gf)}>
                <Share2 className="size-3.5" />
              </button>
            )}
            <button className="focus-ring rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
              title="Download" onClick={() => onDownload(gf)}>
              <Download className="size-3.5" />
            </button>
            <button className="focus-ring rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
              title="Rename" onClick={() => onRename(gf)}>
              <Pencil className="size-3.5" />
            </button>
            <button className="focus-ring rounded-lg p-1.5 text-muted-foreground hover:text-destructive"
              title="Delete" onClick={() => onDelete(gf)}>
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
