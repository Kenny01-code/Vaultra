import { useState } from "react";
import {
  Copy,
  Download,
  Eye,
  Globe,
  Lock,
  MoreVertical,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { FileTypeIcon } from "@/components/vault/FileTypeIcon";
import type { VaultFile } from "@/features/vault/types";
import { fileKind, formatBytes, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function FileCard({
  file,
  index,
  thumbnailUrl,
  onPreview,
  onDownload,
  onToggleVisibility,
  onCopyLink,
  onRename,
  onDelete,
  busy,
}: {
  file: VaultFile;
  index: number;
  thumbnailUrl?: string;
  onPreview: () => void;
  onDownload: () => void;
  onToggleVisibility: (isPublic: boolean) => void;
  onCopyLink: () => void;
  onRename: () => void;
  onDelete: () => void;
  busy?: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const kind = fileKind(file.mime_type, file.name);

  return (
    <article
      className="glass card-hover content-auto group relative flex flex-col overflow-hidden rounded-2xl"
      style={{ animation: "var(--animate-fade-up)", animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      <button
        type="button"
        onClick={onPreview}
        aria-label={`Preview ${file.name}`}
        className="focus-ring relative block aspect-4/3 w-full overflow-hidden bg-surface-2"
      >
        {thumbnailUrl && kind === "image" ? (
          <img
            src={thumbnailUrl}
            alt={file.name}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-700 ease-[var(--ease-premium)] group-hover:scale-105"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center bg-aurora">
            <FileTypeIcon mimeType={file.mime_type} name={file.name} className="size-10" />
          </span>
        )}

        <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/80 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <span className="absolute bottom-2 left-2 flex translate-y-2 items-center gap-1.5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Eye className="size-3" aria-hidden="true" /> Preview
          </Badge>
        </span>

        <span className="absolute right-2 top-2">
          <Badge
            variant={file.is_public ? "default" : "secondary"}
            className={cn("gap-1 text-[10px]", file.is_public && "bg-brand text-primary-foreground")}
          >
            {file.is_public ? (
              <>
                <Globe className="size-3" aria-hidden="true" /> Public
              </>
            ) : (
              <>
                <Lock className="size-3" aria-hidden="true" /> Private
              </>
            )}
          </Badge>
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div className="flex items-start gap-2">
          <FileTypeIcon mimeType={file.mime_type} name={file.name} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium" title={file.name}>
              {file.name}
            </h3>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {formatBytes(file.size_bytes)} Â· {formatRelativeTime(file.created_at)}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label="File actions">
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={onPreview}>
                <Eye /> Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDownload}>
                <Download /> Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRename}>
                <Pencil /> Rename
              </DropdownMenuItem>
              {file.is_public ? (
                <DropdownMenuItem onClick={onCopyLink}>
                  <Copy /> Copy share link
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setConfirmOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <Switch
              checked={file.is_public}
              disabled={busy}
              onCheckedChange={onToggleVisibility}
              aria-label={`Make ${file.name} ${file.is_public ? "private" : "public"}`}
            />
            {file.is_public ? "Shared" : "Private"}
          </label>

          <div className="flex items-center gap-1">
            {file.is_public ? (
              <Button variant="ghost" size="icon" className="size-8" onClick={onCopyLink} aria-label="Copy share link">
                <Share2 />
              </Button>
            ) : null}
            <Button variant="ghost" size="icon" className="size-8" onClick={onDownload} aria-label="Download file">
              <Download />
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete â€œ{file.name}â€?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the file from your vault and revokes any share link. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
