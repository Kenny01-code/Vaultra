import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAvatarUrl } from "@/features/vault/avatar";
import { profileQuery } from "@/features/vault/queries";
import { useAuth } from "@/hooks/useAuth";

/**
 * Public-header account slot: signed-out shows sign-in CTA, signed-in shows the
 * avatar which links straight to profile settings.
 */
export function HeaderAccount() {
  const { user, loading } = useAuth();
  const userId = user?.id ?? "";
  const profile = useQuery({ ...profileQuery(userId), enabled: Boolean(userId) });
  const avatar = useAvatarUrl(profile.data?.avatarUrl);

  if (loading) {
    return <span className="size-9 animate-pulse rounded-full bg-surface-2" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <>
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
        <Button asChild variant="hero" size="sm">
          <Link to="/auth">Get started</Link>
        </Button>
      </>
    );
  }

  const name = profile.data?.fullName ?? user.email ?? "Account";
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <>
      <Button asChild variant="glass" size="sm" className="hidden sm:inline-flex">
        <Link to="/vault">Open vault</Link>
      </Button>
      <Link
        to="/profile"
        aria-label="Profile settings"
        className="focus-ring group flex items-center gap-2 rounded-full border border-border/70 bg-surface/60 py-1 pl-1 pr-1 transition-colors hover:bg-surface-2 sm:pr-3"
      >
        <Avatar className="size-8 border border-border">
          {avatar ? <AvatarImage src={avatar} alt="" /> : null}
          <AvatarFallback className="bg-surface-2 text-[11px]">{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-28 truncate text-xs text-muted-foreground group-hover:text-foreground sm:block">
          {name}
        </span>
      </Link>
    </>
  );
}
