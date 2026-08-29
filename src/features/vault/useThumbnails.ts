import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fileKind } from "@/lib/format";
import type { VaultFile } from "./types";

// Global in-memory cache for instantly loaded thumbnail URLs
const inMemoryCache: Record<string, string> = {};

export function setThumbnailCache(storagePath: string, url: string) {
  inMemoryCache[storagePath] = url;
}

export function getThumbnailCache(storagePath: string): string | undefined {
  return inMemoryCache[storagePath];
}

export function useThumbnails(files: VaultFile[]) {
  const imagePaths = useMemo(
    () =>
      files
        .filter((f) => fileKind(f.mime_type, f.name) === "image")
        .map((f) => f.storage_path),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files.map((f) => f.storage_path).join(",")],
  );

  const { data } = useQuery({
    queryKey: ["vault", "thumbnails", imagePaths],
    enabled: imagePaths.length > 0,
    staleTime: Infinity, // Keep cached URLs fresh
    gcTime: 60 * 60_000, // 1 hour garbage collection
    initialData: () => {
      // Use any pre-cached thumbnail URLs immediately
      const initial: Record<string, string> = {};
      for (const path of imagePaths) {
        if (inMemoryCache[path]) {
          initial[path] = inMemoryCache[path];
        }
      }
      return Object.keys(initial).length > 0 ? initial : undefined;
    },
    queryFn: async () => {
      const results: Record<string, string> = { ...inMemoryCache };
      const missingPaths = imagePaths.filter((path) => !inMemoryCache[path]);

      if (missingPaths.length === 0) return results;

      await Promise.all(
        missingPaths.map(async (path) => {
          try {
            const { data, error } = await supabase.storage.from("vault").createSignedUrl(path, 60 * 60);
            if (error || !data?.signedUrl) throw error ?? new Error("Could not create thumbnail URL.");
            const url = data.signedUrl;
            inMemoryCache[path] = url;
            results[path] = url;
          } catch (err) {
            console.warn(`Could not load thumbnail for ${path}:`, err);
          }
        }),
      );

      return results;
    },
  });

  return data ?? inMemoryCache;
}
