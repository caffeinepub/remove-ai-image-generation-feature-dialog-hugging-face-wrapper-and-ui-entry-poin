import { Grid3x3 } from "lucide-react";

export default function CanvasPlaceholder() {
  return (
    <div className="w-[600px] h-[400px] border border-primary/30 rounded-lg flex flex-col items-center justify-center text-muted-foreground bg-card/30 backdrop-blur-sm">
      <Grid3x3 className="w-16 h-16 mb-4 text-primary/40" />
      <p className="text-lg font-medium mb-1">Canvas Area</p>
      <p className="text-sm text-muted-foreground/70">
        Drawing canvas will be implemented here
      </p>
    </div>
  );
}
