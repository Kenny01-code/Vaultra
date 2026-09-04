import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DEFAULT_QUOTA_BYTES,
  VAULT_BUCKET,
  assertOwnedPath,
  buildStoragePath,
  sanitizeFileName,
  validateUploadIntent,
} from "./files.server";

const SHARE_EXPIRY_SECONDS = 600; // 10 min

// ─── helpers ────────────────────────────────────────────────────────────────

async function getAdminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// ─── createUploadTicket ──────────────────────────────────────────────────────
// Validates file intent, enforces quota server-side, returns a signed PUT URL.
// The client PUTs directly to Supabase Storage — no bandwidth through the server.

export const createUploadTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        name: z.string().min(1).max(400),
        sizeBytes: z.number().int().positive(),
        mimeType: z.string().max(200).default("application/octet-stream"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { safeName, extension } = validateUploadIntent(data);

    const admin = await getAdminClient();

    // Fetch quota from profiles (server-side, bypasses RLS)
    const { data: profile } = await admin
      .from("profiles")
      .select("storage_quota_bytes")
      .eq("id", context.userId)
      .single();

    const quota = Number(profile?.storage_quota_bytes ?? DEFAULT_QUOTA_BYTES);

    // Sum all existing file sizes for this user
    const { data: usageRows } = await admin
      .from("files")
      .select("size_bytes")
      .eq("owner_id", context.userId);

    const used = (usageRows ?? []).reduce((sum, r) => sum + Number(r.size_bytes ?? 0), 0);

    if (used + data.sizeBytes > quota) {
      throw new Error(
        used >= quota
          ? "Your vault is full. Delete some files to free up space."
          : `Not enough storage. You have ${Math.round((quota - used) / 1024 / 1024)} MB remaining but this file needs ${Math.round(data.sizeBytes / 1024 / 1024)} MB.`,
      );
    }

    const path = buildStoragePath(context.userId, extension);

    // Issue a signed upload URL (5 min TTL) — client PUTs directly to Storage
    const { data: signed, error } = await admin.storage
      .from(VAULT_BUCKET)
      .createSignedUploadUrl(path);

    if (error || !signed) throw new Error("Could not create upload URL. Please try again.");

    return { path, signedUrl: signed.signedUrl, token: signed.token, safeName };
  });
// ─── finalizeUpload ──────────────────────────────────────────────────────────
// Called after the client PUT succeeds. Verifies the object exists in Storage,
// reads the ACTUAL size from the server (never trusts the client-supplied value),
// then creates the Firestore/DB record.

export const finalizeUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        path: z.string().min(3).max(300),
        name: z.string().min(1).max(400),
        mimeType: z.string().max(200).default("application/octet-stream"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    assertOwnedPath(context.userId, data.path);

    const { safeName } = validateUploadIntent({
      name: data.name,
      sizeBytes: 1, // placeholder — real size read from storage below
      mimeType: data.mimeType,
    });

    const admin = await getAdminClient();

    // Verify the object actually exists and get its real metadata
    const { data: objects, error: listError } = await admin.storage
      .from(VAULT_BUCKET)
      .list(context.userId, { search: data.path.split("/").pop() });

    if (listError) throw new Error("Could not verify upload. Please try again.");

    const obj = (objects ?? []).find((o) => `${context.userId}/${o.name}` === data.path);
    if (!obj) throw new Error("Upload could not be verified. Please try again.");

    // Use server-reported size — never the client-supplied value
    const serverSize = Number(obj.metadata?.size ?? 0);
    if (serverSize <= 0) throw new Error("Uploaded file appears to be empty.");

    // Re-validate with real size
    validateUploadIntent({ name: safeName, sizeBytes: serverSize, mimeType: data.mimeType });

    // Re-check quota against the actual uploaded size after the client PUT.
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("storage_quota_bytes")
      .eq("id", context.userId)
      .single();

    if (profileError) throw new Error("Could not verify storage quota. Please try again.");

    const { data: usageRows, error: usageError } = await admin
      .from("files")
      .select("size_bytes")
      .eq("owner_id", context.userId);

    if (usageError) throw new Error("Could not verify storage usage. Please try again.");

    const quota = Number(profile.storage_quota_bytes ?? DEFAULT_QUOTA_BYTES);
    const used = (usageRows ?? []).reduce((sum, row) => sum + Number(row.size_bytes ?? 0), 0);

    if (used + serverSize > quota) {
      await admin.storage.from(VAULT_BUCKET).remove([data.path]);
      throw new Error("This upload exceeds your remaining storage quota.");
    }

    const shareToken = crypto.randomUUID();

    const { data: row, error: insertError } = await admin
      .from("files")
      .insert({
        owner_id: context.userId,
        name: safeName,
        storage_path: data.path,
        mime_type: data.mimeType,
        size_bytes: serverSize,
        is_public: false,
        share_token: shareToken,
        download_count: 0,
      })
      .select()
      .single();

    if (insertError) {
      // Clean up orphaned storage object
      await admin.storage.from(VAULT_BUCKET).remove([data.path]);
      throw insertError;
    }

    return row;
  });

// ─── getOwnedFileUrl ─────────────────────────────────────────────────────────

export const getOwnedFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ fileId: z.string().min(1), download: z.boolean().default(false) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const admin = await getAdminClient();
    const { data: file, error } = await admin
      .from("files")
      .select("*")
      .eq("id", data.fileId)
      .eq("owner_id", context.userId)
      .single();

    if (error || !file) throw new Error("File not found.");

    const { data: signed, error: urlError } = await admin.storage
      .from(VAULT_BUCKET)
      .createSignedUrl(file.storage_path, 300, {
        download: data.download ? file.name : undefined,
      });

    if (urlError || !signed) throw new Error("Could not generate download URL.");

    return { url: signed.signedUrl, name: file.name, mimeType: file.mime_type };
  });

// ─── setFileVisibility ───────────────────────────────────────────────────────

export const setFileVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ fileId: z.string().min(1), isPublic: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const admin = await getAdminClient();
    const { data: file, error } = await admin
      .from("files")
      .update({ is_public: data.isPublic })
      .eq("id", data.fileId)
      .eq("owner_id", context.userId)
      .select()
      .single();

    if (error || !file) throw new Error("File not found.");
    return file;
  });

// ─── renameFile ──────────────────────────────────────────────────────────────

export const renameFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ fileId: z.string().min(1), name: z.string().min(1).max(400) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const safeName = sanitizeFileName(data.name);
    const admin = await getAdminClient();

    const { data: file, error } = await admin
      .from("files")
      .update({ name: safeName })
      .eq("id", data.fileId)
      .eq("owner_id", context.userId)
      .select()
      .single();

    if (error || !file) throw new Error("File not found.");
    return file;
  });

// ─── deleteFile ──────────────────────────────────────────────────────────────

export const deleteFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ fileId: z.string().min(1) }).parse(data))
  .handler(async ({ data, context }) => {
    const admin = await getAdminClient();

    // Fetch first to verify ownership and get storage path
    const { data: file, error: fetchError } = await admin
      .from("files")
      .select("id, storage_path, owner_id")
      .eq("id", data.fileId)
      .eq("owner_id", context.userId)
      .single();

    if (fetchError || !file) throw new Error("File not found.");

    assertOwnedPath(context.userId, file.storage_path);

    // Delete storage object first
    const { error: storageError } = await admin.storage
      .from(VAULT_BUCKET)
      .remove([file.storage_path]);

    if (storageError) throw new Error("Could not delete file from storage.");

    // Then delete the DB record
    const { error: dbError } = await admin
      .from("files")
      .delete()
      .eq("id", data.fileId)
      .eq("owner_id", context.userId);

    if (dbError) throw dbError;

    return { id: data.fileId };
  });

// ─── getSharedFile ───────────────────────────────────────────────────────────
// Public endpoint — no auth required. Resolves a share token to a signed URL.

export const getSharedFile = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ token: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const admin = await getAdminClient();

    const { data: file, error } = await admin
      .from("files")
      .select("*")
      .eq("share_token", data.token)
      .eq("is_public", true)
      .maybeSingle();

    if (error || !file) return { found: false as const };

    const { data: signed, error: urlError } = await admin.storage
      .from(VAULT_BUCKET)
      .createSignedUrl(file.storage_path, SHARE_EXPIRY_SECONDS);

    if (urlError || !signed) return { found: false as const };

    // Increment download count (best-effort, don't fail the request)
    await admin
      .from("files")
      .update({ download_count: (file.download_count ?? 0) + 1 })
      .eq("id", file.id);

    return {
      found: true as const,
      file: {
        id: file.id,
        name: file.name,
        mimeType: file.mime_type,
        sizeBytes: Number(file.size_bytes),
        createdAt: file.created_at,
        url: signed.signedUrl,
      },
    };
  });
