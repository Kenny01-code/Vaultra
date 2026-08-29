import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireFirebaseAuth } from "@/integrations/firebase/auth-middleware";
import {
  BUCKET,
  DEFAULT_QUOTA_BYTES,
  assertOwnedPath,
  buildStoragePath,
  validateUploadIntent,
} from "./files.server";

const SHARE_EXPIRY_SECONDS = 600;

async function getAdminStorage() {
  const { getStorage } = await import("firebase-admin/storage");
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  if (!getApps().length) {
    const sa = process.env["FIREBASE_SERVICE_ACCOUNT"];
    if (!sa) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT env var.");
    initializeApp({ credential: cert(JSON.parse(sa)) });
  }
  return getStorage().bucket(BUCKET);
}

async function getAdminDb() {
  const { getFirestore } = await import("firebase-admin/firestore");
  return getFirestore();
}

export const createUploadTicket = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
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

    const adminDb = await getAdminDb();
    const filesSnap = await adminDb
      .collection("files")
      .where("owner_id", "==", context.userId)
      .select("size_bytes")
      .get();

    const profileSnap = await adminDb.collection("profiles").doc(context.userId).get();
    const quota = Number(profileSnap.data()?.["storage_quota_bytes"] ?? DEFAULT_QUOTA_BYTES);
    const used = filesSnap.docs.reduce((sum, d) => sum + Number(d.data()["size_bytes"] ?? 0), 0);

    if (used + data.sizeBytes > quota) {
      throw new Error("Not enough storage left in your vault for this file.");
    }

    const path = buildStoragePath(context.userId, extension);
    const bucket = await getAdminStorage();
    const file = bucket.file(path);
    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000,
      contentType: data.mimeType,
    });

    return { path, signedUrl, safeName };
  });

export const finalizeUpload = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((data) =>
    z.object({ path: z.string().min(3).max(300), name: z.string().min(1).max(400) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    assertOwnedPath(context.userId, data.path);
    const { safeName } = validateUploadIntent({
      name: data.name,
      sizeBytes: 1,
      mimeType: "application/octet-stream",
    });

    const bucket = await getAdminStorage();
    const file = bucket.file(data.path);
    const [exists] = await file.exists();
    if (!exists) throw new Error("Upload could not be verified. Please try again.");

    const [meta] = await file.getMetadata();
    const serverSize = Number(meta.size ?? 0);
    const serverMime = String(meta.contentType ?? "application/octet-stream");
    validateUploadIntent({ name: safeName, sizeBytes: serverSize, mimeType: serverMime });

    const adminDb = await getAdminDb();
    const shareToken = crypto.randomUUID();
    const docRef = adminDb.collection("files").doc();
    const row = {
      id: docRef.id,
      owner_id: context.userId,
      name: safeName,
      storage_path: data.path,
      mime_type: serverMime,
      size_bytes: serverSize,
      is_public: false,
      share_token: shareToken,
      download_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await docRef.set(row);
    } catch (error) {
      await file.delete().catch(() => undefined);
      throw error;
    }
    return row;
  });

export const getOwnedFileUrl = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((data) =>
    z.object({ fileId: z.string().min(1), download: z.boolean().default(false) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const adminDb = await getAdminDb();
    const snap = await adminDb.collection("files").doc(data.fileId).get();
    const file = snap.data();
    if (!file || file["owner_id"] !== context.userId) throw new Error("File not found.");

    const bucket = await getAdminStorage();
    const [url] = await bucket.file(file["storage_path"] as string).getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 5 * 60 * 1000,
      ...(data.download
        ? { responseDisposition: `attachment; filename="${file["name"] as string}"` }
        : {}),
    });

    return { url, name: file["name"] as string, mimeType: file["mime_type"] as string };
  });

export const setFileVisibility = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((data) =>
    z.object({ fileId: z.string().min(1), isPublic: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const adminDb = await getAdminDb();
    const ref = adminDb.collection("files").doc(data.fileId);
    const snap = await ref.get();
    const file = snap.data();
    if (!file || file["owner_id"] !== context.userId) throw new Error("File not found.");
    await ref.update({ is_public: data.isPublic, updated_at: new Date().toISOString() });
    return { id: data.fileId, is_public: data.isPublic, share_token: file["share_token"] as string };
  });

export const renameFile = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((data) =>
    z.object({ fileId: z.string().min(1), name: z.string().min(1).max(400) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { safeName } = validateUploadIntent({
      name: data.name,
      sizeBytes: 1,
      mimeType: "application/octet-stream",
    });
    const adminDb = await getAdminDb();
    const ref = adminDb.collection("files").doc(data.fileId);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.["owner_id"] !== context.userId)
      throw new Error("File not found.");
    await ref.update({ name: safeName, updated_at: new Date().toISOString() });
    return { id: data.fileId, name: safeName };
  });

export const deleteFile = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((data) => z.object({ fileId: z.string().min(1) }).parse(data))
  .handler(async ({ data, context }) => {
    const adminDb = await getAdminDb();
    const ref = adminDb.collection("files").doc(data.fileId);
    const snap = await ref.get();
    const file = snap.data();
    if (!file || file["owner_id"] !== context.userId) throw new Error("File not found.");

    assertOwnedPath(context.userId, file["storage_path"] as string);
    const bucket = await getAdminStorage();
    await bucket.file(file["storage_path"] as string).delete();
    await ref.delete();
    return { id: data.fileId };
  });

export const getSharedFile = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ token: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const adminDb = await getAdminDb();
    const snap = await adminDb
      .collection("files")
      .where("share_token", "==", data.token)
      .where("is_public", "==", true)
      .limit(1)
      .get();

    if (snap.empty) return { found: false as const };

    const docSnap = snap.docs[0]!;
    const file = docSnap.data();

    const bucket = await getAdminStorage();
    const [url] = await bucket.file(file["storage_path"] as string).getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + SHARE_EXPIRY_SECONDS * 1000,
    });

    await docSnap.ref.update({ download_count: (Number(file["download_count"] ?? 0)) + 1 });

    return {
      found: true as const,
      file: {
        id: docSnap.id,
        name: file["name"] as string,
        mimeType: file["mime_type"] as string,
        sizeBytes: Number(file["size_bytes"]),
        createdAt: file["created_at"] as string,
        url,
      },
    };
  });
