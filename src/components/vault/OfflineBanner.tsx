import { useEffect, useState } from "react";
import { WifiOff, X } from "lucide-react";

export function OfflineBanner() {
  // Start as null (unknown) to avoid SSR/hydration mismatch
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Set real value only on client after mount
    setIsOnline(navigator.onLine);
    const on = () => { setIsOnline(true); setDismissed(false); };
    const off = () => { setIsOnline(false); setDismissed(false); };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (isOnline === null || isOnline || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[9999] flex items-center justify-center gap-2 bg-amber-500/95 px-4 py-2 text-xs font-medium text-amber-950 backdrop-blur-sm"
    >
      <WifiOff className="size-3.5 shrink-0" />
      <span>You're offline — uploads are paused. Files already in your vault are still accessible.</span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="ml-2 rounded-full p-0.5 hover:bg-amber-600/30 transition-colors"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
