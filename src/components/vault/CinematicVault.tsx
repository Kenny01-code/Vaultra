import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function CinematicVault({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = node.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        setTilt({ x: Math.max(-1, Math.min(1, px)) * 14, y: Math.max(-1, Math.min(1, py)) * -10 });
      });
    };
    const onLeave = () => setTilt({ x: 0, y: 0 });
    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerleave", onLeave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const bolts = Array.from({ length: 16 }, (_, i) => i * (360 / 16));
  const ticks = Array.from({ length: 60 }, (_, i) => i * 6);
  const majorTicks = Array.from({ length: 12 }, (_, i) => i * 30);

  return (
    <div className={cn("w-full select-none", className)}>
      <div
        ref={ref}
        className="scene relative mx-auto aspect-square w-full max-w-[22rem] sm:max-w-[28rem] lg:max-w-[36rem]"
        aria-hidden="true"
      >
        {/* ── Ambient volumetric lighting ── */}
        <div className="pointer-events-none absolute -inset-12 rounded-full bg-[radial-gradient(ellipse_at_50%_28%,oklch(1_0_0/0.22),transparent_58%)] blur-3xl" />
        <div className="pointer-events-none absolute -inset-8 rounded-full bg-[radial-gradient(ellipse_at_30%_70%,oklch(0.6_0_0/0.08),transparent_55%)] blur-2xl" />
        <div className="pointer-events-none absolute -inset-8 rounded-full bg-[radial-gradient(ellipse_at_75%_20%,oklch(0.9_0_0/0.06),transparent_50%)] blur-2xl" />

        <div
          className="layer-3d absolute inset-0 transition-transform duration-700 ease-[var(--ease-premium)] gpu"
          style={{ transform: `rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)` }}
        >
          {/* ── Floor shadow + ground reflection ── */}
          <div
            className="absolute inset-x-[8%] bottom-[4%] h-20 rounded-[50%] blur-2xl"
            style={{
              background:
                "radial-gradient(ellipse at center, oklch(0 0 0 / 0.92), transparent 70%)",
              transform: "translateZ(-200px) scaleY(0.35)",
            }}
          />
          <div
            className="absolute inset-x-[14%] bottom-[2%] h-16 rounded-[50%] blur-xl"
            style={{
              background:
                "radial-gradient(ellipse at center, oklch(1 0 0 / 0.07), transparent 68%)",
              transform: "translateZ(-180px) scaleY(0.3)",
            }}
          />

          {/* ── Outer atmosphere rings ── */}
          {[
            { inset: "1%", z: -120, rx: 74, dur: "28s", opacity: "0.5" },
            { inset: "6%", z: -90, rx: 68, dur: "42s", opacity: "0.4", reverse: true },
            { inset: "11%", z: -60, rx: 62, dur: "58s", opacity: "0.3" },
          ].map((ring, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-foreground/20"
              style={{
                inset: ring.inset,
                opacity: ring.opacity,
                animation: `orbit ${ring.dur} linear infinite ${ring.reverse ? "reverse" : ""}`,
                transform: `translateZ(${ring.z}px) rotateX(${ring.rx}deg)`,
                boxShadow: "0 0 12px oklch(1 0 0 / 0.06)",
              }}
            />
          ))}

          {/* ══════════════════════════════════════════
              VAULT DOOR ASSEMBLY
          ══════════════════════════════════════════ */}
          <div
            className="layer-3d absolute left-1/2 top-1/2 aspect-square w-[72%]"
            style={{ transform: "translate(-50%, -50%) translateZ(80px)" }}
          >
            {/* Outer mounting flange — deep cast iron */}
            <div
              className="absolute rounded-full"
              style={{
                inset: "-10%",
                background:
                  "conic-gradient(from 120deg, oklch(0.22 0 0), oklch(0.10 0 0) 20%, oklch(0.26 0 0) 40%, oklch(0.09 0 0) 60%, oklch(0.24 0 0) 80%, oklch(0.10 0 0) 90%, oklch(0.22 0 0))",
                boxShadow:
                  "0 0 0 2px oklch(1 0 0 / 0.08), 0 40px 80px -20px oklch(0 0 0 / 0.95), inset 0 2px 0 oklch(1 0 0 / 0.12)",
              }}
            />

            {/* Mounting flange engraved ring detail */}
            <div
              className="absolute rounded-full border border-foreground/[0.06]"
              style={{ inset: "-7%" }}
            />
            <div
              className="absolute rounded-full border border-foreground/[0.04]"
              style={{ inset: "-4%" }}
            />

            {/* Mounting bolts on flange */}
            {Array.from({ length: 8 }, (_, i) => i * 45).map((deg) => (
              <div
                key={`flange-bolt-${deg}`}
                className="absolute left-1/2 top-1/2"
                style={{ transform: `translate(-50%,-50%) rotate(${deg}deg) translateY(-46%)` }}
              >
                <div
                  className="size-3 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle at 35% 28%, oklch(0.65 0 0), oklch(0.18 0 0) 70%)",
                    boxShadow: "0 1px 3px oklch(0 0 0 / 0.9), inset 0 1px 0 oklch(1 0 0 / 0.2)",
                    transform: `rotate(${-deg}deg)`,
                  }}
                >
                  {/* hex socket */}
                  <div
                    className="absolute inset-[30%] rounded-sm bg-[oklch(0.08_0_0)] opacity-80"
                    style={{
                      clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                    }}
                  />
                </div>
              </div>
            ))}

            {/* Inner jamb / door surround — polished dark steel */}
            <div
              className="absolute rounded-full"
              style={{
                inset: "-2%",
                background:
                  "conic-gradient(from 45deg, oklch(0.32 0 0), oklch(0.14 0 0) 15%, oklch(0.38 0 0) 30%, oklch(0.12 0 0) 50%, oklch(0.35 0 0) 65%, oklch(0.13 0 0) 80%, oklch(0.32 0 0))",
                boxShadow: "inset 0 4px 32px oklch(0 0 0 / 0.95), 0 0 0 1px oklch(1 0 0 / 0.1)",
              }}
            />

            {/* ── Main vault door face — brushed titanium ── */}
            <div
              className="absolute inset-0 overflow-hidden rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, oklch(0.38 0 0), oklch(0.20 0 0) 8%, oklch(0.44 0 0) 17%, oklch(0.18 0 0) 25%, oklch(0.40 0 0) 33%, oklch(0.19 0 0) 42%, oklch(0.43 0 0) 50%, oklch(0.18 0 0) 58%, oklch(0.41 0 0) 67%, oklch(0.20 0 0) 75%, oklch(0.44 0 0) 83%, oklch(0.19 0 0) 92%, oklch(0.38 0 0))",
                boxShadow: "inset 0 0 80px oklch(0 0 0 / 0.8), inset 0 4px 0 oklch(1 0 0 / 0.08)",
              }}
            >
              {/* Brushed grain texture */}
              <div className="bg-noise absolute inset-0 opacity-40 mix-blend-overlay" />

              {/* Primary specular — top-left key light */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 70% 55% at 28% 18%, oklch(1 0 0 / 0.28), transparent 60%)",
                }}
              />
              {/* Secondary specular — bottom-right fill */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 50% 40% at 76% 82%, oklch(1 0 0 / 0.08), transparent 55%)",
                }}
              />
              {/* Edge vignette */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 50% 50%, transparent 55%, oklch(0 0 0 / 0.7) 100%)",
                }}
              />

              {/* ── Precision machined concentric rings ── */}
              {[
                { inset: "5%", dur: "80s", opacity: 0.12 },
                { inset: "11%", dur: "0s", opacity: 0.09 },
                { inset: "17%", dur: "65s", opacity: 0.11, reverse: true },
                { inset: "23%", dur: "0s", opacity: 0.07 },
              ].map((r, i) => (
                <div
                  key={`ring-${i}`}
                  className="absolute rounded-full"
                  style={{
                    inset: r.inset,
                    border: "1px solid oklch(1 0 0 / 1)",
                    opacity: r.opacity,
                    animation:
                      r.dur !== "0s"
                        ? `orbit ${r.dur} linear infinite ${r.reverse ? "reverse" : ""}`
                        : undefined,
                  }}
                />
              ))}

              {/* ── Security bolt heads (16 bolts) ── */}
              {bolts.map((deg) => (
                <div
                  key={`bolt-${deg}`}
                  className="absolute left-1/2 top-1/2"
                  style={{ transform: `translate(-50%,-50%) rotate(${deg}deg) translateY(-40%)` }}
                >
                  <div
                    className="size-[1.1rem] rounded-full"
                    style={{
                      background:
                        "radial-gradient(circle at 32% 26%, oklch(0.78 0 0), oklch(0.28 0 0) 55%, oklch(0.12 0 0))",
                      boxShadow:
                        "0 2px 4px oklch(0 0 0 / 0.95), inset 0 1px 0 oklch(1 0 0 / 0.35), 0 0 0 1px oklch(0 0 0 / 0.5)",
                      transform: `rotate(${-deg}deg)`,
                    }}
                  >
                    {/* Torx socket */}
                    <div
                      className="absolute inset-[28%] opacity-70"
                      style={{
                        background: "oklch(0.06 0 0)",
                        clipPath:
                          "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
                      }}
                    />
                  </div>
                </div>
              ))}

              {/* ══════════════════════════════════
                  COMBINATION DIAL — ultra-detailed
              ══════════════════════════════════ */}
              <div className="absolute left-1/2 top-1/2 size-[42%] -translate-x-1/2 -translate-y-1/2">
                {/* Dial outer bezel */}
                <div
                  className="absolute -inset-[6%] rounded-full"
                  style={{
                    background:
                      "conic-gradient(from 60deg, oklch(0.28 0 0), oklch(0.12 0 0) 20%, oklch(0.32 0 0) 40%, oklch(0.10 0 0) 60%, oklch(0.30 0 0) 80%, oklch(0.12 0 0) 90%, oklch(0.28 0 0))",
                    boxShadow:
                      "0 8px 24px oklch(0 0 0 / 0.9), inset 0 2px 0 oklch(1 0 0 / 0.15), 0 0 0 1px oklch(1 0 0 / 0.08)",
                  }}
                />

                {/* Spinning dial body */}
                <div
                  className="absolute inset-0 rounded-full overflow-hidden"
                  style={{
                    background:
                      "conic-gradient(from 0deg, oklch(0.46 0 0), oklch(0.22 0 0) 12%, oklch(0.52 0 0) 25%, oklch(0.20 0 0) 38%, oklch(0.48 0 0) 50%, oklch(0.21 0 0) 63%, oklch(0.50 0 0) 75%, oklch(0.20 0 0) 88%, oklch(0.46 0 0))",
                    boxShadow:
                      "inset 0 0 24px oklch(0 0 0 / 0.85), 0 12px 36px -8px oklch(0 0 0 / 0.9)",
                    animation: "orbit 10s linear infinite",
                  }}
                >
                  {/* Dial specular */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(ellipse 65% 50% at 30% 20%, oklch(1 0 0 / 0.22), transparent 55%)",
                    }}
                  />
                  <div className="bg-noise absolute inset-0 opacity-25 mix-blend-overlay" />

                  {/* 60 fine ticks */}
                  {ticks.map((deg) => {
                    const isMajor = deg % 30 === 0;
                    const isMid = deg % 6 === 0;
                    return (
                      <span
                        key={`tick-${deg}`}
                        className="absolute left-1/2 top-1/2 origin-center"
                        style={{
                          width: isMajor ? "2px" : isMid ? "1.5px" : "1px",
                          height: isMajor ? "14%" : isMid ? "9%" : "6%",
                          background: isMajor
                            ? "oklch(1 0 0 / 0.85)"
                            : isMid
                              ? "oklch(1 0 0 / 0.5)"
                              : "oklch(1 0 0 / 0.25)",
                          transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-44%)`,
                        }}
                      />
                    );
                  })}

                  {/* Major tick number markers */}
                  {majorTicks.map((deg, i) => (
                    <span
                      key={`num-${deg}`}
                      className="absolute left-1/2 top-1/2 font-mono text-[5px] font-bold leading-none text-foreground/60"
                      style={{
                        transform: `translate(-50%,-50%) rotate(${deg}deg) translateY(-34%) rotate(${-deg}deg)`,
                      }}
                    >
                      {i * 5 === 0 ? "0" : i * 5}
                    </span>
                  ))}

                  {/* Cross spokes */}
                  {[0, 45, 90, 135].map((deg) => (
                    <span
                      key={`spoke-${deg}`}
                      className="absolute left-1/2 top-1/2 rounded-full"
                      style={{
                        width: "6%",
                        height: "72%",
                        background:
                          "linear-gradient(180deg, oklch(0.68 0 0), oklch(0.26 0 0) 50%, oklch(0.68 0 0))",
                        boxShadow: "0 2px 8px oklch(0 0 0 / 0.7)",
                        transform: `translate(-50%,-50%) rotate(${deg}deg)`,
                      }}
                    />
                  ))}
                </div>

                {/* Hub cap — polished chrome dome */}
                <div
                  className="absolute left-1/2 top-1/2 size-[32%] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle at 32% 26%, oklch(1 0 0), oklch(0.75 0 0) 30%, oklch(0.42 0 0) 60%, oklch(0.18 0 0))",
                    boxShadow:
                      "0 0 0 2px oklch(0 0 0 / 0.6), 0 0 40px oklch(1 0 0 / 0.5), inset 0 2px 4px oklch(1 0 0 / 0.6)",
                  }}
                />

                {/* Hub ring */}
                <div
                  className="absolute left-1/2 top-1/2 size-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    border: "1.5px solid oklch(1 0 0 / 0.25)",
                    boxShadow: "0 0 16px oklch(1 0 0 / 0.15)",
                  }}
                />

                {/* Status LED — top of dial */}
                <div
                  className="absolute left-1/2 top-[-10%] size-2 -translate-x-1/2 rounded-full"
                  style={{
                    background: "oklch(0.95 0 0)",
                    boxShadow: "0 0 6px 2px oklch(1 0 0 / 0.7), 0 0 18px oklch(1 0 0 / 0.4)",
                    animation: "tick-glow 2s ease-in-out infinite",
                  }}
                />
                {/* LED label */}
                <div className="absolute left-1/2 top-[-22%] -translate-x-1/2 font-mono text-[5px] uppercase tracking-widest text-foreground/40">
                  ARMED
                </div>
              </div>

              {/* ── Laser biometric scan sweep ── */}
              <div
                className="absolute inset-x-0 top-0 h-full"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 42%, oklch(1 0 0 / 0.18) 50%, oklch(1 0 0 / 0.06) 54%, transparent 58%)",
                  animation: "scan 6s ease-in-out infinite",
                }}
              />

              {/* Sheen sweep */}
              <div className="sheen absolute inset-0" />
            </div>

            {/* ── Door edge depth bevel ── */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                boxShadow:
                  "inset 0 -6px 20px oklch(0 0 0 / 0.6), inset 0 6px 12px oklch(1 0 0 / 0.06)",
                pointerEvents: "none",
              }}
            />
          </div>

          {/* ── Floating encrypted file chips ── */}
          {[
            {
              pos: "left-[-4%] top-[8%]",
              z: 220,
              delay: "0s",
              name: "contract.pdf",
              tag: "AES-256",
              dot: "oklch(0.95 0 0)",
            },
            {
              pos: "right-[-5%] top-[22%]",
              z: 180,
              delay: "1.1s",
              name: "keynote.mp4",
              tag: "Private",
              dot: "oklch(0.8 0 0)",
            },
            {
              pos: "left-[0%] bottom-[14%]",
              z: 160,
              delay: "2.3s",
              name: "design.png",
              tag: "Owner-only",
              dot: "oklch(0.9 0 0)",
            },
            {
              pos: "right-[-2%] bottom-[8%]",
              z: 240,
              delay: "0.6s",
              name: "backup.zip",
              tag: "Expiring link",
              dot: "oklch(0.7 0 0)",
            },
          ].map((chip) => (
            <div
              key={chip.name}
              className={cn(
                "glass-strong animate-float absolute rounded-2xl shadow-[var(--shadow-elevated)]",
                chip.pos,
              )}
              style={{
                transform: `translateZ(${chip.z}px)`,
                animationDelay: chip.delay,
                padding: "8px 12px",
                backdropFilter: "blur(24px) saturate(180%)",
                border: "1px solid oklch(1 0 0 / 0.14)",
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{
                    background: chip.dot,
                    boxShadow: `0 0 8px ${chip.dot}`,
                    animation: "tick-glow 2.4s ease-in-out infinite",
                    animationDelay: chip.delay,
                  }}
                />
                <span className="font-mono text-[9px] font-medium tracking-tight text-foreground/90 sm:text-[10px]">
                  {chip.name}
                </span>
              </div>
              <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-muted-foreground sm:text-[9px]">
                {chip.tag}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Caption */}
      <div className="mx-auto mt-8 max-w-sm text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-surface/60 px-3 py-1 backdrop-blur-sm">
          <span
            className="size-1.5 rounded-full bg-foreground"
            style={{
              boxShadow: "0 0 8px oklch(1 0 0 / 0.8)",
              animation: "tick-glow 2s ease-in-out infinite",
            }}
          />
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Vault status · sealed
          </p>
        </div>
        <p className="mt-3 text-xs text-muted-foreground sm:text-sm">
          Military-grade AES-256 encryption at rest — nothing leaves the vault until you mint a
          short-lived signed link.
        </p>
      </div>
    </div>
  );
}
