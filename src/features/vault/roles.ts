export const ADMIN_EMAILS = ["ighiledivine77@gmail.com"];

export function isUserAdmin(
  user: { email?: string | null; emailVerified?: boolean } | null,
): boolean {
  return Boolean(
    user?.emailVerified && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase().trim()),
  );
}
