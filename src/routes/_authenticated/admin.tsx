import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  FileCheck2,
  HardDrive,
  Lock,
  Share2,
  Shield,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/vault/AppShell";
import { AnalyticsCharts, type KindSlice, type TrendPoint } from "@/components/vault/AnalyticsCharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes, formatRelativeTime } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { FileTypeIcon } from "@/components/vault/FileTypeIcon";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

function kindOf(mimeType: string, fileName = ""): string {
  const mime = (mimeType || "").toLowerCase();
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/")) return "Images";
  if (mime.startsWith("video/")) return "Video";
  if (mime.startsWith("audio/")) return "Audio";
  if (mime === "application/pdf" || ext === "pdf") return "PDF";
  if (mime.startsWith("text/") || ["json", "csv", "md", "txt", "log"].includes(ext)) return "Text/Code";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "Archives";
  return "Other";
}

function groupByKind(rows: { mime_type: string; name?: string; size_bytes: number | string }[]): KindSlice[] {
  const map = new Map<string, { files: number; bytes: number }>();
  for (const row of rows) {
    const kind = kindOf(row.mime_type, row.name ?? "");
    const entry = map.get(kind) ?? { files: 0, bytes: 0 };
    entry.files += 1;
    entry.bytes += Number(row.size_bytes ?? 0);
    map.set(kind, entry);
  }
  return [...map.entries()]
    .map(([kind, value]) => ({ kind, ...value }))
    .sort((a, b) => b.bytes - a.bytes);
}

function buildTrendData(rows: { created_at: string; size_bytes: number | string }[]): TrendPoint[] {
  const map = new Map<string, { files: number; bytes: number }>();

  // Aggregate by day (last 7 data points)
  for (const row of rows) {
    const dateStr = row.created_at
      ? new Date(row.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : "Recent";
    const entry = map.get(dateStr) ?? { files: 0, bytes: 0 };
    entry.files += 1;
    entry.bytes += Number(row.size_bytes ?? 0);
    map.set(dateStr, entry);
  }

  const points = [...map.entries()].map(([label, value]) => ({
    label,
    files: value.files,
    bytes: value.bytes,
  }));

  return points.slice(-7);
}

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console & Analytics — Vaultra" },
      {
        name: "description",
        content: "Site-wide overview of Vaultra accounts, stored files and real-time storage analytics.",
      },
      { property: "og:title", content: "Admin Console & Analytics — Vaultra" },
      { property: "og:description", content: "Operational metrics and analytics for Vaultra." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();

  // Hard guard: redirect anyone who is not the admin
  useEffect(() => {
    if (!loading && !isAdmin) {
      void router.navigate({ to: "/vault", replace: true });
    }
  }, [isAdmin, loading, router]);

  const overview = useQuery({
    queryKey: ["vault", "admin", "overview"],
    enabled: isAdmin, // don't even fetch unless confirmed admin
    staleTime: 15_000,
    queryFn: async () => {
      const [{ data: files, error: filesError }, { count, error: profilesError }] = await Promise.all([
        supabase.from("files").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      if (filesError) throw filesError;
      if (profilesError) throw profilesError;
      const rows = files ?? [];

      const kinds = groupByKind(rows);
      const trend = buildTrendData(rows);

      return {
        users: count ?? 0,
        files: rows.length,
        publicFiles: rows.filter((row) => row.is_public).length,
        privateFiles: rows.filter((row) => !row.is_public).length,
        bytes: rows.reduce((total, row) => total + Number(row.size_bytes ?? 0), 0),
        kinds,
        trend,
        recentFiles: rows.slice(0, 8),
      };
    },
  });

  const stats = overview.data;

  // While auth state resolves, show skeleton
  if (loading) {
    return (
      <AppShell title="Admin console & analytics">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-24 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      </AppShell>
    );
  }

  // Non-admin: show access denied while redirect fires
  if (!isAdmin) {
    return (
      <AppShell title="Access denied">
        <div className="glass rounded-3xl p-10 text-center">
          <Shield className="mx-auto mb-4 size-12 text-muted-foreground opacity-40" />
          <p className="text-sm font-medium text-muted-foreground">
            This page is restricted to administrators only.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Admin console & analytics"
      subtitle="Comprehensive insights across accounts, storage consumption, file categories, and public shares."
    >
      {overview.isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} className="h-24 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      ) : overview.isError ? (
        <div className="glass rounded-2xl p-6 text-center text-muted-foreground">
          <p className="text-sm">{(overview.error as Error).message}</p>
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Top KPI Metrics Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="glass rounded-2xl p-4 sm:p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px]">
                  Accounts
                </p>
                <Users className="size-4 text-primary opacity-80" />
              </div>
              <p className="mt-2 font-display text-xl font-semibold sm:text-3xl">{stats.users}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Active vault users</p>
            </div>

            <div className="glass rounded-2xl p-4 sm:p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px]">
                  Files stored
                </p>
                <FileCheck2 className="size-4 text-primary opacity-80" />
              </div>
              <p className="mt-2 font-display text-xl font-semibold sm:text-3xl">{stats.files}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{stats.privateFiles} private · {stats.publicFiles} shared</p>
            </div>

            <div className="glass rounded-2xl p-4 sm:p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px]">
                  Total storage
                </p>
                <HardDrive className="size-4 text-primary opacity-80" />
              </div>
              <p className="mt-2 font-display text-xl font-semibold sm:text-3xl">{formatBytes(stats.bytes)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Encrypted at rest</p>
            </div>

            <div className="glass rounded-2xl p-4 sm:p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px]">
                  Public shares
                </p>
                <Share2 className="size-4 text-primary opacity-80" />
              </div>
              <p className="mt-2 font-display text-xl font-semibold sm:text-3xl">{stats.publicFiles}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Revocable links</p>
            </div>
          </div>

          {/* Interactive Recharts Analytics Visualization */}
          <AnalyticsCharts kinds={stats.kinds} trend={stats.trend} />

          {/* Category Distribution Breakdown */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="glass rounded-3xl p-5 sm:p-6 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-base font-semibold">Storage by file category</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Distribution of bytes across content types.
              </p>
              <ul className="mt-5 space-y-3.5">
                {stats.kinds.map((kind) => {
                  const pct = stats.bytes ? Math.round((kind.bytes / stats.bytes) * 100) : 0;
                  return (
                    <li key={kind.kind} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium truncate">{kind.kind}</span>
                        <span className="shrink-0 text-muted-foreground font-mono">
                          {kind.files} files · {formatBytes(kind.bytes)} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full bg-primary transition-[width] duration-700"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
                {stats.kinds.length === 0 ? (
                  <li className="text-xs text-muted-foreground py-4">No files recorded yet.</li>
                ) : null}
              </ul>
            </div>

            {/* Recent Upload Activity */}
            <div className="glass rounded-3xl p-5 sm:p-6 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-base font-semibold">Recent upload activity</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Latest files processed across all accounts.
              </p>
              <div className="mt-4 divide-y divide-border/60">
                {stats.recentFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between gap-3 py-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileTypeIcon mimeType={file.mime_type} name={file.name} className="size-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate max-w-[160px] sm:max-w-[220px]">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{formatBytes(Number(file.size_bytes))}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={file.is_public ? "default" : "secondary"} className="text-[10px] gap-1">
                        {file.is_public ? (
                          <>
                            <Share2 className="size-2.5" /> Public
                          </>
                        ) : (
                          <>
                            <Lock className="size-2.5" /> Private
                          </>
                        )}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground hidden xs:inline">
                        {formatRelativeTime(file.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
                {stats.recentFiles.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4">No uploads recorded yet.</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
