import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShortcutsDialog({
  open,
  onOpenChange,
}: ShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal container={document.getElementById("dialog-root")}>
        <DialogContent className="max-w-2xl max-h-[80vh] font-['Inter'] z-[1000]">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>
              Quick reference for all available keyboard shortcuts
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6 text-sm">
              <section>
                <h3 className="text-base font-semibold mb-3">General</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Undo</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      Ctrl+Z
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Redo</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      Ctrl+Shift+Z
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Focus Mode</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      F
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">
                      Exit Focus Mode
                    </span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      Esc
                    </kbd>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-base font-semibold mb-3">Clipboard</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Cut</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      Ctrl+X
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Copy</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      Ctrl+C
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Paste</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      Ctrl+V
                    </kbd>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-base font-semibold mb-3">
                  Canvas Navigation
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Pan Canvas</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      Space + Drag
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Zoom In/Out</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      Scroll Wheel
                    </kbd>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-base font-semibold mb-3">Tools</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Pencil</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      P
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Brush</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      B
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Eraser</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      E
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Fill</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      G
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Eyedropper</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      I
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Outline</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      O
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Text</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      T
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Select</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      S
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Lasso</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      L
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Magic Select</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      M
                    </kbd>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-base font-semibold mb-3">
                  Selection Tools
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">
                      Commit Selection
                    </span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      Enter
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">
                      Cancel Selection
                    </span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      Esc
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">
                      Rotate Selection
                    </span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      R + Drag
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">
                      Move Pivot Point
                    </span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      Alt + Drag
                    </kbd>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-base font-semibold mb-3">Text Tool</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Type Text</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      Type
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Commit Text</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      Enter
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Cancel Text</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      Esc
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">
                      Delete Character
                    </span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                      Backspace
                    </kbd>
                  </div>
                </div>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
