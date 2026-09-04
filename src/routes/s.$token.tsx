import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, ExternalLink, FileText, FileWarning, Loader2, Music } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/vault/Logo";
import { fileKind, formatBytes, formatRelativeTime } from "@/lib/format";
import { getSharedFile } from "@/lib/files.functions";

type SharedFileData = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  url: string;
};

export const Route = createFileRoute("/s/$token")({
  loader: async ({ params }) => {
    try {
      return await getSharedFile({ data: { token: params.token } });
    } catch {
      return { found: false as const };
    }
  },
  head: ({ loaderData }) => {
    const name = loaderData && loaderData.found ? loaderData.file.name : null;
    const title = name ? `${name} — Shared via Vaultra` : "Link unavailable — Vaultra";
    const description = name
      ? `Preview and download "${name}", shared securely through Vaultra with an expiring link.`
      : "This Vaultra share link is no longer available.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(name ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  component: SharePage,
});

function SharedPreview({ url, mimeType, name }: { url: string; mimeType: string; name: string }) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const kind = fileKind(mimeType, name);
  const frame =
    "w-full rounded-2xl border border-border/70 bg-surface/60 shadow-[var(--shadow-card)] overflow-hidden";

  useEffect(() => {
    if (url && kind === "text") {
      setLoadingText(true);
      fetch(url)
        .then((res) => (res.ok ? res.text() : Promise.reject(new Error("Failed to load text"))))
        .then((text) => setTextContent(text.slice(0, 100_000)))
        .catch(() => setTextContent("Unable to preview text content directly."))
        .finally(() => setLoadingText(false));
    }
  }, [url, kind]);

  if (kind === "image") {
    return (
      <div className={`${frame} flex items-center justify-center p-3`}>
        <img src={url} alt={name} className="max-h-[70vh] max-w-full rounded-xl object-contain" />
      </div>
    );
  }
  if (kind === "video") {
    return (
      <div
        className={`${frame} relative aspect-video max-h-[70vh] bg-black/90 flex items-center justify-center`}
      >
        <video src={url} controls playsInline className="size-full object-contain">
          Your browser does not support HTML5 video.
        </video>
      </div>
    );
  }
  if (kind === "audio") {
    return (
      <div className={`${frame} flex flex-col items-center gap-4 p-8 text-center`}>
        <span className="grid size-16 place-items-center rounded-2xl bg-surface shadow-inner">
          <Music className="size-8 text-chart-2" />
        </span>
        <p className="max-w-md text-sm font-medium">{name}</p>
        <audio src={url} controls className="w-full max-w-md" />
      </div>
    );
  }
  if (kind === "pdf") {
    return (
      <div className={`${frame} h-[70vh]`}>
        <iframe src={url} title={name} className="size-full border-0" />
      </div>
    );
  }
  if (kind === "text") {
    return (
      <div className={`${frame} max-h-[70vh] overflow-auto p-4`}>
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
    );
  }

  return (
    <div className={`${frame} flex flex-col items-center gap-3 p-10 text-center`}>
      <span className="grid size-14 place-items-center rounded-2xl bg-surface shadow-inner">
        <FileText className="size-7 text-muted-foreground" />
      </span>
      <div>
        <p className="text-sm font-medium">Binary / Archive File</p>
        <p className="mt-1 text-xs text-muted-foreground">
          No inline preview is available for this file type — download it below to view.
        </p>
      </div>
    </div>
  );
}

function SharePage() {
  const loaderData = Route.useLoaderData();
  const fileData: SharedFileData | null = loaderData?.found ? loaderData.file : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="glass-strong sticky top-0 z-30 border-b border-border/70 pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="focus-ring rounded-xl">
            <Logo />
          </Link>
          <Button asChild variant="ghost" size="sm" className="min-h-[38px] text-xs">
            <Link to="/auth">Create your vault</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12 pb-20">
        {!fileData ? (
          <div className="glass mx-auto max-w-md rounded-3xl p-6 text-center sm:p-10 shadow-[var(--shadow-elevated)]">
            <FileWarning className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
            <h1 className="mt-4 font-display text-lg font-semibold sm:text-xl">
              This link is unavailable
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
              The file was marked private by its owner, deleted, or the share link is invalid.
            </p>
            <Button asChild variant="hero" className="mt-6 w-full sm:w-auto">
              <Link to="/">Back to Vaultra</Link>
            </Button>
          </div>
        ) : (
          <div className="animate-fade-up space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-border/60 pb-5">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Shared file
                </span>
                <h1
                  className="mt-2 truncate font-display text-lg font-semibold sm:text-2xl"
                  title={fileData.name}
                >
                  {fileData.name}
                </h1>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {formatBytes(fileData.sizeBytes)} ·{" "}
                  {fileData.mimeType || "application/octet-stream"} · Uploaded{" "}
                  {formatRelativeTime(fileData.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs">
                  <a href={fileData.url} target="_blank" rel="noreferrer noopener">
                    <ExternalLink className="size-3.5" /> Open
                  </a>
                </Button>
                <Button asChild variant="hero" size="sm" className="gap-1.5 text-xs">
                  <a href={fileData.url} download={fileData.name}>
                    <Download className="size-3.5" aria-hidden="true" /> Download
                  </a>
                </Button>
              </div>
            </div>

            <SharedPreview url={fileData.url} mimeType={fileData.mimeType} name={fileData.name} />
          </div>
        )}
      </main>
    </div>
  );
}
