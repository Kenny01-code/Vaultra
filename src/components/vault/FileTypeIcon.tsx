import {
  FileArchive,
  FileAudio,
  FileText,
  FileVideo,
  Image as ImageIcon,
  File as GenericFile,
} from "lucide-react";

import { fileKind } from "@/lib/format";
import { cn } from "@/lib/utils";

const MAP = {
  image: { Icon: ImageIcon, tone: "text-chart-1" },
  video: { Icon: FileVideo, tone: "text-chart-4" },
  audio: { Icon: FileAudio, tone: "text-chart-2" },
  pdf: { Icon: FileText, tone: "text-chart-5" },
  text: { Icon: FileText, tone: "text-chart-3" },
  archive: { Icon: FileArchive, tone: "text-accent" },
  other: { Icon: GenericFile, tone: "text-muted-foreground" },
} as const;

export function FileTypeIcon({
  mimeType,
  name,
  className,
}: {
  mimeType: string;
  name?: string;
  className?: string;
}) {
  const { Icon, tone } = MAP[fileKind(mimeType, name)];
  return <Icon className={cn("size-5", tone, className)} aria-hidden="true" />;
}
