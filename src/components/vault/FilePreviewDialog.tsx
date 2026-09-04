import { useEffect, useState } from "react";
import { Copy, Download, ExternalLink, FileText, Loader2, Music, Video } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fileKind, formatBytes, formatRelativeTime } from "@/lib/format";
import type { VaultFile } from "@/features/vault/types";

export function FilePreviewDialog({
  file,
  url,
  open,
  onOpenChange,
  onDownload,
}: {
  file: VaultFile | null;
  url: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: () => void;
}) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);

  const kind = file ? fileKind(file.mime_type, file.name) : "other";

  useEffect(() => {
    if (open && url && kind === "text") {
      setLoadingText(true);
      fetch(url)
        .then((res) => (res.ok ? res.text() : Promise.reject(new Error("Failed to load text"))))
        .then((text) => setTextContent(text.slice(0, 100_000))) // Limit to first 100KB for performance
        .catch(() => setTextContent("Unable to preview text content directly."))
        .finally(() => setLoadingText(false));
    } else {
      setTextContent(null);
    }
  }, [open, url, kind]);

  const copyShareLink = async () => {
    if (!file) return;
    const shareUrl = `${window.location.origin}/s/${file.share_token}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl p-4 sm:p-6">
        <DialogHeader className="pr-6">
          <DialogTitle className="truncate text-base sm:text-lg">
            {file?.name ?? "File Preview"}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-muted-foreground">
            {file
              ? `${file.mime_type} · ${formatBytes(file.size_bytes)} · Uploaded ${formatRelativeTime(file.created_at)}`
              : null}
          </DialogDescription>
        </DialogHeader>

        {/* Media Preview Container */}
        <div className="my-2 grid min-h-56 place-items-center overflow-hidden rounded-2xl border border-border/60 bg-surface-2/70 backdrop-blur-md">
          {!url ? (
            <div className="flex flex-col items-center gap-2 p-8 text-muted-foreground">
              <Loader2 className="size-7 animate-spin text-primary" />
              <span className="text-xs">Preparing preview…</span>
            </div>
          ) : kind === "image" ? (
            <div className="flex max-h-[60vh] w-full items-center justify-center p-2">
              <img
                src={url}
                alt={file?.name ?? "Image preview"}
                className="max-h-[58vh] max-w-full rounded-xl object-contain shadow-md"
              />
            </div>
          ) : kind === "video" ? (
            <div className="relative flex aspect-video max-h-[60vh] w-full items-center justify-center bg-black/90 rounded-xl overflow-hidden">
              <video
                src={url}
                controls
                playsInline
                autoPlay={false}
                className="size-full object-contain"
              >
                Your browser does not support HTML5 video playback.
              </video>
            </div>
          ) : kind === "audio" ? (
            <div className="flex w-full flex-col items-center gap-4 p-8">
              <span className="grid size-16 place-items-center rounded-2xl bg-surface shadow-inner">
                <Music className="size-8 text-chart-2" />
              </span>
              <p className="max-w-md text-center text-sm font-medium">{file?.name}</p>
              <audio src={url} controls className="w-full max-w-md" />
            </div>
          ) : kind === "pdf" ? (
            <div className="h-[60vh] w-full">
              <iframe
                src={url}
                title={file?.name ?? "PDF preview"}
                className="size-full rounded-xl border-0"
              />
            </div>
          ) : kind === "text" ? (
            <div className="max-h-[58vh] w-full overflow-auto p-4">
              {loadingText ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="size-5 animate-spin text-primary" />
                </div>
              ) : (
                <pre className="rounded-xl bg-background/80 p-4 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap select-text border border-border/70">
                  {textContent}
                </pre>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-surface shadow-inner">
                <FileText className="size-7 text-muted-foreground" />
              </span>
              <div>
                <p className="text-sm font-medium">Binary / Document File</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Direct browser preview is not available for this format. Download to view locally.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
          <div className="flex items-center gap-2">
            {file?.is_public ? (
              <Button
                variant="glass"
                size="sm"
                onClick={() => void copyShareLink()}
                className="gap-1.5 text-xs"
              >
                <Copy className="size-3.5" /> Copy public link
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {url ? (
              <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs">
                <a href={url} target="_blank" rel="noreferrer noopener">
                  <ExternalLink className="size-3.5" /> Open in tab
                </a>
              </Button>
            ) : null}
            <Button variant="hero" size="sm" onClick={onDownload} className="gap-1.5 text-xs">
              <Download className="size-3.5" /> Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
