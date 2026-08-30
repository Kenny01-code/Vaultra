import { useQuery } from "@tanstack/react-query";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { Globe, LayoutDashboard, Lock, LogOut, Plus, Shield, Upload, User } from "lucide-react";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo, VaultraMark } from "@/components/vault/Logo";
import { useAvatarUrl } from "@/features/vault/avatar";
import { profileQuery } from "@/features/vault/queries";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  icon: typeof Globe;
  to: "/vault" | "/profile" | "/admin";
  search?: { view: "recent" | "all" | "public" | "private" };
  match: (pathname: string, view: string | undefined) => boolean;
  adminOnly?: boolean;
};

const BASE_NAV: NavItem[] = [
  {
    label: "Vault",
    icon: LayoutDashboard,
    to: "/vault",
    search: { view: "recent" },
    match: (p, v) => p.startsWith("/vault") && (v === undefined || v === "recent" || v === "all"),
  },
  {
    label: "Shared",
    icon: Globe,
    to: "/vault",
    search: { view: "public" },
    match: (p, v) => p.startsWith("/vault") && v === "public",
  },
  {
    label: "Private",
    icon: Lock,
    to: "/vault",
    search: { view: "private" },
    match: (p, v) => p.startsWith("/vault") && v === "private",
  },
  {
    label: "Profile",
    icon: User,
    to: "/profile",
    match: (p) => p.startsWith("/profile"),
  },
  {
    label: "Admin Console",
    icon: Shield,
    to: "/admin",
    match: (p) => p.startsWith("/admin"),
    adminOnly: true,
  },
];

export function AppShell({
  children,
  onUploadClick,
  title,
  subtitle,
}: {
  children: ReactNode;
  onUploadClick?: () => void;
  title?: string;
  subtitle?: string;
  aside?: ReactNode;
}) {
  const { user, isAdmin, signOut } = useAuth();
  const router = useRouter();
  const userId = user?.id ?? "";

  const profile = useQuery({ ...profileQuery(userId), enabled: Boolean(userId) });
  const avatar = useAvatarUrl(profile.data?.avatarUrl);

  const location = useRouterState({ select: (state) => state.location });
  const pathname = location.pathname;
  const view = (location.search as { view?: string } | undefined)?.view;

  // Filter nav: admin-only items hidden unless user isAdmin
  const nav = BASE_NAV.filter((item) => !item.adminOnly || isAdmin);

  const name = profile.data?.fullName ?? user?.email ?? "Your vault";
  const initials = name.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    await router.navigate({ to: "/auth", replace: true });
  };

  const AccountMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="focus-ring flex size-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-transform active:scale-95"
          aria-label="Account menu"
        >
          <Avatar className="size-9 border border-border/80 shadow-sm">
            {avatar ? <AvatarImage src={avatar} alt="" /> : null}
            <AvatarFallback className="bg-surface-2 text-xs font-medium">{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-2xl shadow-[var(--shadow-elevated)]">
        <DropdownMenuLabel className="truncate">
          <span className="block text-sm font-medium">{name}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {user?.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/profile">
            <User className="size-4" /> Edit profile
          </Link>
        </DropdownMenuItem>
        {/* Admin console link ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â only visible to the admin */}
        {isAdmin ? (
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link to="/admin">
              <Shield className="size-4" /> Admin console &amp; analytics
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => void handleSignOut()}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ ["--shell-sidebar" as string]: "17rem" }}
    >
      <div className="pointer-events-none fixed inset-0 -z-10 bg-aurora opacity-70" aria-hidden="true" />

      {/* Desktop Sidebar (lg: screens) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--shell-sidebar)] flex-col border-r border-border/70 bg-sidebar/85 px-4 py-6 backdrop-blur-2xl lg:flex">
        <Link to="/" className="focus-ring rounded-xl px-1">
          <Logo />
        </Link>

        {onUploadClick ? (
          <Button
            variant="hero"
            className="mt-7 w-full gap-2 py-5 shadow-[var(--shadow-glow)]"
            onClick={onUploadClick}
          >
            <Upload className="size-4" aria-hidden="true" /> Upload files
          </Button>
        ) : null}

        <nav className="mt-7 flex flex-1 flex-col gap-1" aria-label="Main navigation">
          <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Workspace
          </p>
          {nav.map((item) => {
            const active = item.match(pathname, view);
            return (
              <Link
                key={item.label}
                to={item.to}
                {...(item.search ? { search: item.search } : {})}
                className={cn(
                  "focus-ring group flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-300",
                  active
                    ? "bg-surface-2 font-medium text-foreground shadow-[var(--shadow-card)]"
                    : "text-muted-foreground hover:bg-surface/70 hover:text-foreground",
                  item.adminOnly && "mt-2 border-t border-border/50 pt-3",
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
                <span
                  className={cn(
                    "ml-auto h-4 w-px rounded-full bg-foreground transition-all duration-300",
                    active ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border/70 bg-surface/60 p-3">
          {AccountMenu}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header (hidden on lg:) */}
      <header className="glass-strong sticky top-0 z-40 border-b border-border/70 pt-[env(safe-area-inset-top,0px)] lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Link to="/" className="focus-ring shrink-0 rounded-xl">
            <Logo />
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            {onUploadClick ? (
              <Button
                variant="glass"
                size="sm"
                onClick={onUploadClick}
                className="gap-1.5 min-h-[38px] text-xs font-medium"
              >
                <Upload className="size-4" aria-hidden="true" />
                <span>Upload</span>
              </Button>
            ) : null}
            {AccountMenu}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="lg:pl-[var(--shell-sidebar)]">
        <main className="mx-auto w-full max-w-7xl px-3 pb-28 pt-3.5 min-[380px]:px-3.5 sm:px-6 sm:pt-4 lg:px-10 lg:pb-16 lg:pt-8">
          {title ? (
            <div className="mb-6 stagger">
              <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl lg:text-3xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}
            </div>
          ) : null}
          {children}
        </main>

        <footer className="hidden border-t border-border/60 py-6 lg:block">
          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Logo className="scale-75 opacity-80" />
            <span>Encrypted-at-rest storage with owner-only access</span>
          </p>
        </footer>
      </div>

      {/* Mobile Floating Action Button for quick upload */}
      {onUploadClick ? (
        <button
          type="button"
          onClick={onUploadClick}
          aria-label="Upload file"
          className="glass-strong focus-ring fixed bottom-20 right-4 z-40 grid size-12 place-items-center rounded-full bg-brand text-primary-foreground shadow-[var(--shadow-glow)] transition-transform active:scale-95 lg:hidden"
        >
          <Plus className="size-6" />
        </button>
      ) : null}

      {/* Mobile Bottom Tab Bar (hidden on lg:) */}
      <nav
        className="glass-strong fixed inset-x-0 bottom-0 z-40 border-t border-border/70 pb-[env(safe-area-inset-bottom,0.75rem)] pt-1.5 lg:hidden"
        aria-label="Mobile navigation"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
          {nav.map((item) => {
            const active = item.match(pathname, view);
            return (
              <li key={item.label} className="flex-1">
                <Link
                  to={item.to}
                  {...(item.search ? { search: item.search } : {})}
                  className={cn(
                    "focus-ring flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] transition-all duration-200",
                    active ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-xl transition-all duration-200",
                      active ? "bg-surface-2 shadow-[var(--shadow-card)]" : "bg-transparent",
                    )}
                  >
                    <item.icon className="size-[1.1rem]" aria-hidden="true" />
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}


