import { useCallback, useEffect, useState } from "react";
import {
  clearGuestFiles,
  deleteGuestFile,
  listGuestFiles,
  saveGuestFile,
  type GuestFile,
} from "@/lib/offline-db";

const GUEST_KEY = "vaultra-guest-mode";

export function useGuestMode() {
  const [isGuest, setIsGuest] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(GUEST_KEY) === "1";
  });
  const [guestFiles, setGuestFiles] = useState<GuestFile[]>([]);
  const [loading, setLoading] = useState(false);

  const enterGuest = useCallback(() => {
    localStorage.setItem(GUEST_KEY, "1");
    setIsGuest(true);
  }, []);

  const exitGuest = useCallback(async (clearFiles = false) => {
    localStorage.removeItem(GUEST_KEY);
    if (clearFiles) await clearGuestFiles();
    setIsGuest(false);
    setGuestFiles([]);
  }, []);

  const loadFiles = useCallback(async () => {
    if (!isGuest) return;
    setLoading(true);
    try {
      const files = await listGuestFiles();
      setGuestFiles(files);
    } finally {
      setLoading(false);
    }
  }, [isGuest]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const addGuestFile = useCallback(
    async (file: File) => {
      const gf: GuestFile = {
        id: crypto.randomUUID(),
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        blob: file,
        createdAt: new Date().toISOString(),
      };
      await saveGuestFile(gf);
      setGuestFiles((prev) => [gf, ...prev]);
      return gf;
    },
    [],
  );

  const removeGuestFile = useCallback(async (id: string) => {
    await deleteGuestFile(id);
    setGuestFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return {
    isGuest,
    enterGuest,
    exitGuest,
    guestFiles,
    loading,
    addGuestFile,
    removeGuestFile,
    refreshFiles: loadFiles,
  };
}
