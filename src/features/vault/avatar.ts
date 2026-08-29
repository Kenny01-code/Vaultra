import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAvatarUrl(avatarUrl: string | null | undefined) {
  const isRemote = Boolean(avatarUrl && /^https?:\/\//.test(avatarUrl));
  const path = avatarUrl && !isRemote ? avatarUrl : null;

  const { data } = useQuery({
    queryKey: ["vault", "avatar", path],
    enabled: Boolean(path),
    staleTime: 4 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("vault").createSignedUrl(path as string, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });

  if (isRemote) return avatarUrl as string;
  return data ?? null;
}
