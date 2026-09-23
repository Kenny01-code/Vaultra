import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const GUEST_KEY = "vaultra-guest-mode";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Allow guest mode to access authenticated routes without a Supabase session
    if (typeof window !== "undefined" && localStorage.getItem(GUEST_KEY) === "1") {
      return { user: null };
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw redirect({
        to: "/auth",
        search: {
          redirect: location.href !== "/vault" ? location.href : undefined,
        },
      });
    }
    return { user };
  },
  component: () => <Outlet />,
});
