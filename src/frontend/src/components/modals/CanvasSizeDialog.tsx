import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";

interface CanvasSizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWidth: number;
  currentHeight: number;
  onConfirm: (width: number, height: number) => void;
}

export default function CanvasSizeDialog({
  open,
  onOpenChange,
  currentWidth,
  currentHeight,
  onConfirm,
}: CanvasSizeDialogProps) {
  const [width, setWidth] = useState(currentWidth.toString());
  const [height, setHeight] = useState(currentHeight.toString());

  useEffect(() => {
    if (open) {
      setWidth(currentWidth.toString());
      setHeight(currentHeight.toString());
    }
  }, [open, currentWidth, currentHeight]);

  const handleConfirm = () => {
    const newWidth = Number.parseInt(width, 10);
    const newHeight = Number.parseInt(height, 10);

    if (
      Number.isNaN(newWidth) ||
      Number.isNaN(newHeight) ||
      newWidth <= 0 ||
      newHeight <= 0
    ) {
      return;
    }

    onConfirm(newWidth, newHeight);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal container={document.getElementById("dialog-root")}>
        <DialogContent className="sm:max-w-[425px] z-[1000]">
          <DialogHeader>
            <DialogTitle>Canvas Size</DialogTitle>
            <DialogDescription>
              Set the new canvas dimensions in pixels.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="width" className="text-right">
                Width
              </Label>
              <Input
                id="width"
                type="number"
                min="1"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="height" className="text-right">
                Height
              </Label>
              <Input
                id="height"
                type="number"
                min="1"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
