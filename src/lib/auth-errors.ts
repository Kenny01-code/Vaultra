/**
 * Translates Firebase Authentication error codes and objects into clean,
 * friendly messages for end users.
 */
export function getAuthErrorMessage(error: unknown): string {
  if (!error) return "An unexpected error occurred. Please try again.";

  const code = (error as { code?: string })?.code;
  const message = error instanceof Error ? error.message : String(error);

  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password. Please try again.";
    case "auth/email-already-in-use":
      return "An account with this email address already exists. Please sign in instead.";
    case "auth/weak-password":
      return "Password is too weak. Please use at least 6 characters with letters and numbers.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled. Please contact support or try another method.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in popup was closed before completing.";
    case "auth/popup-blocked":
      return "Sign-in popup was blocked by your browser. Please allow popups for this site.";
    case "auth/account-exists-with-different-credential":
      return "This email is already registered. Sign in with your existing email or Google account first, then link GitHub from Firebase Authentication settings.";
    case "auth/requires-recent-login":
      return "Please sign in again before performing this action.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection and try again.";
    default:
      return message
        .replace(/^Firebase:\s*/i, "")
        .replace(/^FirebaseError:\s*/i, "")
        .replace(/\s*\([^)]*\)\.?$/, "");
  }
}

