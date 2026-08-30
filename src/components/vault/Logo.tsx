import { cn } from "@/lib/utils";

/** Official Vaultra mark — matches /vaultra-logo.svg (full shield, no crosshair). */
export function VaultraMark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      fill="none"
      className={cn("size-5", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="vaultra-logo-ink" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="currentColor" stopOpacity="1" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <path
        d="M64 14 104 32v32c0 24-16.5 44.5-40 53.5C40.5 108.5 24 88 24 64V32L64 14Z"
        stroke="url(#vaultra-logo-ink)"
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <circle cx="64" cy="62" r="20" stroke="currentColor" strokeWidth="5.5" />
      <circle cx="64" cy="62" r="7.5" fill="currentColor" />
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
      <span className="relative grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-surface-2">
        <VaultraMark className="size-5 text-foreground" />
      </span>
      {showWordmark ? <Wordmark className="whitespace-nowrap" /> : null}
    </span>
  );
}