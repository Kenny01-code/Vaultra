import { useState, type ReactElement } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";

import { AppleMark, GithubMark, GoogleMark } from "@/components/brand/BrandIcons";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { cn } from "@/lib/utils";

type Provider = "google" | "apple" | "github";

const LABELS: Record<Provider, string> = {
  google: "Google",
  apple: "Apple",
  github: "GitHub",
};

const MARKS: Record<Provider, (props: { className?: string }) => ReactElement> = {
  google: GoogleMark,
  apple: AppleMark,
  github: GithubMark,
};

const PROVIDERS: Provider[] = ["google", "apple", "github"];

export function SocialAuth({
  className,
  layout = "stack",
  redirectPath = "/vault",
}: {
  className?: string;
  layout?: "stack" | "row";
  redirectPath?: string;
}) {
  const [pending, setPending] = useState<Provider | null>(null);
  const router = useRouter();

  const start = async (provider: Provider) => {
    setPending(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}${redirectPath}` } });
      if (error) throw error;
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      // Do not toast if the user simply closed the popup window
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        toast.error(getAuthErrorMessage(error));
      }
    } finally {
      setPending(null);
    }
  };

  return (
    <div
      className={cn(
        layout === "row"
          ? "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
          : "grid gap-2",
        className,
      )}
    >
      {PROVIDERS.map((provider) => {
        const Mark = MARKS[provider];
        return (
          <Button
            key={provider}
            type="button"
            variant="glass"
            className="group w-full min-w-0 justify-center gap-2 px-3 text-[13px] transition-transform duration-300 hover:-translate-y-0.5 sm:text-sm"
            disabled={pending !== null}
            onClick={() => void start(provider)}
          >
            {pending === provider ? (
              <Loader2 className="size-4 shrink-0 animate-spin" />
            ) : (
              <Mark className="size-4 shrink-0" />
            )}
            <span className="truncate">Continue with {LABELS[provider]}</span>
          </Button>
        );
      })}
    </div>
  );
}
