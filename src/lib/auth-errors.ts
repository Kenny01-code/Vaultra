/**
 * Translates Supabase Auth error messages into clean, friendly messages for
 * end users. Supabase's GoTrue API does not use Firebase-style error codes
 * (e.g. "auth/invalid-email") -- errors are identified by matching against
 * the message text it actually returns.
 */
export function getAuthErrorMessage(error: unknown): string {
  if (!error) return "An unexpected error occurred. Please try again.";

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "Incorrect email or password. Please try again.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please confirm your email address before signing in.";
  }
  if (lower.includes("user already registered") || lower.includes("already registered")) {
    return "An account with this email address already exists. Please sign in instead.";
  }
  if (lower.includes("password should be at least")) {
    return "Password is too weak. Please use at least 6 characters.";
  }
  if (lower.includes("unable to validate email") || lower.includes("invalid email")) {
    return "Please enter a valid email address.";
  }
  if (lower.includes("email rate limit") || lower.includes("too many requests")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (lower.includes("for security purposes") && lower.includes("after")) {
    return "Please wait a moment before trying again.";
  }
  if (lower.includes("network") || lower.includes("failed to fetch")) {
    return "Network error. Please check your internet connection and try again.";
  }
  if (lower.includes("popup") && lower.includes("closed")) {
    return "Sign-in popup was closed before completing.";
  }
  if (lower.includes("popup") && lower.includes("block")) {
    return "Sign-in popup was blocked by your browser. Please allow popups for this site.";
  }
  if (lower.includes("session") && (lower.includes("expired") || lower.includes("missing"))) {
    return "Your session has expired. Please sign in again.";
  }

  return message.replace(/^(AuthApiError|AuthError):\s*/i, "");
}
