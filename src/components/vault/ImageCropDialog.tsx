import { useCallback, useEffect, useRef, useState } from "react";
import { CropIcon, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CropState {
  offsetX: number; // canvas-space offset of image top-left
  offsetY: number;
  scale: number;
}

const CANVAS_SIZE = 320; // square crop output
const MIN_SCALE = 0.5;
const MAX_SCALE = 4;

export function ImageCropDialog({
  file,
  open,
  onOpenChange,
  onCrop,
}: {
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCrop: (cropped: File) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<CropState>({ offsetX: 0, offsetY: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const [busy, setBusy] = useState(false);

  // Load image when file changes
  useEffect(() => {
    if (!file || !open) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // Fit image to canvas initially
      const scale = Math.max(CANVAS_SIZE / img.naturalWidth, CANVAS_SIZE / img.naturalHeight);
      const ox = (CANVAS_SIZE - img.naturalWidth * scale) / 2;
      const oy = (CANVAS_SIZE - img.naturalHeight * scale) / 2;
      setCrop({ offsetX: ox, offsetY: oy, scale });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [file, open]);

  // Draw on canvas whenever crop state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.drawImage(
      img,
      crop.offsetX,
      crop.offsetY,
      img.naturalWidth * crop.scale,
      img.naturalHeight * crop.scale,
    );
    // Overlay grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo((CANVAS_SIZE / 3) * i, 0);
      ctx.lineTo((CANVAS_SIZE / 3) * i, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (CANVAS_SIZE / 3) * i);
      ctx.lineTo(CANVAS_SIZE, (CANVAS_SIZE / 3) * i);
      ctx.stroke();
    }
  }, [crop]);

  const clampOffset = useCallback(
    (ox: number, oy: number, scale: number) => {
      const img = imgRef.current;
      if (!img) return { ox, oy };
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      return {
        ox: Math.min(0, Math.max(CANVAS_SIZE - w, ox)),
        oy: Math.min(0, Math.max(CANVAS_SIZE - h, oy)),
      };
    },
    [],
  );

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: crop.offsetX, oy: crop.offsetY };
  };

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !dragStart.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      const raw = { ox: dragStart.current.ox + dx, oy: dragStart.current.oy + dy };
      const { ox, oy } = clampOffset(raw.ox, raw.oy, crop.scale);
      setCrop((c) => ({ ...c, offsetX: ox, offsetY: oy }));
    },
    [dragging, crop.scale, clampOffset],
  );

  const onMouseUp = () => { setDragging(false); dragStart.current = null; };

  // Touch support
  const touchStart = useRef<{ tx: number; ty: number; ox: number; oy: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { tx: t.clientX, ty: t.clientY, ox: crop.offsetX, oy: crop.offsetY };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - touchStart.current.tx;
    const dy = t.clientY - touchStart.current.ty;
    const raw = { ox: touchStart.current.ox + dx, oy: touchStart.current.oy + dy };
    const { ox, oy } = clampOffset(raw.ox, raw.oy, crop.scale);
    setCrop((c) => ({ ...c, offsetX: ox, offsetY: oy }));
  };

  const zoom = (delta: number) => {
    setCrop((c) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, c.scale + delta));
      const { ox, oy } = clampOffset(c.offsetX, c.offsetY, newScale);
      return { scale: newScale, offsetX: ox, offsetY: oy };
    });
  };

  const handleCrop = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !file) return;
    setBusy(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Crop failed"))),
          "image/jpeg",
          0.92,
        );
      });
      const ext = file.name.replace(/\.[^.]+$/, "");
      onCrop(new File([blob], `${ext}-cropped.jpg`, { type: "image/jpeg" }));
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-3xl p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CropIcon className="size-4 text-primary" /> Crop image
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Drag to reposition · use buttons to zoom</p>

          {/* Canvas crop area */}
          <div
            className="relative mx-auto overflow-hidden rounded-2xl border border-border/60 bg-surface-2"
            style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, cursor: dragging ? "grabbing" : "grab" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={() => { touchStart.current = null; }}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="block select-none"
            />
          </div>

          {/* Zoom controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => zoom(-0.15)}
              disabled={crop.scale <= MIN_SCALE}
              className="focus-ring grid size-8 place-items-center rounded-xl border border-border/60 bg-surface/60 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <ZoomOut className="size-4" />
            </button>
            <span className="font-mono text-xs text-muted-foreground w-12 text-center">
              {Math.round(crop.scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => zoom(0.15)}
              disabled={crop.scale >= MAX_SCALE}
              className="focus-ring grid size-8 place-items-center rounded-xl border border-border/60 bg-surface/60 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <ZoomIn className="size-4" />
            </button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Skip crop
          </Button>
          <Button variant="hero" size="sm" disabled={busy} onClick={() => void handleCrop()}>
            <CropIcon className="size-3.5" /> {busy ? "Cropping…" : "Apply crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
