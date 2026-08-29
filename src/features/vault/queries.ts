import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_QUOTA_BYTES, type VaultFile } from "./types";

export const filesQuery = (userId: string) =>
  queryOptions({
    queryKey: ["vault", "files", userId],
    queryFn: async (): Promise<VaultFile[]> => {
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VaultFile[];
    },
    staleTime: 20_000,
    gcTime: 5 * 60_000,
  });

export const profileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["vault", "profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      return {
        fullName: (data?.["full_name"] as string | null) ?? null,
        email: (data?.["email"] as string | null) ?? null,
        bio: (data?.["bio"] as string | null) ?? null,
        avatarUrl: (data?.["avatar_url"] as string | null) ?? null,
        quotaBytes: Number(data?.["storage_quota_bytes"] ?? DEFAULT_QUOTA_BYTES),
      };
    },
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  });
