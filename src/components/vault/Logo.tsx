import { cn } from "@/lib/utils";

/**
 * Vaultra mark — clean vault/shield (no crosshair / aim lines).
 * Same icon on landing, login, vault, and mobile.
 */
export function VaultraMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-4", className)} aria-hidden="true">
      <defs>
        <linearGradient id="vaultra-ink" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <path
        d="M16 2.8 27 7.2v8.8c0 6.4-4.5 11.9-11 14-6.5-2.1-11-7.6-11-14V7.2L16 2.8Z"
        fill="none"
        stroke="url(#vaultra-ink)"
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      <circle
        cx="16"
        cy="15.2"
        r="5.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        opacity="0.9"
      />
      <circle cx="16" cy="15.2" r="2" fill="currentColor" />
    </svg>
  );
}

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