import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Ultra-realistic iPhone 17 Pro Max device frame.
 * Titanium chassis, Dynamic Island, side buttons, USB-C port.
 * Renders an iframe of the current origin inside the screen.
 */
export function IPhoneFrame({
  className,
  src,
}: {
  className?: string;
  src?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const url = src ?? (typeof window !== "undefined" ? window.location.origin : "about:blank");

  return (
    <div className={cn("relative mx-auto select-none", className)} style={{ width: 320 }}>
      {/* ── Outer titanium chassis ── */}
      <div
        className="relative rounded-[52px] p-[3px]"
        style={{
          background:
            "conic-gradient(from 135deg, oklch(0.72 0 0), oklch(0.48 0 0) 20%, oklch(0.78 0 0) 40%, oklch(0.44 0 0) 60%, oklch(0.76 0 0) 80%, oklch(0.48 0 0) 90%, oklch(0.72 0 0))",
          boxShadow:
            "0 0 0 1px oklch(0 0 0 / 0.5), 0 40px 80px -20px oklch(0 0 0 / 0.9), 0 0 60px oklch(1 0 0 / 0.04), inset 0 1px 0 oklch(1 0 0 / 0.18)",
        }}
      >
        {/* Inner frame */}
        <div
          className="relative overflow-hidden rounded-[50px]"
          style={{
            background:
              "conic-gradient(from 120deg, oklch(0.14 0 0), oklch(0.08 0 0) 25%, oklch(0.16 0 0) 50%, oklch(0.07 0 0) 75%, oklch(0.14 0 0))",
            boxShadow: "inset 0 0 0 1px oklch(1 0 0 / 0.06)",
          }}
        >
          {/* Screen bezel */}
          <div className="relative overflow-hidden rounded-[48px] bg-black" style={{ margin: 3 }}>

            {/* ── Dynamic Island ── */}
            <div
              className="absolute left-1/2 top-[10px] z-20 -translate-x-1/2"
              style={{
                width: 120,
                height: 34,
                background: "oklch(0.04 0 0)",
                borderRadius: 20,
                boxShadow: "0 0 0 1px oklch(1 0 0 / 0.08), inset 0 1px 0 oklch(1 0 0 / 0.04)",
              }}
            >
              {/* Front camera dot */}
              <div
                className="absolute right-[22px] top-1/2 size-[10px] -translate-y-1/2 rounded-full"
                style={{
                  background: "radial-gradient(circle at 35% 30%, oklch(0.22 0 0), oklch(0.06 0 0))",
                  boxShadow: "inset 0 0 4px oklch(0 0 0 / 0.8), 0 0 0 1px oklch(1 0 0 / 0.06)",
                }}
              >
                <div
                  className="absolute left-1/2 top-1/2 size-[4px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ background: "oklch(0.12 0 0)", boxShadow: "0 0 3px oklch(0.4 0 0 / 0.3)" }}
                />
              </div>
            </div>

            {/* Screen content — iframe */}
            <div
              className="relative overflow-hidden bg-black"
              style={{ height: 693, borderRadius: 46 }}
            >
              {!loaded && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black">
                  <div
                    className="size-8 animate-spin rounded-full border-2 border-foreground/20"
                    style={{ borderTopColor: "oklch(0.985 0 0)" }}
                  />
                  <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/40">
                    Loading vault…
                  </p>
                </div>
              )}
              <iframe
                src={url}
                title="Vaultra preview"
                className="size-full border-0"
                style={{
                  width: "390px",
                  height: "844px",
                  transform: "scale(0.8205)",
                  transformOrigin: "top left",
                  pointerEvents: "auto",
                }}
                onLoad={() => setLoaded(true)}
              />
            </div>

            {/* Bottom home indicator */}
            <div className="flex justify-center pb-2 pt-1">
              <div
                className="h-[5px] w-[120px] rounded-full"
                style={{ background: "oklch(1 0 0 / 0.25)" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Side buttons — right (power) ── */}
      <div
        className="absolute right-[-4px] top-[120px] rounded-r-[3px]"
        style={{
          width: 4,
          height: 72,
          background:
            "linear-gradient(180deg, oklch(0.62 0 0), oklch(0.38 0 0) 40%, oklch(0.58 0 0))",
          boxShadow: "2px 0 4px oklch(0 0 0 / 0.6)",
        }}
      />

      {/* ── Side buttons — left (volume up) ── */}
      <div
        className="absolute left-[-4px] top-[100px] rounded-l-[3px]"
        style={{
          width: 4,
          height: 44,
          background:
            "linear-gradient(180deg, oklch(0.62 0 0), oklch(0.38 0 0) 40%, oklch(0.58 0 0))",
          boxShadow: "-2px 0 4px oklch(0 0 0 / 0.6)",
        }}
      />
      {/* volume down */}
      <div
        className="absolute left-[-4px] top-[158px] rounded-l-[3px]"
        style={{
          width: 4,
          height: 44,
          background:
            "linear-gradient(180deg, oklch(0.62 0 0), oklch(0.38 0 0) 40%, oklch(0.58 0 0))",
          boxShadow: "-2px 0 4px oklch(0 0 0 / 0.6)",
        }}
      />
      {/* mute toggle */}
      <div
        className="absolute left-[-4px] top-[60px] rounded-l-[3px]"
        style={{
          width: 4,
          height: 28,
          background:
            "linear-gradient(180deg, oklch(0.62 0 0), oklch(0.38 0 0) 40%, oklch(0.58 0 0))",
          boxShadow: "-2px 0 4px oklch(0 0 0 / 0.6)",
        }}
      />

      {/* ── USB-C port ── */}
      <div className="absolute bottom-[14px] left-1/2 -translate-x-1/2">
        <div
          className="rounded-[3px]"
          style={{
            width: 52,
            height: 8,
            background: "oklch(0.06 0 0)",
            boxShadow: "inset 0 1px 2px oklch(0 0 0 / 0.9), 0 0 0 1px oklch(1 0 0 / 0.06)",
          }}
        />
      </div>

      {/* ── Screen glare overlay ── */}
      <div
        className="pointer-events-none absolute inset-[3px] rounded-[50px]"
        style={{
          background:
            "linear-gradient(135deg, oklch(1 0 0 / 0.06) 0%, transparent 40%, transparent 60%, oklch(1 0 0 / 0.02) 100%)",
        }}
      />
    </div>
  );
}
