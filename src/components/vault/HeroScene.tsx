"use client";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { SocialAuth } from "@/components/auth/SocialAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo, VaultraMark } from "@/components/vault/Logo";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { useRouter } from "@tanstack/react-router";

/*
  PHASE TIMELINE
  0 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ 3.5s  : robot dances alone (human-feeling groove)
  3.5 ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ 5.5s: robot reaches out, form slides in from right (1.8s natural ease)
  5.5s+     : idle breathing, form centred
*/

type Phase = "dance" | "reach" | "idle";
type Emote = "groove" | "moonwalk" | "spin" | "dip" | "seal";
const EMOTES: Emote[] = ["groove", "moonwalk", "spin", "dip", "seal"];
const EMOTE_MS: Record<Emote, number> = {
  groove: 4000,
  moonwalk: 4000,
  spin: 2200,
  dip: 3200,
  seal: 1800,
};

const MOTION_ANIMATIONS = {
  groove: { root: "guardian-groove-v2", torso: "torso-groove-v2", hip: "hip-groove-v2", head: "head-groove-v2", leftLeg: "leg-l-groove-v2", rightLeg: "leg-r-groove-v2", leftArm: "arm-l-groove-v2", rightArm: "arm-r-groove-v2" },
  moonwalk: { root: "guardian-moonwalk-v2", torso: "torso-moonwalk-v2", hip: "hip-moonwalk-v2", head: "head-moonwalk-v2", leftLeg: "leg-l-moonwalk-v2", rightLeg: "leg-r-moonwalk-v2", leftArm: "arm-l-moonwalk-v2", rightArm: "arm-r-moonwalk-v2" },
  spin: { root: "guardian-spin-v2", torso: "torso-spin-v2", hip: "hip-spin-v2", head: "head-spin-v2", leftLeg: "leg-l-spin-v2", rightLeg: "leg-r-spin-v2", leftArm: "arm-l-spin-v2", rightArm: "arm-r-spin-v2" },
  dip: { root: "guardian-dip-v2", torso: "torso-dip-v2", hip: "hip-dip-v2", head: "head-dip-v2", leftLeg: "leg-l-dip-v2", rightLeg: "leg-r-dip-v2", leftArm: "arm-l-dip-v2", rightArm: "arm-r-dip-v2" },
} as const;

interface HeroSceneProps {
  className?: string;
  withAuthForm?: boolean;
  redirectPath?: string;
}

export function HeroScene({ className, withAuthForm = false, redirectPath = "/vault" }: HeroSceneProps) {
  // Immediate form + continuous robot dance (no delay gates)
  const formVisible = true;

  return (
    <div
      className={cn(
        "relative mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-6 overflow-x-clip px-4 py-8 sm:min-h-[620px] sm:flex-row sm:gap-14 sm:px-8 lg:min-h-[700px] lg:gap-20 lg:px-12",
        className,
      )}
      aria-hidden={!withAuthForm}
    >
      {/* Soft stage glow */}
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 h-40 w-[80%] -translate-x-1/2 rounded-[50%] blur-3xl"
        style={{ background: "radial-gradient(ellipse at center, oklch(1 0 0 / 0.06), transparent 70%)" }}
      />

      <Particles />

      {/* Robot — secondary on mobile, left/center on desktop */}
      <div className="relative z-20 order-2 flex w-[150px] shrink-0 scale-90 justify-center sm:order-1 sm:scale-100 lg:scale-110">
        <div className="relative">
          <VaultGuardian phase="dance" />
          <div
            className="pointer-events-none absolute -bottom-2 left-1/2 h-6 w-28 -translate-x-1/2 rounded-[50%] blur-xl"
            style={{ background: "radial-gradient(ellipse at center, oklch(0 0 0 / 0.55), transparent 70%)" }}
          />
        </div>
      </div>

      {/* Form — primary on mobile, close to robot on desktop (not far right) */}
      <div className="relative z-30 order-1 flex w-full max-w-[340px] shrink-0 justify-center sm:order-2 sm:w-[340px]">
        {withAuthForm ? (
          <AuthFormCard redirectPath={redirectPath} />
        ) : (
          <PreviewFormCard />
        )}
      </div>
    </div>
  );
}


/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Vault Guardian ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */
function VaultGuardian({ phase }: { phase: Phase }) {
  const [emote, setEmote] = useState<Emote>("groove");
  useEffect(() => {
    if (phase !== "dance") return;
    const timer = window.setTimeout(() => {
      setEmote((current) => EMOTES[(EMOTES.indexOf(current) + 1) % EMOTES.length]);
    }, EMOTE_MS[emote]);
    return () => window.clearTimeout(timer);
  }, [emote, phase]);

  const dancing = phase === "dance" && emote !== "seal";
  const sealing = phase === "dance" && emote === "seal";
  const reaching = phase === "reach";
  const motion = dancing && emote !== "seal" ? MOTION_ANIMATIONS[emote] : null;

  return (
    <div
      className="guardian-body relative select-none"
      data-emote={emote}
      style={{
        width: 150,
        height: 280,
        animation: sealing
          ? "guardian-seal-v2 1.8s cubic-bezier(0.22,1,0.36,1) both"
          : dancing && motion
          ? `${motion.root} ${EMOTE_MS[emote]}ms cubic-bezier(0.37,0,0.63,1) infinite`
          : reaching
          ? "guardian-reach 1.6s cubic-bezier(0.34,1.2,0.64,1) forwards"
          : "guardian-idle 3.2s ease-in-out infinite",
      }}
    >
      {/* Body glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full blur-2xl"
        style={{ background: "radial-gradient(ellipse at 50% 38%, oklch(1 0 0 / 0.16), transparent 65%)" }}
      />

      <svg
        viewBox="0 0 150 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 size-full drop-shadow-[0_0_28px_oklch(1_0_0/0.28)]"
      >
        <defs>
          <linearGradient id="vg-body" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="oklch(0.93 0 0)" />
            <stop offset="1" stopColor="oklch(0.52 0 0)" />
          </linearGradient>
          <linearGradient id="vg-leg" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="oklch(0.76 0 0)" />
            <stop offset="1" stopColor="oklch(0.33 0 0)" />
          </linearGradient>
          <linearGradient id="vg-visor" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="oklch(0.98 0 0)" stopOpacity="0.85" />
            <stop offset="1" stopColor="oklch(0.55 0 0)" stopOpacity="0.5" />
          </linearGradient>
          <filter id="vg-glow">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Legs ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
        {/* Hip sway wrapper ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â whole lower body rocks */}
        <g style={{ transformOrigin: "75px 195px", animation: motion ? `${motion.hip} ${EMOTE_MS[emote]}ms ease-in-out infinite` : "none" }}>
          {/* Left leg */}
          <g style={{ transformOrigin: "58px 198px", animation: motion ? `${motion.leftLeg} ${EMOTE_MS[emote]}ms ease-in-out infinite` : "none" }}>
            <rect x="46" y="198" width="24" height="56" rx="12" fill="url(#vg-leg)" />
            <ellipse cx="58" cy="254" rx="17" ry="10" fill="oklch(0.26 0 0)" />
            <ellipse cx="58" cy="252" rx="15" ry="8" fill="oklch(0.36 0 0)" />
            <ellipse cx="53" cy="250" rx="5" ry="2.5" fill="oklch(1 0 0 / 0.22)" />
          </g>
          {/* Right leg */}
          <g style={{ transformOrigin: "92px 198px", animation: motion ? `${motion.rightLeg} ${EMOTE_MS[emote]}ms ease-in-out infinite` : "none" }}>
            <rect x="80" y="198" width="24" height="56" rx="12" fill="url(#vg-leg)" />
            <ellipse cx="92" cy="254" rx="17" ry="10" fill="oklch(0.26 0 0)" />
            <ellipse cx="92" cy="252" rx="15" ry="8" fill="oklch(0.36 0 0)" />
            <ellipse cx="87" cy="250" rx="5" ry="2.5" fill="oklch(1 0 0 / 0.22)" />
          </g>
        </g>

        {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Torso ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
        <g style={{ transformOrigin: "75px 150px", animation: motion ? `${motion.torso} ${EMOTE_MS[emote]}ms ease-in-out infinite` : "none" }}>
          <rect x="34" y="118" width="82" height="84" rx="22" fill="url(#vg-body)" />
          {/* Chest panel */}
          <rect x="46" y="130" width="58" height="42" rx="11" fill="oklch(0.16 0 0)" />
          {/* Scan lines */}
          <rect x="52" y="138" width="46" height="2" rx="1" fill="oklch(1 0 0 / 0.55)" filter="url(#vg-glow)" />
          <rect x="52" y="144" width="34" height="2" rx="1" fill="oklch(1 0 0 / 0.35)" />
          <rect x="52" y="150" width="40" height="2" rx="1" fill="oklch(1 0 0 / 0.22)" />
          {/* Vault logo on chest */}
          <g transform="translate(63,156) scale(0.58)" opacity="0.92">
            <path d="M10 2 18 5.5v6c0 4.5-3 8-8 10C5 21.5 2 18 2 13.5V5.5Z" stroke="oklch(1 0 0 / 0.9)" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
            <circle cx="10" cy="11" r="3.5" stroke="oklch(1 0 0 / 0.8)" strokeWidth="1.2" fill="none" />
            <circle cx="10" cy="11" r="1.2" fill="oklch(1 0 0)" />
            <path d="M10 4v2M10 16v2M4 11h2M14 11h2" stroke="oklch(1 0 0 / 0.6)" strokeWidth="1" strokeLinecap="round" />
          </g>
          {/* Side panels */}
          <rect x="34" y="133" width="11" height="34" rx="5.5" fill="oklch(0.70 0 0)" />
          <rect x="105" y="133" width="11" height="34" rx="5.5" fill="oklch(0.70 0 0)" />
          {/* Belt */}
          <rect x="34" y="194" width="82" height="11" rx="5.5" fill="oklch(0.20 0 0)" />
          <rect x="65" y="195" width="20" height="9" rx="3.5" fill="oklch(0.52 0 0)" />
          <rect x="68" y="197" width="14" height="5" rx="2.5" fill="oklch(0.78 0 0 / 0.45)" />

          {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Arms ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
          {/* Left arm */}
          <g style={{
            transformOrigin: "34px 133px",
            animation: motion
              ? `${motion.leftArm} ${EMOTE_MS[emote]}ms ease-in-out infinite`
              : reaching
              ? "arm-l-reach 1.6s cubic-bezier(0.34,1.2,0.64,1) forwards"
              : "arm-idle 3.2s ease-in-out infinite",
          }}>
            <rect x="10" y="123" width="24" height="64" rx="12" fill="url(#vg-body)" />
            <circle cx="22" cy="167" r="9" fill="oklch(0.62 0 0)" />
            <circle cx="22" cy="167" r="5.5" fill="oklch(0.42 0 0)" />
            <ellipse cx="22" cy="187" rx="11" ry="9" fill="oklch(0.76 0 0)" />
            <ellipse cx="22" cy="185" rx="9" ry="7" fill="oklch(0.86 0 0)" />
            <path d="M16 184 q6-3 12 0" stroke="oklch(0.58 0 0)" strokeWidth="0.9" fill="none" />
          </g>
          {/* Right arm */}
          <g style={{
            transformOrigin: "116px 133px",
            animation: motion
              ? `${motion.rightArm} ${EMOTE_MS[emote]}ms ease-in-out infinite`
              : reaching
              ? "arm-r-reach 1.6s cubic-bezier(0.34,1.2,0.64,1) forwards"
              : "arm-idle 3.2s ease-in-out infinite 0.5s",
          }}>
            <rect x="116" y="123" width="24" height="64" rx="12" fill="url(#vg-body)" />
            <circle cx="128" cy="167" r="9" fill="oklch(0.62 0 0)" />
            <circle cx="128" cy="167" r="5.5" fill="oklch(0.42 0 0)" />
            <ellipse cx="128" cy="187" rx="11" ry="9" fill="oklch(0.76 0 0)" />
            <ellipse cx="128" cy="185" rx="9" ry="7" fill="oklch(0.86 0 0)" />
            <path d="M122 184 q6-3 12 0" stroke="oklch(0.58 0 0)" strokeWidth="0.9" fill="none" />
          </g>
        </g>

        {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Neck ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
        <rect x="62" y="102" width="26" height="22" rx="9" fill="oklch(0.73 0 0)" />

        {/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Head ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */}
        <g style={{ transformOrigin: "75px 72px", animation: motion ? `${motion.head} ${EMOTE_MS[emote]}ms ease-in-out infinite` : "none" }}>
          <rect x="30" y="44" width="90" height="66" rx="30" fill="url(#vg-body)" />
          {/* Head shine */}
          <ellipse cx="64" cy="55" rx="24" ry="11" fill="oklch(1 0 0 / 0.16)" />
          {/* Visor */}
          <rect x="38" y="62" width="74" height="30" rx="15" fill="oklch(0.07 0 0)" />
          <rect x="40" y="64" width="70" height="26" rx="13" fill="url(#vg-visor)" opacity="0.14" />
          <path d="M44 69 Q75 63 106 69" stroke="oklch(1 0 0 / 0.32)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Eyes */}
          <circle cx="60" cy="77" r="7.5" fill="oklch(0.05 0 0)" />
          <circle cx="90" cy="77" r="7.5" fill="oklch(0.05 0 0)" />
          <circle cx="60" cy="77" r="5" fill="oklch(0.94 0 0)" filter="url(#vg-glow)"
            style={{ animation: "eye-blink 4.5s ease-in-out infinite" }} />
          <circle cx="90" cy="77" r="5" fill="oklch(0.94 0 0)" filter="url(#vg-glow)"
            style={{ animation: "eye-blink 4.5s ease-in-out infinite 0.18s" }} />
          <circle cx="61" cy="76" r="2" fill="oklch(0.08 0 0)" />
          <circle cx="91" cy="76" r="2" fill="oklch(0.08 0 0)" />
          <circle cx="62" cy="75" r="0.9" fill="oklch(1 0 0 / 0.88)" />
          <circle cx="92" cy="75" r="0.9" fill="oklch(1 0 0 / 0.88)" />
          {/* Antenna */}
          <rect x="72" y="28" width="6" height="20" rx="3" fill="oklch(0.62 0 0)" />
          <circle cx="75" cy="26" r="5.5" fill="oklch(0.83 0 0)" />
          <circle cx="75" cy="26" r="3.2" fill="oklch(1 0 0)"
            style={{ animation: "tick-glow 2s ease-in-out infinite", filter: "drop-shadow(0 0 5px oklch(1 0 0 / 0.9))" }} />
          {/* Ear vents */}
          <rect x="19" y="63" width="13" height="24" rx="6.5" fill="oklch(0.66 0 0)" />
          <rect x="118" y="63" width="13" height="24" rx="6.5" fill="oklch(0.66 0 0)" />
          <rect x="21" y="68" width="9" height="3" rx="1.5" fill="oklch(0.43 0 0)" />
          <rect x="120" y="68" width="9" height="3" rx="1.5" fill="oklch(0.43 0 0)" />
          <rect x="21" y="74" width="9" height="3" rx="1.5" fill="oklch(0.43 0 0)" />
          <rect x="120" y="74" width="9" height="3" rx="1.5" fill="oklch(0.43 0 0)" />
          <rect x="21" y="80" width="9" height="3" rx="1.5" fill="oklch(0.43 0 0)" />
          <rect x="120" y="80" width="9" height="3" rx="1.5" fill="oklch(0.43 0 0)" />
        </g>
      </svg>
      <div className="guardian-logo-mark pointer-events-none absolute inset-0 grid place-items-center" aria-hidden="true">
        <VaultraMark className="size-24 text-white" />
      </div>
    </div>
  );
}

/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Particles ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */
function Particles() {
  const pts = [
    { x: "12%", y: "18%", s: 3, d: "0s",   dur: "6.2s" },
    { x: "82%", y: "14%", s: 2, d: "1.1s", dur: "8.4s" },
    { x: "68%", y: "72%", s: 4, d: "2.2s", dur: "7.1s" },
    { x: "22%", y: "78%", s: 2, d: "0.6s", dur: "9.3s" },
    { x: "91%", y: "52%", s: 3, d: "3.1s", dur: "6.8s" },
    { x: "8%",  y: "54%", s: 2, d: "1.7s", dur: "7.9s" },
    { x: "52%", y: "8%",  s: 2, d: "2.8s", dur: "8.8s" },
    { x: "38%", y: "88%", s: 3, d: "0.9s", dur: "7.3s" },
    { x: "74%", y: "38%", s: 2, d: "4.0s", dur: "6.5s" },
    { x: "28%", y: "42%", s: 2, d: "1.4s", dur: "9.1s" },
  ];
  return (
    <>
      {pts.map((p, i) => (
        <div
          key={i}
          className="pointer-events-none absolute rounded-full"
          style={{
            left: p.x, top: p.y,
            width: p.s, height: p.s,
            background: "oklch(1 0 0 / 0.45)",
            boxShadow: "0 0 7px oklch(1 0 0 / 0.55)",
            animation: `float ${p.dur} ease-in-out infinite`,
            animationDelay: p.d,
          }}
        />
      ))}
    </>
  );
}

/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Preview form card (homepage ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â links to /auth) ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */
function PreviewFormCard() {
  return (
    <div
      className="glass-strong rounded-3xl p-5 shadow-[var(--shadow-elevated)]"
      style={{ border: "1px solid oklch(1 0 0 / 0.16)" }}
    >
      <div className="mb-4 flex flex-col items-center gap-2 text-center">
        <Logo />
        <p className="text-xs text-muted-foreground">Your files, locked to you.</p>
      </div>
      <SocialAuth />
      <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
        <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
      </div>
      <div className="space-y-2">
        <Button asChild variant="hero" className="w-full gap-2">
          <Link to="/auth">Sign in with email <ArrowRight className="size-3.5" /></Link>
        </Button>
        <Button asChild variant="glass" className="w-full">
          <Link to="/auth">Create account</Link>
        </Button>
      </div>
      <p className="mt-3 text-center text-[10px] text-muted-foreground">
        5 GB free ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· No credit card ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· AES-256 at rest
      </p>
    </div>
  );
}

/* ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ Real auth form card (auth page) ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ */
function AuthFormCard({ redirectPath }: { redirectPath: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Enter your email."); return; }
    if (!password) { toast.error("Enter your password."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      toast.success("Welcome back!");
      await router.navigate({ to: redirectPath });
    } catch (err) { toast.error(getAuthErrorMessage(err)); }
    finally { setBusy(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Enter your email."); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { data: { full_name: fullName.trim() || undefined } },
      });
      if (error) throw error;
      toast.success("Account created!");
      await router.navigate({ to: redirectPath });
    } catch (err) { toast.error(getAuthErrorMessage(err)); }
    finally { setBusy(false); }
  };

  return (
    <div
      className="glass-strong rounded-3xl p-5 shadow-[var(--shadow-elevated)]"
      style={{ border: "1px solid oklch(1 0 0 / 0.16)" }}
      aria-hidden="false"
    >
      <div className="mb-4 flex flex-col items-center gap-2 text-center">
        <Logo />
        <p className="text-xs text-muted-foreground">Your files, locked to you.</p>
      </div>

      <SocialAuth redirectPath={redirectPath} />

      <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
        <span className="h-px flex-1 bg-border" />or email<span className="h-px flex-1 bg-border" />
      </div>

      {/* Single form ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â toggled by mode */}
      <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="space-y-3">
        {mode === "signup" && (
          <div className="space-y-1">
            <Label htmlFor="ac-name" className="text-xs">Full name</Label>
            <Input id="ac-name" type="text" autoComplete="name" placeholder="Jane Doe"
              value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-9 text-sm" />
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="ac-email" className="text-xs">Email</Label>
          <Input id="ac-email" type="email" required autoComplete="email" placeholder="name@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ac-pw" className="text-xs">Password</Label>
          <div className="relative">
            <Input id="ac-pw" type={showPw ? "text" : "password"} required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="h-9 pr-9 text-sm" />
            <button type="button" tabIndex={-1} onClick={() => setShowPw((p) => !p)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </div>
          {mode === "signup" && (
            <p className="text-[10px] text-muted-foreground">Minimum 6 characters.</p>
          )}
        </div>
        <Button type="submit" variant="hero" className="w-full gap-2 h-9" disabled={busy}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <p className="mt-3 text-center text-[10px] text-muted-foreground">
        {mode === "signin" ? (
          <>No account?{" "}
            <button type="button" onClick={() => setMode("signup")}
              className="text-foreground underline-offset-2 hover:underline">Create one</button>
          </>
        ) : (
          <>Already have an account?{" "}
            <button type="button" onClick={() => setMode("signin")}
              className="text-foreground underline-offset-2 hover:underline">Sign in</button>
          </>
        )}
      </p>
    </div>
  );
}
