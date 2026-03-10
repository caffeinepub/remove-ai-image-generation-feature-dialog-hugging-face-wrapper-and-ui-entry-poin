import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageData: {
    bitmap: ImageBitmap;
    width: number;
    height: number;
    fileSize: number;
    hasTransparency: boolean;
  } | null;
  onContinue: (options: ImportOptions) => void;
  onCancel: () => void;
  onImportSpritesheet?: () => void;
}

export interface ImportOptions {
  initialScale: number;
  fitToCanvas: boolean;
  trueSize: boolean;
  downscaleIfNeeded: boolean;
  importAsReference?: boolean;
}

export default function ImportDialog({
  open,
  onOpenChange,
  imageData,
  onContinue,
  onCancel,
  onImportSpritesheet,
}: ImportDialogProps) {
  const [fitToCanvas, setFitToCanvas] = useState(true);
  const [trueSize, setTrueSize] = useState(false);
  const [downscaleIfNeeded, setDownscaleIfNeeded] = useState(false);
  const [outputScale, setOutputScale] = useState(1);
  const [importAsReference, setImportAsReference] = useState(false);

  // Reset to defaults when dialog opens
  useEffect(() => {
    if (open) {
      setFitToCanvas(true);
      setTrueSize(false);
      setDownscaleIfNeeded(false);
      setOutputScale(1);
      setImportAsReference(false);
    }
  }, [open]);

  const handleContinue = () => {
    const options: ImportOptions = {
      initialScale: outputScale,
      fitToCanvas,
      trueSize,
      downscaleIfNeeded,
      importAsReference,
    };
    onContinue(options);
  };

  const handleCancel = () => {
    onCancel();
  };

  const handleImportSpritesheet = () => {
    if (onImportSpritesheet) {
      onImportSpritesheet();
    }
  };

  if (!imageData) return null;

  // Calculate aspect ratio
  const aspectRatio = (imageData.width / imageData.height).toFixed(2);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal container={document.getElementById("dialog-root")}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto z-[1000]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Import Settings
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {/* Image Info Section */}
            <div className="space-y-2 p-3 rounded-md bg-card border">
              <div className="text-xs font-semibold text-muted-foreground">
                Image Information
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dimensions:</span>
                  <span className="font-mono">
                    {imageData.width} × {imageData.height} px
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">File Size:</span>
                  <span className="font-mono">
                    {formatFileSize(imageData.fileSize)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aspect Ratio:</span>
                  <span className="font-mono">{aspectRatio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transparency:</span>
                  <span
                    className={
                      imageData.hasTransparency
                        ? "text-green-500"
                        : "text-muted-foreground"
                    }
                  >
                    {imageData.hasTransparency ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>

            {/* Import Type Section */}
            {onImportSpritesheet && (
              <div className="space-y-2 p-3 rounded-md bg-card border">
                <div className="text-xs font-semibold text-muted-foreground">
                  Import Type
                </div>
                <Button
                  variant="outline"
                  onClick={handleImportSpritesheet}
                  className="w-full text-sm"
                >
                  Import as Spritesheet
                </Button>
                <p className="text-xs text-muted-foreground">
                  Slice this image into multiple frames based on tile dimensions
                </p>
              </div>
            )}

            {/* Import Options Section */}
            <div className="space-y-3 p-3 rounded-md bg-card border">
              <div className="text-xs font-semibold text-muted-foreground">
                Import Options
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fitToCanvas"
                  checked={fitToCanvas}
                  onCheckedChange={(checked) =>
                    setFitToCanvas(checked === true)
                  }
                />
                <Label htmlFor="fitToCanvas" className="text-sm cursor-pointer">
                  Fit to canvas (default)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="trueSize"
                  checked={trueSize}
                  onCheckedChange={(checked) => setTrueSize(checked === true)}
                />
                <Label htmlFor="trueSize" className="text-sm cursor-pointer">
                  True size (1×)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="downscaleIfNeeded"
                  checked={downscaleIfNeeded}
                  onCheckedChange={(checked) =>
                    setDownscaleIfNeeded(checked === true)
                  }
                />
                <Label
                  htmlFor="downscaleIfNeeded"
                  className="text-sm cursor-pointer"
                >
                  Downscale if needed
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="importAsReference"
                  checked={importAsReference}
                  onCheckedChange={(checked) =>
                    setImportAsReference(checked === true)
                  }
                />
                <Label
                  htmlFor="importAsReference"
                  className="text-sm cursor-pointer"
                >
                  Import as reference layer
                </Label>
              </div>
            </div>

            {/* Output Scale Section */}
            <div className="space-y-2">
              <Label className="text-sm">Output Scale</Label>
              <Select
                value={outputScale.toString()}
                onValueChange={(value) =>
                  setOutputScale(Number.parseInt(value))
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1×</SelectItem>
                  <SelectItem value="2">2×</SelectItem>
                  <SelectItem value="4">4×</SelectItem>
                  <SelectItem value="8">8×</SelectItem>
                  <SelectItem value="16">16×</SelectItem>
                  <SelectItem value="32">32×</SelectItem>
                </SelectContent>
              </Select>
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
            <Button onClick={handleContinue} className="text-sm">
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
