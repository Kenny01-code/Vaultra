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
import { formatBytes, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function FileListView({
  files,
  onPreview,
  onDownload,
  onToggleVisibility,
  onCopyLink,
  onRename,
  onDelete,
  busyId,
}: {
  files: VaultFile[];
  onPreview: (file: VaultFile) => void;
  onDownload: (file: VaultFile) => void;
  onToggleVisibility: (file: VaultFile, isPublic: boolean) => void;
  onCopyLink: (file: VaultFile) => void;
  onRename: (file: VaultFile) => void;
  onDelete: (file: VaultFile) => void;
  busyId?: string | null;
}) {
  const [deleteTarget, setDeleteTarget] = useState<VaultFile | null>(null);

  return (
    <div className="glass overflow-hidden rounded-2xl border border-border/70 shadow-[var(--shadow-card)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="border-b border-border/70 bg-surface/50 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-3 pl-4 pr-3 font-medium">Name</th>
              <th className="hidden py-3 px-3 font-medium sm:table-cell">Size</th>
              <th className="py-3 px-3 font-medium">Access</th>
              <th className="hidden py-3 px-3 font-medium md:table-cell">Uploaded</th>
              <th className="py-3 pl-3 pr-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {files.map((file) => (
              <tr
                key={file.id}
                className="group transition-colors hover:bg-surface-2/60"
              >
                <td className="py-3 pl-4 pr-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onPreview(file)}
                      className="focus-ring flex shrink-0 items-center justify-center rounded-lg p-1 transition-transform hover:scale-105"
                      title="Preview file"
                    >
                      <FileTypeIcon mimeType={file.mime_type} name={file.name} className="size-5" />
                    </button>
                    <div className="min-w-0 max-w-[140px] xs:max-w-[200px] sm:max-w-[280px] md:max-w-[340px]">
                      <button
                        type="button"
                        onClick={() => onPreview(file)}
                        className="truncate block text-left font-medium text-foreground hover:underline"
                        title={file.name}
                      >
                        {file.name}
                      </button>
                      <span className="font-mono text-[11px] text-muted-foreground sm:hidden">
                        {formatBytes(file.size_bytes)}
                      </span>
                    </div>
                  </div>
                </td>

                <td className="hidden whitespace-nowrap px-3 py-3 font-mono text-xs text-muted-foreground sm:table-cell">
                  {formatBytes(file.size_bytes)}
                </td>

                <td className="whitespace-nowrap px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={file.is_public}
                      disabled={busyId === file.id}
                      onCheckedChange={(checked) => onToggleVisibility(file, checked)}
                      aria-label={`Toggle access for ${file.name}`}
                    />
                    <Badge
                      variant={file.is_public ? "default" : "secondary"}
                      className={cn(
                        "hidden gap-1 text-[10px] sm:inline-flex",
                        file.is_public && "bg-brand text-primary-foreground",
                      )}
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
                  </div>
                </td>

                <td className="hidden whitespace-nowrap px-3 py-3 font-mono text-xs text-muted-foreground md:table-cell">
                  {formatRelativeTime(file.created_at)}
                </td>

                <td className="whitespace-nowrap py-3 pl-3 pr-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {file.is_public ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => onCopyLink(file)}
                        title="Copy share link"
                        aria-label="Copy share link"
                      >
                        <Share2 className="size-4" />
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => onDownload(file)}
                      title="Download"
                      aria-label="Download file"
                    >
                      <Download className="size-4" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8" aria-label="More options">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onPreview(file)}>
                          <Eye /> Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDownload(file)}>
                          <Download /> Download
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRename(file)}>
                          <Pencil /> Rename
                        </DropdownMenuItem>
                        {file.is_public ? (
                          <DropdownMenuItem onClick={() => onCopyLink(file)}>
                            <Copy /> Copy share link
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(file)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the file from your vault and revokes any public share link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  onDelete(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

