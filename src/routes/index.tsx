import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import {
  ArrowRight,
  CloudUpload,
  FileCheck2,
  Gauge,
  KeyRound,
  Link2,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { HeaderAccount } from "@/components/vault/HeaderAccount";
import { Logo } from "@/components/vault/Logo";
import { Reveal } from "@/components/vault/Reveal";
import { TypeLine } from "@/components/vault/TypeLine";
const CinematicVault = lazy(() =>
  import("@/components/vault/CinematicVault").then((m) => ({ default: m.CinematicVault })),
);

const IPhoneFrame = lazy(() =>
  import("@/components/vault/IPhoneFrame").then((m) => ({ default: m.IPhoneFrame })),
);

const TITLE = "Vaultra — Secure File Storage & Private Sharing";
const DESCRIPTION =
  "Vaultra is an encrypted-at-rest file vault: owner-only access, quota-aware uploads, and expiring share links for the files you choose to make public.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  {
    icon: ShieldCheck,
    title: "Owner-only by default",
    body: "Row-level security and per-user storage folders mean nobody — not even another signed-in account — can read your objects.",
  },
  {
    icon: CloudUpload,
    title: "Quota-aware uploads",
    body: "Signed upload tickets validate type, size and remaining quota before a single byte leaves the browser.",
  },
  {
    icon: Link2,
    title: "Short-lived share links",
    body: "Flip a file to public and Vaultra mints expiring signed URLs on demand instead of exposing the bucket.",
  },
  {
    icon: FileCheck2,
    title: "Verified finalization",
    body: "The server confirms the object exists in storage before the database record is ever created.",
  },
  {
    icon: KeyRound,
    title: "Google & GitHub auth",
    body: "One-tap social sign-in or classic email + password, with sessions refreshed automatically.",
  },
  {
    icon: Gauge,
    title: "Live storage insight",
    body: "Real-time charts track every byte of your allowance across private and shared files.",
  },
];

function Index() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* ── Sticky header ── */}
      <header className="glass-strong sticky top-0 z-40 border-b border-border/70">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="focus-ring flex min-w-0 rounded-xl">
            <Logo className="max-w-full" />
          </Link>
          <nav className="ml-auto flex items-center gap-1 sm:gap-2">
            <HeaderAccount />
          </nav>
        </div>
      </header>

      <main>
        {/* ══════════════════════════════════════════════════════
            HERO — 3D animated guardian + cinematic form drag
        ══════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden py-12 sm:py-16 lg:py-20">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.28]" aria-hidden="true" />
          <div className="bg-aurora pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-8">

              {/* Left — headline + CTAs */}
              <div className="stagger flex-1 text-center lg:text-left">
                <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] text-muted-foreground sm:text-xs">
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                  Encrypted at rest · RLS enforced
                </span>
                <h1 className="mt-4 text-[1.85rem] font-semibold leading-[1.06] tracking-tight sm:text-5xl md:text-6xl">
                  Your files,{" "}
                  <TypeLine
                    phrases={["locked down.", "owner-only.", "shareable on your terms.", "audit-ready."]}
                    className="block sm:inline"
                  />
                </h1>
                <p className="mt-4 mx-auto max-w-lg text-sm text-muted-foreground sm:text-base md:text-lg lg:mx-0">
                  Upload up to 1 GB per file, keep everything private by default, and hand out
                  expiring links only when you decide to.
                </p>

                <dl className="mt-6 flex flex-wrap justify-center gap-6 sm:gap-10 lg:justify-start">
                  {[
                    ["5 GB", "free per account"],
                    ["1 GB", "max per file"],
                    ["AES-256", "at rest"],
                  ].map(([value, label]) => (
                    <div key={label} className="text-center lg:text-left">
                      <dt className="font-display text-lg font-semibold sm:text-xl">{value}</dt>
                      <dd className="text-[11px] text-muted-foreground sm:text-xs">{label}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                  <Button asChild variant="hero" size="lg" className="w-full gap-2 sm:w-auto">
                    <Link to="/auth">
                      Create your vault <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild variant="glass" size="lg" className="w-full gap-2 sm:w-auto">
                    <Link to="/vault">Open the vault</Link>
                  </Button>
                </div>
              </div>

              {/* Right — 3D Cinematic vault */}
              <div className="w-full flex-1">
                <Suspense fallback={
                  <div className="mx-auto aspect-square w-full max-w-[22rem] sm:max-w-[28rem] lg:max-w-[36rem] animate-pulse rounded-full bg-surface-2" />
                }>
                  <CinematicVault />
                </Suspense>
              </div>

            </div>
          </div>
        </section>

        {/* ── Features grid ── */}
        <section className="cv-auto mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-24">
          <Reveal>
            <h2 className="text-xl font-semibold sm:text-3xl">
              Built like a security review is coming
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Every layer — auth, storage policies, server validation, and the UI — assumes the
              worst case and fails closed.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body }, index) => (
              <Reveal key={title} as="article" delay={index * 70} className="h-full">
                <article className="glass card-hover h-full rounded-2xl p-5 shadow-[var(--shadow-card)]">
                  <span className="grid size-10 place-items-center rounded-xl bg-surface-2">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── CTA banner ── */}
        <section className="cv-auto mx-auto max-w-6xl px-4 pb-16 sm:px-6 md:pb-28">
          <Reveal>
            <div className="glass-strong flex flex-col items-start gap-5 rounded-3xl p-6 sm:p-8 md:flex-row md:items-center md:justify-between md:p-10">
              <div>
                <h2 className="text-xl font-semibold sm:text-2xl">Ready to store something safely?</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Sign up in seconds with Google, GitHub or email — no card, no setup.
                </p>
              </div>
              <Button asChild variant="hero" size="lg" className="w-full gap-2 sm:w-auto">
                <Link to="/auth">
                  Get started <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </section>

        {/* ── iPhone preview ── */}
        <section className="cv-auto overflow-hidden py-16 md:py-24">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <div className="pointer-events-none absolute inset-0 bg-aurora opacity-40" aria-hidden="true" />
            <Reveal className="text-center">
              <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] text-muted-foreground">
                <ShieldCheck className="size-3.5" />
                Designed for every screen
              </span>
              <h2 className="mt-4 text-xl font-semibold sm:text-3xl">Looks stunning on iPhone 17 Pro Max</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Pixel-perfect on every device — from 4K displays to the latest Pro Max.
              </p>
            </Reveal>
            <Reveal delay={120} className="mt-12 flex justify-center">
              <div className="relative w-full flex justify-center overflow-hidden px-4">
                <div className="pointer-events-none absolute -inset-16 rounded-full bg-[radial-gradient(ellipse_at_50%_60%,oklch(1_0_0/0.10),transparent_65%)] blur-3xl" />
                <Suspense fallback={
                  <div className="rounded-[52px] bg-surface-2 animate-pulse" style={{ width: 280, height: 606 }} />
                }>
                  <IPhoneFrame />
                </Suspense>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <Logo showWordmark />
          <p>© {new Date().getFullYear()} Vaultra — encrypted-at-rest storage.</p>
        </div>
      </footer>
    </div>
  );
}
