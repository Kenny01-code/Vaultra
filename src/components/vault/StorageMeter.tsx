import { HardDrive } from "lucide-react";

import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StorageMeter({
  used,
  quota,
  fileCount,
  className,
}: {
  used: number;
  quota: number;
  fileCount: number;
  className?: string;
}) {
  const percent = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
  const nearlyFull = percent > 85;

  return (
    <div className={cn("glass rounded-2xl p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <HardDrive className="size-4 text-primary" aria-hidden="true" />
          Storage
        </div>
        <span className="font-mono text-xs text-muted-foreground">{percent.toFixed(1)}%</span>
      </div>

      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Storage used"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700 ease-out",
            nearlyFull ? "bg-destructive" : "bg-brand",
          )}
          style={{ width: `${Math.max(percent, 1.5)}%` }}
        />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{formatBytes(used)}</span> of{" "}
        {formatBytes(quota)} used · {fileCount} {fileCount === 1 ? "file" : "files"}
      </p>
    </div>
  );
}
