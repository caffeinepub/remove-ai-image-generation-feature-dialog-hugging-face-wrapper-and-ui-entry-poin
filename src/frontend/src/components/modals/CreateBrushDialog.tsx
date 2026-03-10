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
import React, { useState } from "react";

interface CreateBrushDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
  defaultName: string;
}

/**
 * Modal dialog for creating custom brushes from selections with name input only, delegating all serialization and download logic to parent component.
 */
export default function CreateBrushDialog({
  open,
  onOpenChange,
  onSave,
  defaultName,
}: CreateBrushDialogProps) {
  const [brushName, setBrushName] = useState(defaultName);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setBrushName(defaultName);
    }
  }, [open, defaultName]);

  const handleSave = () => {
    if (!brushName.trim()) return;

    // Call parent's onSave handler (which handles serialization and download)
    onSave(brushName.trim());

    // Close dialog
    onOpenChange(false);
  };

  const handleDialogMouseDown = (e: React.MouseEvent) => {
    // Stop propagation to prevent selection cancellation
    e.stopPropagation();
  };

  const handleDialogClick = (e: React.MouseEvent) => {
    // Stop propagation to prevent selection cancellation
    e.stopPropagation();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogContent
          className="sm:max-w-[425px]"
          onMouseDown={handleDialogMouseDown}
          onClick={handleDialogClick}
        >
          <DialogHeader>
            <DialogTitle>Create Brush From Selection</DialogTitle>
            <DialogDescription>
              Enter a name for your custom brush
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="brush-name">Brush Name</Label>
              <Input
                id="brush-name"
                value={brushName}
                onChange={(e) => setBrushName(e.target.value)}
                placeholder="Enter brush name"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && brushName.trim()) {
                    handleSave();
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!brushName.trim()}>
              Save Brush
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
