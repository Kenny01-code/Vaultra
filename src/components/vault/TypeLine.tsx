import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Modern terminal-style writing animation. Types the given phrases one
 * character at a time, holds, deletes, then moves to the next phrase.
 * Static (first phrase only) when reduced motion is preferred.
 */
export function TypeLine({
  phrases,
  className,
  speed = 46,
}: {
  phrases: string[];
  className?: string;
  speed?: number;
}) {
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduced || phrases.length === 0) return;
    const current = phrases[index % phrases.length] ?? "";

    if (!deleting && length === current.length) {
      const hold = setTimeout(() => setDeleting(true), 1600);
      return () => clearTimeout(hold);
    }
    if (deleting && length === 0) {
      setDeleting(false);
      setIndex((value) => (value + 1) % phrases.length);
      return;
    }
    const timer = setTimeout(
      () => setLength((value) => value + (deleting ? -1 : 1)),
      deleting ? speed / 2 : speed,
    );
    return () => clearTimeout(timer);
  }, [deleting, index, length, phrases, reduced, speed]);

  const current = phrases[index % phrases.length] ?? "";
  const text = reduced ? current : current.slice(0, length);

  return (
    <span className={cn("inline-flex items-baseline", className)} aria-label={current}>
      <span className="text-gradient">{text}</span>
      <span
        className="ml-1 inline-block h-[0.9em] w-[2px] translate-y-[0.05em] animate-[caret_1.05s_steps(1,end)_infinite] bg-foreground"
        aria-hidden="true"
      />
    </span>
  );
}
