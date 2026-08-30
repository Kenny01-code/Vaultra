import { cn } from "@/lib/utils";

/**
 * Vaultra mark — full shield + inner vault core.
 * Geometry is inset so strokes are never clipped on small screens.
 */
export function VaultraMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-5", className)}
      aria-hidden="true"
      overflow="visible"
    >
      <defs>
        <linearGradient id="vaultra-ink" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <path
        d="M16 4.2 25.2 8v7.6c0 5.4-3.8 10.1-9.2 11.9C10.6 25.7 6.8 21 6.8 15.6V8L16 4.2Z"
        stroke="url(#vaultra-ink)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle
        cx="16"
        cy="15"
        r="4.4"
        stroke="currentColor"
        strokeWidth="1.6"
        opacity="0.9"
      />
      <circle cx="16" cy="15" r="1.7" fill="currentColor" />
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
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-2.5 overflow-visible",
        className,
      )}
    >
      <span className="relative grid size-9 shrink-0 place-items-center overflow-visible rounded-xl border border-border bg-surface-2">
        <VaultraMark className="size-5 text-foreground" />
      </span>
      {showWordmark ? <Wordmark className="whitespace-nowrap" /> : null}
    </span>
  );
}