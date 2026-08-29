import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  reloadUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
  reloadUser: async () => {},
});

const DEFAULT_QUOTA_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Create the profile row required by the dashboard on first Supabase sign-in.
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const syncProfile = async () => {
      try {
        const { data: existing, error: lookupError } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
        if (lookupError) throw lookupError;
        if (!isMounted || existing) return;
        const { error } = await supabase.from("profiles").insert({
            id: user.id,
            email: user.email ?? null,
            full_name: (user.user_metadata.full_name as string | undefined) ?? user.email?.split("@")[0] ?? null,
            avatar_url: (user.user_metadata.avatar_url as string | undefined) ?? null,
            bio: null,
            storage_quota_bytes: DEFAULT_QUOTA_BYTES,
          });
        if (error) throw error;

      } catch (err) {
        console.warn("Failed to sync profile/role document:", err);
      }
    };

    void syncProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    void supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setIsAdmin(data?.role === "admin"));
  }, [user]);

  const reloadUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
  };

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      isAdmin,
      signOut: async () => { await supabase.auth.signOut(); },
      reloadUser,
    }),
    [user, loading, isAdmin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
