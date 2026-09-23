import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[9999] flex items-center justify-center gap-2 bg-amber-500/95 px-4 py-2 text-xs font-medium text-amber-950 backdrop-blur-sm"
    >
      <WifiOff className="size-3.5 shrink-0" />
      <span>You're offline — uploads are paused. Files already in your vault are still accessible.</span>
    </div>
  );
}
