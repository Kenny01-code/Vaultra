export type VaultFile = {
  id: string;
  owner_id: string;
  name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  is_public: boolean;
  share_token: string;
  download_count: number;
  created_at: string;
  updated_at: string;
};

export type VaultView = "recent" | "all" | "public" | "private";

export type VaultSort =
  "date-desc" | "date-asc" | "size-desc" | "size-asc" | "name-asc" | "name-desc";

export type VaultDisplayMode = "grid" | "list";

export const MAX_FILE_BYTES = 1024 * 1024 * 1024; // 1 GB per file
export const DEFAULT_QUOTA_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB per user
