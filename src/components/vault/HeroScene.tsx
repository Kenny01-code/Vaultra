"use client";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SocialAuth } from "@/components/auth/SocialAuth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/vault/Logo";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   PHASE TIMELINE
   0–2.8s  : character dances alone
   2.8–4.2s: character reaches out + form slides in
   4.2s+   : idle loop, form stays centred
───────────────────────────────────────────── */

export function HeroScene({ className }: { className?: string }) {
  const [phase, setPhase] = useState<"dance" | "reach" | "idle">("dance");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setPhase("reach"), 2800);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  useEffect(() => {
    if (phase !== "reach") return;
    timerRef.current = setTimeout(() => setPhase("idle"), 1400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase]);

  return (
    <div
      className={cn(
        "relative flex min-h-[520px] w-full items-center justify-center overflow-hidden sm:min-h-[600px] lg:min-h-[680px]",
        className,
      )}
      aria-hidden="true"
    >
      {/* ── Stage floor glow ── */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-32 w-[70%] -translate-x-1/2 rounded-[50%] blur-3xl"
        style={{ background: "radial-gradient(ellipse at center, oklch(1 0 0 / 0.07), transparent 70%)" }} />

      {/* ── Ambient particles ── */}
      <Particles />

      {/* ── Character ── */}
      <div
        className="absolute"
        style={{
          left: phase === "idle" ? "28%" : "50%",
          bottom: "12%",
          transform: phase === "idle" ? "translateX(-50%)" : "translateX(-50%)",
          transition: "left 1.2s cubic-bezier(0.22,1,0.36,1)",
          zIndex: 20,
        }}
      >
        <VaultGuardian phase={phase} />
      </div>

      {/* ── Auth form card ── */}
      <div
        style={{
          position: "absolute",
          right: phase === "dance" ? "-120%" : phase === "reach" ? "8%" : "8%",
          top: "50%",
          transform: "translateY(-50%)",
          transition: "right 1.1s cubic-bezier(0.22,1,0.36,1)",
          zIndex: 30,
          width: "min(340px, 88vw)",
          opacity: phase === "dance" ? 0 : 1,
          transitionProperty: "right, opacity",
          transitionDuration: "1.1s, 0.4s",
          transitionDelay: "0s, 0.2s",
        }}
      >
        <HeroFormCard />
      </div>

      {/* ── Stage shadow under character ── */}
      <div
        className="pointer-events-none absolute rounded-[50%] blur-xl"
        style={{
          width: 120,
          height: 24,
          background: "radial-gradient(ellipse at center, oklch(0 0 0 / 0.7), transparent 70%)",
          bottom: "9%",
          left: phase === "idle" ? "28%" : "50%",
          transform: "translateX(-50%)",
          transition: "left 1.2s cubic-bezier(0.22,1,0.36,1)",
          zIndex: 10,
        }}
      />
    </div>
  );
}

/* ─── Vault Guardian character ─────────────────────────────────────────────── */
function VaultGuardian({ phase }: { phase: "dance" | "reach" | "idle" }) {
  const dancing = phase === "dance";
  const reaching = phase === "reach";

  return (
    <div
      className="relative select-none"
      style={{
        width: 140,
        height: 260,
        animation: dancing ? "guardian-dance 0.9s ease-in-out infinite" : reaching ? "guardian-reach 1.2s ease-in-out forwards" : "guardian-idle 3s ease-in-out infinite",
      }}
    >
      {/* ── Body glow ── */}
      <div className="pointer-events-none absolute inset-0 rounded-full blur-2xl"
        style={{ background: "radial-gradient(ellipse at 50% 40%, oklch(1 0 0 / 0.18), transparent 65%)" }} />

      <svg viewBox="0 0 140 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 size-full drop-shadow-[0_0_24px_oklch(1_0_0/0.3)]">
        <defs>
          <linearGradient id="body-grad" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="oklch(0.92 0 0)" />
            <stop offset="1" stopColor="oklch(0.55 0 0)" />
          </linearGradient>
          <linearGradient id="visor-grad" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="oklch(0.98 0 0)" stopOpacity="0.9" />
            <stop offset="1" stopColor="oklch(0.6 0 0)" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="leg-grad" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="oklch(0.75 0 0)" />
            <stop offset="1" stopColor="oklch(0.35 0 0)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="eye-glow" cx="50%" cy="50%" r="50%">
            <stop stopColor="oklch(1 0 0)" />
            <stop offset="1" stopColor="oklch(0.7 0 0)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── Legs ── */}
        {/* Left leg */}
        <g style={{ transformOrigin: "55px 185px", animation: dancing ? "leg-l 0.9s ease-in-out infinite" : "none" }}>
          <rect x="44" y="185" width="22" height="52" rx="11" fill="url(#leg-grad)" />
          {/* Boot */}
          <ellipse cx="55" cy="237" rx="16" ry="9" fill="oklch(0.28 0 0)" />
          <ellipse cx="55" cy="235" rx="14" ry="7" fill="oklch(0.38 0 0)" />
          {/* Boot shine */}
          <ellipse cx="50" cy="233" rx="5" ry="2.5" fill="oklch(1 0 0 / 0.25)" />
        </g>
        {/* Right leg */}
        <g style={{ transformOrigin: "85px 185px", animation: dancing ? "leg-r 0.9s ease-in-out infinite" : "none" }}>
          <rect x="74" y="185" width="22" height="52" rx="11" fill="url(#leg-grad)" />
          {/* Boot */}
          <ellipse cx="85" cy="237" rx="16" ry="9" fill="oklch(0.28 0 0)" />
          <ellipse cx="85" cy="235" rx="14" ry="7" fill="oklch(0.38 0 0)" />
          <ellipse cx="80" cy="233" rx="5" ry="2.5" fill="oklch(1 0 0 / 0.25)" />
        </g>

        {/* ── Torso ── */}
        <rect x="32" y="110" width="76" height="80" rx="20" fill="url(#body-grad)" />
        {/* Chest panel */}
        <rect x="44" y="122" width="52" height="38" rx="10" fill="oklch(0.18 0 0)" />
        {/* Chest panel glow lines */}
        <rect x="50" y="130" width="40" height="2" rx="1" fill="oklch(1 0 0 / 0.5)" filter="url(#glow)" />
        <rect x="50" y="136" width="30" height="2" rx="1" fill="oklch(1 0 0 / 0.35)" />
        <rect x="50" y="142" width="35" height="2" rx="1" fill="oklch(1 0 0 / 0.25)" />
        {/* Vault logo on chest */}
        <g transform="translate(60, 148) scale(0.55)" opacity="0.9">
          <path d="M10 2 18 5.5v6c0 4.5-3 8-8 10C5 21.5 2 18 2 13.5V5.5Z" stroke="oklch(1 0 0 / 0.9)" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
          <circle cx="10" cy="11" r="3.5" stroke="oklch(1 0 0 / 0.8)" strokeWidth="1.2" fill="none" />
          <circle cx="10" cy="11" r="1.2" fill="oklch(1 0 0)" />
          <path d="M10 4v2M10 16v2M4 11h2M14 11h2" stroke="oklch(1 0 0 / 0.6)" strokeWidth="1" strokeLinecap="round" />
        </g>
        {/* Torso side panels */}
        <rect x="32" y="125" width="10" height="30" rx="5" fill="oklch(0.72 0 0)" />
        <rect x="98" y="125" width="10" height="30" rx="5" fill="oklch(0.72 0 0)" />
        {/* Belt */}
        <rect x="32" y="182" width="76" height="10" rx="5" fill="oklch(0.22 0 0)" />
        <rect x="62" y="183" width="16" height="8" rx="3" fill="oklch(0.55 0 0)" />
        <rect x="65" y="185" width="10" height="4" rx="2" fill="oklch(0.8 0 0 / 0.5)" />

        {/* ── Arms ── */}
        {/* Left arm */}
        <g style={{
          transformOrigin: "32px 125px",
          animation: dancing
            ? "arm-l-dance 0.9s ease-in-out infinite"
            : reaching
            ? "arm-l-reach 1.2s ease-in-out forwards"
            : "arm-idle 3s ease-in-out infinite",
        }}>
          <rect x="10" y="115" width="22" height="60" rx="11" fill="url(#body-grad)" />
          {/* Elbow joint */}
          <circle cx="21" cy="155" r="8" fill="oklch(0.65 0 0)" />
          <circle cx="21" cy="155" r="5" fill="oklch(0.45 0 0)" />
          {/* Hand */}
          <ellipse cx="21" cy="175" rx="10" ry="8" fill="oklch(0.78 0 0)" />
          <ellipse cx="21" cy="173" rx="8" ry="6" fill="oklch(0.88 0 0)" />
          {/* Knuckle lines */}
          <path d="M15 172 q6-3 12 0" stroke="oklch(0.6 0 0)" strokeWidth="0.8" fill="none" />
        </g>
        {/* Right arm */}
        <g style={{
          transformOrigin: "108px 125px",
          animation: dancing
            ? "arm-r-dance 0.9s ease-in-out infinite"
            : reaching
            ? "arm-r-reach 1.2s ease-in-out forwards"
            : "arm-idle 3s ease-in-out infinite 0.4s",
        }}>
          <rect x="108" y="115" width="22" height="60" rx="11" fill="url(#body-grad)" />
          <circle cx="119" cy="155" r="8" fill="oklch(0.65 0 0)" />
          <circle cx="119" cy="155" r="5" fill="oklch(0.45 0 0)" />
          <ellipse cx="119" cy="175" rx="10" ry="8" fill="oklch(0.78 0 0)" />
          <ellipse cx="119" cy="173" rx="8" ry="6" fill="oklch(0.88 0 0)" />
          <path d="M113 172 q6-3 12 0" stroke="oklch(0.6 0 0)" strokeWidth="0.8" fill="none" />
        </g>

        {/* ── Neck ── */}
        <rect x="58" y="95" width="24" height="20" rx="8" fill="oklch(0.75 0 0)" />

        {/* ── Head ── */}
        <rect x="28" y="42" width="84" height="62" rx="28" fill="url(#body-grad)" />
        {/* Head shine */}
        <ellipse cx="60" cy="52" rx="22" ry="10" fill="oklch(1 0 0 / 0.18)" />
        {/* Visor */}
        <rect x="36" y="58" width="68" height="28" rx="14" fill="oklch(0.08 0 0)" />
        <rect x="38" y="60" width="64" height="24" rx="12" fill="url(#visor-grad)" opacity="0.15" />
        {/* Visor reflection */}
        <path d="M42 65 Q70 60 98 65" stroke="oklch(1 0 0 / 0.35)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Eyes inside visor */}
        <circle cx="58" cy="72" r="7" fill="oklch(0.06 0 0)" />
        <circle cx="82" cy="72" r="7" fill="oklch(0.06 0 0)" />
        {/* Eye glow */}
        <circle cx="58" cy="72" r="4.5" fill="oklch(0.95 0 0)" filter="url(#glow)"
          style={{ animation: "eye-blink 4s ease-in-out infinite" }} />
        <circle cx="82" cy="72" r="4.5" fill="oklch(0.95 0 0)" filter="url(#glow)"
          style={{ animation: "eye-blink 4s ease-in-out infinite 0.15s" }} />
        {/* Eye pupils */}
        <circle cx="59" cy="71" r="1.8" fill="oklch(0.1 0 0)" />
        <circle cx="83" cy="71" r="1.8" fill="oklch(0.1 0 0)" />
        {/* Eye specular */}
        <circle cx="60" cy="70" r="0.8" fill="oklch(1 0 0 / 0.9)" />
        <circle cx="84" cy="70" r="0.8" fill="oklch(1 0 0 / 0.9)" />
        {/* Antenna */}
        <rect x="67" y="28" width="6" height="18" rx="3" fill="oklch(0.65 0 0)" />
        <circle cx="70" cy="26" r="5" fill="oklch(0.85 0 0)" />
        <circle cx="70" cy="26" r="3" fill="oklch(1 0 0)"
          style={{ animation: "tick-glow 1.8s ease-in-out infinite", filter: "drop-shadow(0 0 4px oklch(1 0 0 / 0.9))" }} />
        {/* Ear panels */}
        <rect x="18" y="60" width="12" height="22" rx="6" fill="oklch(0.68 0 0)" />
        <rect x="110" y="60" width="12" height="22" rx="6" fill="oklch(0.68 0 0)" />
        <rect x="20" y="65" width="8" height="3" rx="1.5" fill="oklch(0.45 0 0)" />
        <rect x="112" y="65" width="8" height="3" rx="1.5" fill="oklch(0.45 0 0)" />
        <rect x="20" y="71" width="8" height="3" rx="1.5" fill="oklch(0.45 0 0)" />
        <rect x="112" y="71" width="8" height="3" rx="1.5" fill="oklch(0.45 0 0)" />
      </svg>
    </div>
  );
}

/* ─── Floating particles ────────────────────────────────────────────────────── */
function Particles() {
  const particles = [
    { x: "15%", y: "20%", size: 3, delay: "0s", dur: "6s" },
    { x: "80%", y: "15%", size: 2, delay: "1s", dur: "8s" },
    { x: "65%", y: "70%", size: 4, delay: "2s", dur: "7s" },
    { x: "25%", y: "75%", size: 2, delay: "0.5s", dur: "9s" },
    { x: "90%", y: "50%", size: 3, delay: "3s", dur: "6.5s" },
    { x: "10%", y: "50%", size: 2, delay: "1.5s", dur: "7.5s" },
    { x: "50%", y: "10%", size: 2, delay: "2.5s", dur: "8.5s" },
    { x: "40%", y: "85%", size: 3, delay: "0.8s", dur: "7s" },
  ];
  return (
    <>
      {particles.map((p, i) => (
        <div
          key={i}
          className="pointer-events-none absolute rounded-full"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            background: "oklch(1 0 0 / 0.5)",
            boxShadow: "0 0 6px oklch(1 0 0 / 0.6)",
            animation: `float ${p.dur} ease-in-out infinite`,
            animationDelay: p.delay,
          }}
        />
      ))}
    </>
  );
}

/* ─── Auth form card ────────────────────────────────────────────────────────── */
function HeroFormCard() {
  return (
    <div
      className="glass-strong rounded-3xl p-5 shadow-[var(--shadow-elevated)]"
      style={{ border: "1px solid oklch(1 0 0 / 0.18)" }}
    >
      <div className="mb-4 flex flex-col items-center gap-2 text-center">
        <Logo />
        <p className="text-xs text-muted-foreground">Your files, locked to you.</p>
      </div>

      <SocialAuth />

      <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-2">
        <Button asChild variant="hero" className="w-full gap-2">
          <Link to="/auth">
            Sign in with email <ArrowRight className="size-3.5" />
          </Link>
        </Button>
        <Button asChild variant="glass" className="w-full">
          <Link to="/auth">Create account</Link>
        </Button>
      </div>

      <p className="mt-3 text-center text-[10px] text-muted-foreground">
        5 GB free · No credit card · AES-256 at rest
      </p>
    </div>
  );
}
