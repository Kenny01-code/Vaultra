import { cn } from "@/lib/utils";

/**
 * VaultraMark — the official Vaultra icon.
 * Exact replica of /public/favicon.svg: shield + outer ring + centre dot + crosshair ticks.
 * Scales cleanly from 16 px (mobile nav) to 512 px (og-image / splash).
 * Uses currentColor so it adapts to any theme automatically.
 */
export function VaultraMark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      className={cn("size-5 shrink-0", className)}
      aria-hidden="true"
    >
      {/* Shield */}
      <path
        d="M16 2.5 27.5 7.2v9.2c0 6.8-4.7 12.6-11.5 14.8C9.2 29 4.5 23.2 4.5 16.4V7.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeOpacity="0.95"
      />
      {/* Outer ring */}
      <circle cx="16" cy="15.8" r="5.8" stroke="currentColor" strokeWidth="1.4" opacity="0.88" />
      {/* Centre dot */}
      <circle cx="16" cy="15.8" r="2.1" fill="currentColor" />
      {/* Crosshair ticks N / S / E / W */}
      <path
        d="M16 5.5v3.2M16 23.4v3.2M6.2 15.8h3.2M22.6 15.8h3.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.72"
      />
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
      {/* Icon container — dark pill that matches the favicon background */}
      <span className="relative grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-[#0f0f0f] shadow-sm">
        <VaultraMark className="size-[1.15rem] text-white" />
      </span>
      {showWordmark ? <Wordmark className="whitespace-nowrap" /> : null}
    </span>
  );
}
