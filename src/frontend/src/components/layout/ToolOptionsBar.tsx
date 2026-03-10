import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";

interface ToolOptionsBarProps {
  mirrorX: boolean;
  mirrorY: boolean;
  pixelPerfect: boolean;
  dither: boolean;
  showGrid: boolean;
  showPixelGrid: boolean;
  showTileGrid: boolean;
  tileSize: number;
  onToggleMirrorX: () => void;
  onToggleMirrorY: () => void;
  onTogglePixelPerfect: () => void;
  onToggleDither: () => void;
  onToggleGrid: () => void;
  onTogglePixelGrid: () => void;
  onToggleTileGrid: () => void;
  onTileSizeChange: (value: number) => void;
}

export default function ToolOptionsBar({
  mirrorX,
  mirrorY,
  pixelPerfect,
  dither,
  showGrid,
  showPixelGrid,
  showTileGrid,
  tileSize,
  onToggleMirrorX,
  onToggleMirrorY,
  onTogglePixelPerfect,
  onToggleDither,
  onToggleGrid,
  onTogglePixelGrid,
  onToggleTileGrid,
  onTileSizeChange,
}: ToolOptionsBarProps) {
  const [brushSize, setBrushSize] = useState(1);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [brushSpacing, setBrushSpacing] = useState(0);

  const handleBrushSizeChange = (value: number[]) => {
    const size = value[0];
    setBrushSize(size);
    if ((window as any).editor?.tool) {
      (window as any).editor.tool.setBrushSize(size);
      if ((window as any).editor.refresh) {
        (window as any).editor.refresh();
      }
    }
  };

  const handleBrushOpacityChange = (value: number[]) => {
    const opacity = value[0];
    setBrushOpacity(opacity);
    if ((window as any).editor?.tool) {
      (window as any).editor.tool.setBrushOpacity(opacity / 100);
      if ((window as any).editor.refresh) {
        (window as any).editor.refresh();
      }
    }
  };

  const handleBrushSpacingChange = (value: number[]) => {
    const spacing = value[0];
    setBrushSpacing(spacing);
    if ((window as any).editor?.tool?.setBrushSpacing) {
      (window as any).editor.tool.setBrushSpacing(spacing);
      (window as any).editor.refresh?.();
    }
  };

  const handleTileSizeInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = Number.parseInt(e.target.value, 10);
    if (!Number.isNaN(value) && value >= 1 && value <= 256) {
      onTileSizeChange(value);
    }
  };

  return (
    <div className="w-full h-[48px] flex items-center px-4 border-b border-border">
      <div className="flex items-center gap-6 w-full">
        <div className="flex items-center gap-3 min-w-0">
          <Label
            htmlFor="brush-size"
            className="text-xs text-muted-foreground whitespace-nowrap"
          >
            Brush Size
          </Label>
          <Slider
            id="brush-size"
            value={[brushSize]}
            onValueChange={handleBrushSizeChange}
            max={32}
            min={1}
            step={1}
            className="w-32"
          />
          <span className="text-xs font-mono text-muted-foreground w-8">
            {brushSize}px
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-xs text-muted-foreground">Opacity</Label>
          <Slider
            value={[brushOpacity]}
            onValueChange={handleBrushOpacityChange}
            max={100}
            min={0}
            step={1}
            className="w-24"
          />
          <span className="text-xs font-mono text-muted-foreground w-10">
            {brushOpacity}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-xs text-muted-foreground">Spacing</Label>
          <Slider
            value={[brushSpacing]}
            onValueChange={handleBrushSpacingChange}
            min={0}
            max={16}
            step={1}
            className="w-24"
          />
          <span className="text-xs font-mono text-muted-foreground w-10">
            {brushSpacing}px
          </span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            className={`px-2 py-1 text-xs font-mono border rounded transition-colors ${
              mirrorX
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-700 border-gray-600 hover:bg-gray-600"
            }`}
            onClick={onToggleMirrorX}
            title="Mirror X"
          >
            MX
          </button>
          <button
            type="button"
            className={`px-2 py-1 text-xs font-mono border rounded transition-colors ${
              mirrorY
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-700 border-gray-600 hover:bg-gray-600"
            }`}
            onClick={onToggleMirrorY}
            title="Mirror Y"
          >
            MY
          </button>
          <button
            type="button"
            className={`px-2 py-1 text-xs font-mono border rounded transition-colors ${
              pixelPerfect
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-700 border-gray-600 hover:bg-gray-600"
            }`}
            onClick={onTogglePixelPerfect}
            title="Pixel Perfect"
          >
            PP
          </button>
          <button
            type="button"
            className={`px-2 py-1 text-xs font-mono border rounded transition-colors ${
              dither
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-700 border-gray-600 hover:bg-gray-600"
            }`}
            onClick={onToggleDither}
            title="Dither"
          >
            Dither
          </button>
          <button
            type="button"
            className={`px-2 py-1 text-xs font-mono border rounded transition-colors ${
              showGrid
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-700 border-gray-600 hover:bg-gray-600"
            }`}
            onClick={onToggleGrid}
            title="Grid"
          >
            Grid
          </button>
          <button
            type="button"
            className={`px-2 py-1 text-xs font-mono border rounded transition-colors ${
              showPixelGrid
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-700 border-gray-600 hover:bg-gray-600"
            }`}
            onClick={onTogglePixelGrid}
            title="Pixel Grid"
          >
            PxGrid
          </button>
          <button
            type="button"
            className={`px-2 py-1 text-xs font-mono border rounded transition-colors ${
              showTileGrid
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-700 border-gray-600 hover:bg-gray-600"
            }`}
            onClick={onToggleTileGrid}
            title="Tile Grid"
          >
            Tiles
          </button>
          <input
            type="number"
            min="1"
            max="256"
            value={tileSize}
            onChange={handleTileSizeInputChange}
            className="w-12 px-1 py-1 text-xs font-mono bg-gray-700 border border-gray-600 rounded text-center"
            title="Tile Size"
          />
        </div>
      </div>
    </div>
  );
}
