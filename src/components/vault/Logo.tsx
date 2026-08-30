import { cn } from "@/lib/utils";

/** Vaultra mark — aperture/vault dial. Uses currentColor so it matches the theme. */
export function VaultraMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-4", className)} aria-hidden="true">
      <defs>
        <linearGradient id="vaultra-ink" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.62" />
        </linearGradient>
      </defs>
      <path
        d="M16 2.4 27.2 7v9.1c0 6.6-4.6 12.3-11.2 14.5C9.4 28.4 4.8 22.7 4.8 16.1V7L16 2.4Z"
        fill="none"
        stroke="url(#vaultra-ink)"
        strokeWidth="2.4"
      />
      <circle cx="16" cy="15.6" r="5.9" fill="none" stroke="currentColor" strokeWidth="1.8" opacity="0.85" />
      <circle cx="16" cy="15.6" r="2.1" fill="currentColor" />
      <path
        d="M16 6.9v3.1M16 21.2v3.2M7.7 15.6h3.2M21.1 15.6h3.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

/** Static wordmark — same on every page and screen size. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-base font-semibold leading-none tracking-tight text-foreground",
        className,
      )}
    >
      Vault<span className="text-muted-foreground">ra</span>
    </span>
  );
}

/** Single logo for landing, login, vault, and mobile header. */
export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-2.5", className)}>
      <span className="relative grid size-8 shrink-0 place-items-center rounded-xl border border-border bg-surface-2">
        <VaultraMark className="size-4 text-foreground" />
      </span>
      {showWordmark ? <Wordmark className="whitespace-nowrap" /> : null}
    </span>
  );
}