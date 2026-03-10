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

interface SaveAsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
  defaultName?: string;
  isSaving?: boolean;
}

export default function SaveAsDialog({
  open,
  onOpenChange,
  onSave,
  defaultName = "Untitled Project",
  isSaving = false,
}: SaveAsDialogProps) {
  const [name, setName] = useState(defaultName);

  // Update name when defaultName changes
  useEffect(() => {
    if (open) {
      setName(defaultName);
    }
  }, [open, defaultName]);

  const handleSave = () => {
    if (name.trim() && !isSaving) {
      onSave(name.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSaving) {
      handleSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal container={document.getElementById("dialog-root")}>
        <DialogContent className="max-w-md font-['Inter'] z-[1000]">
          <DialogHeader>
            <DialogTitle className="text-base">Save Project As</DialogTitle>
            <DialogDescription className="text-xs">
              {isSaving
                ? "Compressing and saving project..."
                : "Enter a name for your project"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name" className="text-xs">
                Project Name
              </Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter project name"
                className="text-xs"
                autoFocus
                disabled={isSaving}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="text-[10px]"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || isSaving}
              className="text-[10px]"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
