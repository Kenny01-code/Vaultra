import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, KeyRound, Loader2, Mail } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppShell } from "@/components/vault/AppShell";
import { useAvatarUrl } from "@/features/vault/avatar";
import { profileQuery } from "@/features/vault/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { createAvatarUploadTicket } from "@/lib/files.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — Vaultra" },
      {
        name: "description",
        content: "Update your Vaultra display name, bio and avatar for your secure vault account.",
      },
      { property: "og:title", content: "Your Profile — Vaultra" },
      { property: "og:description", content: "Manage your Vaultra account details." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profileReady } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();

  const profile = useQuery({ ...profileQuery(userId), enabled: Boolean(userId) && profileReady });
  const avatar = useAvatarUrl(profile.data?.avatarUrl);

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");

  // Password reset dialog state
  const [resetOpen, setResetOpen] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarSource, setAvatarSource] = useState<string | null>(null);
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile.data) return;
    setFullName(profile.data.fullName ?? "");
    setBio(profile.data.bio ?? "");
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim() || null,
          bio: bio.trim() || null,
        })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Profile updated");
      await queryClient.invalidateQueries({ queryKey: ["vault", "profile", userId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handlePasswordReset = async () => {
    const email = user?.email;
    if (!email) {
      toast.error("No email address associated with this account.");
      return;
    }
    setResetBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast.success(`Reset link sent to ${email} — check your inbox.`);
      setResetOpen(false);
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setResetBusy(false);
    }
  };

  const initials = (fullName || user?.email || "VA").slice(0, 2).toUpperCase();

  const chooseAvatar = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file.");
    if (file.size > 10 * 1024 * 1024) return toast.error("Choose an image smaller than 10 MB.");
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarSource(String(reader.result));
      setAvatarZoom(1);
      setAvatarOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const saveAvatar = async () => {
    if (!avatarSource || !userId) return;
    setAvatarBusy(true);
    try {
      const image = new Image();
      image.src = avatarSource;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Could not read image."));
      });
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 512;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image editing is unavailable.");
      const scale = Math.max(512 / image.width, 512 / image.height) * avatarZoom;
      const width = image.width * scale;
      const height = image.height * scale;
      context.drawImage(image, (512 - width) / 2, (512 - height) / 2, width, height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      );
      if (!blob) throw new Error("Could not crop image.");
      const path = `${userId}/avatars/profile.jpg`;
      const { signedUrl } = await createAvatarUploadTicket({ data: {} });
      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      if (!uploadResponse.ok) throw new Error("Could not upload profile photo.");
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", userId);
      if (profileError) throw profileError;
      await queryClient.invalidateQueries({ queryKey: ["vault", "profile", userId] });
      setAvatarOpen(false);
      setAvatarSource(null);
      toast.success("Profile photo updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update profile photo.");
    } finally {
      setAvatarBusy(false);
    }
  };

  return (
    <AppShell title="Profile" subtitle="How your account appears across Vaultra.">
      <div className="max-w-xl space-y-5">
        {/* Profile Card */}
        <div className="space-y-5 rounded-2xl border border-border/70 bg-surface/60 p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar className="size-16 shrink-0 border border-border">
              {avatar ? <AvatarImage src={avatar} alt="" /> : null}
              <AvatarFallback className="bg-surface-2 text-sm">{initials}</AvatarFallback>
            </Avatar>
            <input
              ref={avatarInput}
              className="sr-only"
              type="file"
              accept="image/*"
              onChange={(event) => {
                chooseAvatar(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{fullName || "Unnamed account"}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 h-8 gap-1.5 px-2 text-xs"
                onClick={() => avatarInput.current?.click()}
              >
                <ImagePlus className="size-3.5" /> Change photo
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Display name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={4}
              placeholder="A short line about you"
            />
          </div>

          <Button variant="hero" disabled={save.isPending || !userId} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>

        {/* Security Card */}
        <div className="rounded-2xl border border-border/70 bg-surface/60 p-4 sm:p-6">
          <h2 className="text-sm font-semibold">Account security</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Change your password anytime — a reset link will be sent to{" "}
            <strong className="text-foreground">{user?.email}</strong>.
          </p>
          <Button variant="glass" className="mt-4 gap-2" onClick={() => setResetOpen(true)}>
            <KeyRound className="size-4" />
            Change password
          </Button>
        </div>
      </div>

      {/* Password Reset Confirmation Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" /> Reset your password
            </DialogTitle>
            <DialogDescription>
              We'll send a password reset link to <strong>{user?.email}</strong>. Check your inbox
              and follow the link to set a new password.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setResetOpen(false)}
              disabled={resetBusy}
            >
              Cancel
            </Button>
            <Button
              variant="hero"
              size="sm"
              disabled={resetBusy}
              onClick={() => void handlePasswordReset()}
              className="gap-2"
            >
              {resetBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Mail className="size-4" />
              )}
              Send reset link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={avatarOpen}
        onOpenChange={(open) => {
          if (!avatarBusy) setAvatarOpen(open);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Crop profile photo</DialogTitle>
            <DialogDescription>Use the slider to zoom your photo.</DialogDescription>
          </DialogHeader>
          {avatarSource ? (
            <div className="mx-auto size-56 overflow-hidden rounded-full bg-surface-2">
              <img
                src={avatarSource}
                alt="Crop preview"
                className="size-full object-cover"
                style={{ transform: `scale(${avatarZoom})` }}
              />
            </div>
          ) : null}
          <input
            aria-label="Photo zoom"
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={avatarZoom}
            onChange={(event) => setAvatarZoom(Number(event.target.value))}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAvatarOpen(false)} disabled={avatarBusy}>
              Cancel
            </Button>
            <Button variant="hero" onClick={() => void saveAvatar()} disabled={avatarBusy}>
              {avatarBusy ? <Loader2 className="size-4 animate-spin" /> : "Save photo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
