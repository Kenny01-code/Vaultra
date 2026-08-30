import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useRef, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpDown,
  CloudUpload,
  FolderOpen,
  LayoutGrid,
  List as ListIcon,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppShell } from "@/components/vault/AppShell";
import { FileCard } from "@/components/vault/FileCard";
import { FileListView } from "@/components/vault/FileListView";
import { StorageMeter } from "@/components/vault/StorageMeter";
import { UploadPanel } from "@/components/vault/UploadPanel";
import { filesQuery, profileQuery } from "@/features/vault/queries";
import type { VaultDisplayMode, VaultFile, VaultSort, VaultView } from "@/features/vault/types";
import { useThumbnails } from "@/features/vault/useThumbnails";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// Lazy-load rich media preview dialog
const FilePreviewDialog = lazy(() =>
  import("@/components/vault/FilePreviewDialog").then((m) => ({ default: m.FilePreviewDialog })),
);

const searchSchema = z.object({
  view: z.enum(["recent", "all", "public", "private"]).default("recent").catch("recent"),
  q: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/vault")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Your Vault â€” Vaultra Secure File Storage" },
      {
        name: "description",
        content:
          "Upload, preview, organise and share your files from a private vault with per-file public links and live storage usage.",
      },
      { property: "og:title", content: "Your Vault â€” Vaultra" },
      { property: "og:description", content: "Private file storage with revocable share links." },
    ],
  }),
  component: VaultPage,
});

const VIEWS: { value: VaultView; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "all", label: "All files" },
  { value: "public", label: "Shared" },
  { value: "private", label: "Private" },
];

const SORT_OPTIONS: { value: VaultSort; label: string }[] = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "size-desc", label: "Largest size" },
  { value: "size-asc", label: "Smallest size" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
];

export function VaultPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const uploadInput = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(search.q ?? "");
  const [sort, setSort] = useState<VaultSort>("date-desc");
  const [displayMode, setDisplayMode] = useState<VaultDisplayMode>("grid");
  const [previewFile, setPreviewFile] = useState<VaultFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<VaultFile | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isWindowDragging, setIsWindowDragging] = useState(false);

  const files = useQuery({ ...filesQuery(userId), enabled: Boolean(userId) });
  const profile = useQuery({ ...profileQuery(userId), enabled: Boolean(userId) });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["vault"] });
  };

  const list = files.data ?? [];
  const used = useMemo(
    () => list.reduce((sum, file) => sum + Number(file.size_bytes ?? 0), 0),
    [list],
  );

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: list.length,
      recent: Math.min(list.length, 12),
      public: list.filter((f) => f.is_public).length,
      private: list.filter((f) => !f.is_public).length,
    };
  }, [list]);

  // Filter and sort files
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    let result = [...list];

    // Filter view
    if (search.view === "public") result = result.filter((file) => file.is_public);
    if (search.view === "private") result = result.filter((file) => !file.is_public);
    if (search.view === "recent") result = result.slice(0, 12);

    // Search query
    if (term) {
      result = result.filter((file) => file.name.toLowerCase().includes(term));
    }

    // Sort
    result.sort((a, b) => {
      if (sort === "date-desc") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "date-asc") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sort === "size-desc") return (b.size_bytes || 0) - (a.size_bytes || 0);
      if (sort === "size-asc") return (a.size_bytes || 0) - (b.size_bytes || 0);
      if (sort === "name-asc") return a.name.localeCompare(b.name);
      if (sort === "name-desc") return b.name.localeCompare(a.name);
      return 0;
    });

    return result;
  }, [list, query, search.view, sort]);

  const thumbnails = useThumbnails(visible);

  // Visibility toggle mutation with fallback to client SDK
  const visibility = useMutation({
    mutationFn: async (input: { fileId: string; isPublic: boolean }) => {
      const { data, error } = await supabase.from("files").update({ is_public: input.isPublic }).eq("id", input.fileId).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: (input) => setBusyId(input.fileId),
    onSettled: () => setBusyId(null),
    onSuccess: (_data, input) => {
      toast.success(input.isPublic ? "Share link generated (public)" : "File locked back to private");
      invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Update failed."),
  });

  // Delete mutation with fallback to client SDK
  const removal = useMutation({
    mutationFn: async (file: VaultFile) => {
      const { error: storageError } = await supabase.storage.from("vault").remove([file.storage_path]);
      if (storageError) throw storageError;
      const { error } = await supabase.from("files").delete().eq("id", file.id);
      if (error) throw error;
      return { id: file.id };
    },
    onSuccess: () => {
      toast.success("File permanently deleted");
      invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Delete failed."),
  });

  // Rename mutation with fallback to client SDK
  const rename = useMutation({
    mutationFn: async (input: { fileId: string; name: string }) => {
      const { data, error } = await supabase.from("files").update({ name: input.name }).eq("id", input.fileId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("File renamed");
      setRenameTarget(null);
      invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Rename failed."),
  });

  const openPreview = async (file: VaultFile) => {
    setPreviewFile(file);
    setPreviewUrl(null);
    try {
      const { data, error } = await supabase.storage.from("vault").createSignedUrl(file.storage_path, 300);
      if (error) throw error;
      setPreviewUrl(data.signedUrl);
    } catch {
      toast.error("Could not preview this file.");
    }
  };

  const download = async (file: VaultFile) => {
    try {
      const { data, error } = await supabase.storage.from("vault").createSignedUrl(file.storage_path, 300, { download: file.name });
      if (error) throw error;
      window.location.assign(data.signedUrl);
    } catch {
      toast.error("Could not download this file.");
    }
  };

  const copyLink = async (file: VaultFile) => {
    const url = `${window.location.origin}/s/${file.share_token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Share link copied to clipboard");
  };

  return (
    <AppShell onUploadClick={() => uploadInput.current?.click()}>
      {/* Full-window drag and drop indicator */}
      {isWindowDragging ? (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-md border-4 border-dashed border-primary transition-all duration-300"
          onDragLeave={() => setIsWindowDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsWindowDragging(false);
            if (e.dataTransfer.files?.length && uploadInput.current) {
              const dt = new DataTransfer();
              for (const f of Array.from(e.dataTransfer.files)) dt.items.add(f);
              uploadInput.current.files = dt.files;
              uploadInput.current.dispatchEvent(new Event("change", { bubbles: true }));
            }
          }}
        >
          <CloudUpload className="size-16 animate-bounce text-primary" />
          <p className="mt-4 font-display text-2xl font-semibold">Drop files anywhere to secure them</p>
          <p className="mt-1 text-sm text-muted-foreground">Uploads up to 1 GB per file</p>
        </div>
      ) : null}

      <div
        className="grid gap-5 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px]"
        onDragEnter={() => setIsWindowDragging(true)}
      >
        {/* Main Vault Content */}
        <div className="order-2 space-y-4 lg:order-1 min-w-0">
          {/* Search, Filter Tabs, and View Options Toolbar */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search files by name..."
                  aria-label="Search files by name"
                  className="pl-9 pr-9"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>

              {/* View Switcher and Sort Dropdown */}
              <div className="flex items-center justify-between sm:justify-end gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="glass" size="sm" className="gap-1.5 text-xs font-medium min-h-[38px]">
                      <ArrowUpDown className="size-3.5" />
                      <span className="hidden xs:inline">Sort:</span>
                      <span className="truncate max-w-24">
                        {SORT_OPTIONS.find((s) => s.value === sort)?.label}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 rounded-xl">
                    {SORT_OPTIONS.map((opt) => (
                      <DropdownMenuItem
                        key={opt.value}
                        onClick={() => setSort(opt.value)}
                        className={sort === opt.value ? "font-semibold text-primary" : ""}
                      >
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex items-center rounded-xl border border-border/70 bg-surface/60 p-0.5">
                  <button
                    type="button"
                    onClick={() => setDisplayMode("grid")}
                    aria-label="Grid view"
                    className={`grid size-8 place-items-center rounded-lg transition-colors ${
                      displayMode === "grid"
                        ? "bg-surface-2 text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LayoutGrid className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayMode("list")}
                    aria-label="List view"
                    className={`grid size-8 place-items-center rounded-lg transition-colors ${
                      displayMode === "list"
                        ? "bg-surface-2 text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ListIcon className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="overflow-x-auto pb-1">
              <Tabs
                value={search.view}
                onValueChange={(value) =>
                  void navigate({ search: { view: value as VaultView }, replace: true })
                }
              >
                <TabsList className="w-full sm:w-auto h-9">
                  {VIEWS.map((v) => (
                    <TabsTrigger
                      key={v.value}
                      value={v.value}
                      className="flex-1 sm:flex-none text-xs gap-1.5"
                    >
                      {v.label}
                      <span className="rounded-full bg-surface-2 px-1.5 py-0.2 text-[10px] text-muted-foreground">
                        {counts[v.value]}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Files List / Grid / Empty State */}
          {files.isLoading ? (
            <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="aspect-4/3 rounded-2xl" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="glass grid place-items-center gap-3 rounded-3xl p-8 sm:p-12 text-center">
              <FolderOpen className="size-10 text-muted-foreground animate-pulse" aria-hidden="true" />
              <div>
                <p className="font-display text-base font-semibold">
                  {query ? "No matching files found" : "Your vault is empty"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                  {query
                    ? `No files matched "${query}". Try adjusting your search query.`
                    : "Upload videos, documents, audio, or images to get started."}
                </p>
              </div>
              <Button
                variant="hero"
                size="sm"
                onClick={() => uploadInput.current?.click()}
                className="gap-2 mt-2"
              >
                <CloudUpload className="size-4" /> Upload files
              </Button>
            </div>
          ) : displayMode === "list" ? (
            <FileListView
              files={visible}
              onPreview={(f) => void openPreview(f)}
              onDownload={(f) => void download(f)}
              onToggleVisibility={(f, isPublic) => visibility.mutate({ fileId: f.id, isPublic })}
              onCopyLink={(f) => void copyLink(f)}
              onRename={(f) => {
                setRenameTarget(f);
                setRenameValue(f.name);
              }}
              onDelete={(f) => removal.mutate(f)}
              busyId={busyId}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
              {visible.map((file, index) => (
                <FileCard
                  key={file.id}
                  file={file}
                  index={index}
                  {...(thumbnails[file.storage_path]
                    ? { thumbnailUrl: thumbnails[file.storage_path] }
                    : {})}
                  busy={busyId === file.id}
                  onPreview={() => void openPreview(file)}
                  onDownload={() => void download(file)}
                  onCopyLink={() => void copyLink(file)}
                  onToggleVisibility={(isPublic) =>
                    visibility.mutate({ fileId: file.id, isPublic })
                  }
                  onRename={() => {
                    setRenameTarget(file);
                    setRenameValue(file.name);
                  }}
                  onDelete={() => removal.mutate(file)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Controls (Upload Panel & Storage Meter) */}
        <aside className="order-1 space-y-4 lg:order-2">
          <UploadPanel
            inputRef={uploadInput}
            onUploaded={invalidate}
            usedBytes={used}
            quotaBytes={profile.data?.quotaBytes ?? 5 * 1024 * 1024 * 1024}
          />
          <StorageMeter
            used={used}
            quota={profile.data?.quotaBytes ?? 5 * 1024 * 1024 * 1024}
            fileCount={list.length}
          />
        </aside>
      </div>

      {/* Rich Media Preview Dialog */}
      <Suspense fallback={null}>
        <FilePreviewDialog
          file={previewFile}
          url={previewUrl}
          open={Boolean(previewFile)}
          onOpenChange={(open) => {
            if (!open) {
              setPreviewFile(null);
              setPreviewUrl(null);
            }
          }}
          onDownload={() => previewFile && void download(previewFile)}
        />
      </Suspense>

      {/* Rename File Dialog */}
      <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Rename file</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              aria-label="New file name"
              placeholder="Enter new file name"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="hero"
              size="sm"
              disabled={!renameValue.trim() || rename.isPending}
              onClick={() =>
                renameTarget && rename.mutate({ fileId: renameTarget.id, name: renameValue.trim() })
              }
            >
              {rename.isPending ? "Savingâ€¦" : "Save name"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
