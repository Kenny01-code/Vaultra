import { cn } from "@/lib/utils";

/** Vaultra mark Ã¢â‚¬â€ a monochrome aperture/vault dial built from concentric
 * segments. Used as the site icon everywhere (header, footer, share pages). */
export function VaultraMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-5", className)} aria-hidden="true">
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

/**
 * "Vaultra" wordmark with a premium writing animation: each glyph draws in
 * from below with a slight 3D rotation, then a specular light sweeps across
 * the finished word. Fully static under `prefers-reduced-motion`.
 */
export function Wordmark({ className }: { className?: string }) {
  const letters = "Vaultra".split("");

  return (
    <span
      className={cn(
        "font-display relative inline-flex items-baseline text-lg font-semibold tracking-tight",
        className,
      )}
      aria-label="Vaultra"
    >
      <span className="inline-flex items-baseline [transform-style:preserve-3d]" aria-hidden="true">
        {letters.map((letter, index) => (
          <span
            key={`${letter}-${index}`}
            className={cn(
              "inline-block will-change-transform",
              index >= 5 ? "text-muted-foreground" : "text-foreground",
            )}
            style={{
              animation: `letter-in 0.62s var(--ease-premium) both`,
              animationDelay: `${0.06 * index + 0.05}s`,
            }}
          >
            {letter}
          </span>
        ))}
      </span>
      {/* specular sweep across the finished word */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,transparent_38%,oklch(1_0_0/0.85)_50%,transparent_62%)] bg-[length:220%_100%] bg-clip-text text-transparent"
        style={{ animation: "wordmark-shine 3.6s var(--ease-premium) 0.6s infinite" }}
      >
        Vaultra
      </span>
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
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative grid size-8 shrink-0 place-items-center rounded-xl border border-border bg-surface-2 ">
        <VaultraMark className="size-4 text-foreground " />
      </span>
      {showWordmark ? <Wordmark className="!text-base whitespace-nowrap leading-none tracking-tight " /> : null}
    </span>
  );
}

