import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
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

  // Password reset dialog
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  // Password recovery (from email link)
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

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = resetEmail.trim().toLowerCase();
    if (!cleanEmail) { toast.error("Please enter your email address."); return; }
    setResetBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });
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
      {/* Background layers */}
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.22]" aria-hidden="true" />
      <div className="bg-aurora pointer-events-none absolute inset-0 opacity-55" aria-hidden="true" />

      {/* Full-screen hero scene — robot dances then drags the real auth form to centre */}
      <HeroScene
        withAuthForm
        redirectPath={targetDestination}
        className="min-h-screen"
      />

      {/* Password Reset Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" /> Reset password
            </DialogTitle>
            <DialogDescription>
              Enter your email and we'll send you a reset link.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email" type="email" required autoComplete="email"
                placeholder="name@example.com"
                value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" size="sm" onClick={() => setResetOpen(false)} disabled={resetBusy}>
                Cancel
              </Button>
              <Button type="submit" variant="hero" size="sm" disabled={resetBusy || !resetEmail.trim()}>
                {resetBusy ? <Loader2 className="size-4 animate-spin" /> : "Send link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Recovery Dialog */}
      <Dialog open={recoveryMode} onOpenChange={() => undefined}>
        <DialogContent className="max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Choose a new password</DialogTitle>
            <DialogDescription>
              Your reset link is verified. Set a new password to secure your account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password" type="password" autoComplete="new-password"
                minLength={8} required
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              />
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
