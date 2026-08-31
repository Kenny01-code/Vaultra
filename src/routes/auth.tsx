import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/vault/Logo";
import { SocialAuth } from "@/components/auth/SocialAuth";
import { HeroScene } from "@/components/vault/HeroScene";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth-errors";

const authSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: authSearchSchema,
  head: () => ({
    meta: [
      { title: "Sign in to Vaultra — Secure File Vault" },
      {
        name: "description",
        content:
          "Sign in or create a Vaultra account to upload, organise and share files with private, owner-only encrypted storage.",
      },
      { property: "og:title", content: "Sign in to Vaultra" },
      { property: "og:description", content: "Private, owner-only encrypted file storage." },
    ],
  }),
  component: AuthPage,
});

export function AuthPage() {
  const router = useRouter();
  const search = Route.useSearch();
  const targetDestination = search.redirect || "/vault";

  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(() =>
    typeof window !== "undefined" && window.location.hash.includes("type=recovery"),
  );
  const [newPassword, setNewPassword] = useState("");
  const [recoveryBusy, setRecoveryBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && !recoveryMode) {
      void router.navigate({ to: targetDestination });
    }
  }, [loading, user, router, targetDestination, recoveryMode]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) { toast.error("Please enter your email address."); return; }
    if (!password) { toast.error("Please enter your password."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) throw error;
      toast.success("Welcome back!");
      await router.navigate({ to: targetDestination });
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanName = fullName.trim();
    if (!cleanEmail) { toast.error("Please enter your email address."); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({ email: cleanEmail, password, options: { data: { full_name: cleanName || undefined } } });
      if (error) throw error;
      toast.success("Account created successfully!");
      await router.navigate({ to: targetDestination });
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = resetEmail.trim().toLowerCase();
    if (!cleanEmail) { toast.error("Please enter your email address."); return; }
    setResetBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: `${window.location.origin}/auth` });
      if (error) throw error;
      toast.success("Reset link sent! Check your inbox.");
      setResetOpen(false);
      setResetEmail("");
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setResetBusy(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error("Use at least 8 characters for your new password."); return; }
    setRecoveryBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated. You can now sign in.");
      setRecoveryMode(false);
      setNewPassword("");
      window.history.replaceState({}, document.title, "/auth");
      await supabase.auth.signOut();
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setRecoveryBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* ── Two-column layout: scene left, form right ── */}
      <div className="flex min-h-screen flex-col lg:flex-row">

        {/* ── Left: animated hero scene (hidden on small screens) ── */}
        <div className="relative hidden lg:flex lg:flex-1 lg:items-center lg:justify-center overflow-hidden">
          <div className="absolute inset-0 bg-aurora opacity-50" aria-hidden="true" />
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.18]" aria-hidden="true" />
          <HeroScene className="relative z-10 w-full" />
        </div>

        {/* ── Right: auth form ── */}
        <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-14 lg:max-w-[480px] lg:border-l lg:border-border/60">
          {/* Mobile background */}
          <div className="absolute inset-0 -z-10 bg-aurora opacity-50 lg:hidden" aria-hidden="true" />

          <div className="w-full max-w-md" style={{ animation: "var(--animate-fade-up)" }}>
            <div className="mb-6 flex flex-col items-center gap-3 text-center">
              <Logo />
              <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
                Your files, locked to you
              </h1>
              <p className="text-sm text-muted-foreground">
                Private by default. Share only what you choose, with revocable links.
              </p>
            </div>

            <div className="glass rounded-3xl p-4 shadow-[var(--shadow-elevated)] sm:p-5">
              <SocialAuth redirectPath={targetDestination} />

              <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or email
                <span className="h-px flex-1 bg-border" />
              </div>

              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="mt-4">
                  <form onSubmit={handleSignIn} className="space-y-3.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input id="signin-email" type="email" required autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-password">Password</Label>
                        <button type="button" onClick={() => { setResetEmail(email); setResetOpen(true); }} className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Input id="signin-password" type={showPassword ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                        <button type="button" tabIndex={-1} onClick={() => setShowPassword((p) => !p)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground">
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" variant="hero" className="w-full gap-2" disabled={busy}>
                      {busy ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                      Sign in
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-4">
                  <form onSubmit={handleSignUp} className="space-y-3.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-name">Full name</Label>
                      <Input id="signup-name" type="text" autoComplete="name" placeholder="Jane Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" type="email" required autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Input id="signup-password" type={showPassword ? "text" : "password"} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                        <button type="button" tabIndex={-1} onClick={() => setShowPassword((p) => !p)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground">
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Minimum 6 characters.</p>
                    </div>
                    <Button type="submit" variant="hero" className="w-full gap-2" disabled={busy}>
                      {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                      Create account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" /> Reset password
            </DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reset-email">Email</Label>
              <Input id="reset-email" type="email" required autoComplete="email" placeholder="name@example.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" size="sm" onClick={() => setResetOpen(false)} disabled={resetBusy}>Cancel</Button>
              <Button type="submit" variant="hero" size="sm" disabled={resetBusy || !resetEmail.trim()}>
                {resetBusy ? <Loader2 className="size-4 animate-spin" /> : "Send link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={recoveryMode} onOpenChange={() => undefined}>
        <DialogContent className="max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Choose a new password</DialogTitle>
            <DialogDescription>Your reset link is verified. Set a new password to secure your account.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">Use at least 8 characters.</p>
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={recoveryBusy}>
              {recoveryBusy ? <Loader2 className="size-4 animate-spin" /> : "Update password"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
