/**
 * IndexedDB wrapper for:
 * - Guest mode file storage (files stored locally, never uploaded to Supabase)
 * - Draft upload queue (file blobs + metadata that survive navigation/refresh)
 */

const DB_NAME = "vaultra-offline";
const DB_VERSION = 1;

export type GuestFile = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  blob: Blob;
  createdAt: string;
};

export type DraftUpload = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  blob: Blob;
  savedAt: string;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("guest_files")) {
        db.createObjectStore("guest_files", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("draft_uploads")) {
        db.createObjectStore("draft_uploads", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const req = fn(s);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Guest Files ─────────────────────────────────────────────────────────────

export async function saveGuestFile(file: GuestFile): Promise<void> {
  await tx("guest_files", "readwrite", (s) => s.put(file));
}

export async function listGuestFiles(): Promise<GuestFile[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction("guest_files", "readonly");
    const req = t.objectStore("guest_files").getAll();
    req.onsuccess = () => resolve((req.result as GuestFile[]).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
    req.onerror = () => reject(req.error);
  });
}

export async function deleteGuestFile(id: string): Promise<void> {
  await tx("guest_files", "readwrite", (s) => s.delete(id));
}

export async function clearGuestFiles(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction("guest_files", "readwrite");
    const req = t.objectStore("guest_files").clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── Draft Uploads ────────────────────────────────────────────────────────────

export async function saveDraft(draft: DraftUpload): Promise<void> {
  await tx("draft_uploads", "readwrite", (s) => s.put(draft));
}

export async function listDrafts(): Promise<DraftUpload[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction("draft_uploads", "readonly");
    const req = t.objectStore("draft_uploads").getAll();
    req.onsuccess = () => resolve(req.result as DraftUpload[]);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteDraft(id: string): Promise<void> {
  await tx("draft_uploads", "readwrite", (s) => s.delete(id));
}

export async function clearDrafts(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction("draft_uploads", "readwrite");
    const req = t.objectStore("draft_uploads").clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
