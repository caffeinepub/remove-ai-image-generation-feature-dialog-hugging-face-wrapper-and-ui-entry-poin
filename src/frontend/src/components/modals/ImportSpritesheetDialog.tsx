import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";

interface ImportSpritesheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageData: {
    bitmap: ImageBitmap;
    width: number;
    height: number;
  } | null;
  onConfirm: (tileWidth: number, tileHeight: number) => void;
  onCancel: () => void;
}

export default function ImportSpritesheetDialog({
  open,
  onOpenChange,
  imageData,
  onConfirm,
  onCancel,
}: ImportSpritesheetDialogProps) {
  const [tileWidth, setTileWidth] = useState(32);
  const [tileHeight, setTileHeight] = useState(32);

  // Reset to defaults when dialog opens
  useEffect(() => {
    if (open) {
      setTileWidth(32);
      setTileHeight(32);
    }
  }, [open]);

  const handleConfirm = () => {
    if (tileWidth > 0 && tileHeight > 0) {
      onConfirm(tileWidth, tileHeight);
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  if (!imageData) return null;

  // Calculate number of frames based on tile dimensions
  const framesHorizontal = Math.floor(imageData.width / tileWidth);
  const framesVertical = Math.floor(imageData.height / tileHeight);
  const totalFrames = framesHorizontal * framesVertical;

  // Validation
  const isValid =
    tileWidth > 0 &&
    tileHeight > 0 &&
    tileWidth <= imageData.width &&
    tileHeight <= imageData.height &&
    totalFrames > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal container={document.getElementById("dialog-root")}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto z-[1000]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Import Spritesheet
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {/* Image Info Section */}
            <div className="space-y-2 p-3 rounded-md bg-card border">
              <div className="text-xs font-semibold text-muted-foreground">
                Spritesheet Information
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Image Size:</span>
                  <span className="font-mono">
                    {imageData.width} × {imageData.height} px
                  </span>
                </div>
              </div>
            </div>

            {/* Tile Dimensions Section */}
            <div className="space-y-3 p-3 rounded-md bg-card border">
              <div className="text-xs font-semibold text-muted-foreground">
                Tile Dimensions
              </div>

              <div className="space-y-2">
                <Label htmlFor="tileWidth" className="text-sm">
                  Tile Width (px)
                </Label>
                <Input
                  id="tileWidth"
                  type="number"
                  min="1"
                  max={imageData.width}
                  value={tileWidth}
                  onChange={(e) =>
                    setTileWidth(
                      Math.max(1, Number.parseInt(e.target.value) || 1),
                    )
                  }
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tileHeight" className="text-sm">
                  Tile Height (px)
                </Label>
                <Input
                  id="tileHeight"
                  type="number"
                  min="1"
                  max={imageData.height}
                  value={tileHeight}
                  onChange={(e) =>
                    setTileHeight(
                      Math.max(1, Number.parseInt(e.target.value) || 1),
                    )
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Preview Section */}
            <div className="space-y-2 p-3 rounded-md bg-card border">
              <div className="text-xs font-semibold text-muted-foreground">
                Frame Preview
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Frames Horizontal:
                  </span>
                  <span className="font-mono">{framesHorizontal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Frames Vertical:
                  </span>
                  <span className="font-mono">{framesVertical}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Frames:</span>
                  <span
                    className={`font-mono ${totalFrames > 0 ? "text-green-500" : "text-red-500"}`}
                  >
                    {totalFrames}
                  </span>
                </div>
              </div>

              {!isValid && (
                <div className="text-xs text-red-500 mt-2">
                  Invalid tile dimensions. Please ensure tiles fit within the
                  image.
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isValid}
              className="text-sm"
            >
              Import {totalFrames} Frame{totalFrames !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
