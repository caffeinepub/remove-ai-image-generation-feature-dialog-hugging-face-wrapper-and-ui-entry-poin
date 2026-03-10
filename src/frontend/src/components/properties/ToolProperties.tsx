import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import type { ProceduralBrushType } from "@/engine/ProceduralBrushEngine";
import {
  type BrushData,
  downloadBrush,
  loadBrushFromFile,
} from "@/lib/brushSerializer";
import { ChevronDown, Upload } from "lucide-react";
import React from "react";
import CreateBrushDialog from "../modals/CreateBrushDialog";

// Font size table: maps font family IDs to allowed font sizes
const FONT_SIZE_TABLE: Record<string, number[]> = {
  "pixel-press-start": [8, 16, 24, 32, 40, 48, 56, 64],
  "pixel-vt323": [16, 24, 32, 40, 48, 56, 64],
  "pixel-silkscreen": [8, 16, 24, 32, 40, 48, 56, 64],
};

/**
 * Get allowed font sizes for a given font family
 */
function getAllowedSizesForFont(fontId: string): number[] {
  return FONT_SIZE_TABLE[fontId] || FONT_SIZE_TABLE["pixel-press-start"];
}

/**
 * Get nearest allowed font size for a given font family
 */
function getNearestSizeForFont(size: number, fontId: string): number {
  const allowedSizes = getAllowedSizesForFont(fontId);

  let nearest = allowedSizes[0];
  let minDiff = Math.abs(size - nearest);

  for (const allowedSize of allowedSizes) {
    const diff = Math.abs(size - allowedSize);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = allowedSize;
    }
  }

  return nearest;
}

// Declarative brush state type
interface ActiveBrush {
  kind: "procedural" | "filter" | "custom";
  id: string;
}

// Procedural brush registry
interface ProceduralBrush {
  id: ProceduralBrushType;
  name: string;
}

const PROCEDURAL_BRUSHES: ProceduralBrush[] = [
  { id: "grass", name: "Grass" },
  { id: "stone", name: "Stone" },
  { id: "cloud", name: "Cloud" },
  { id: "metallic", name: "Metallic" },
  { id: "calligraphy", name: "Calligraphy" },
  { id: "fur", name: "Fur" },
  { id: "sparkle", name: "Sparkle" },
  { id: "dither", name: "Dither" },
  { id: "bark", name: "Bark" },
];

// Filter brush registry
interface FilterBrush {
  id: string;
  name: string;
}

const FILTER_BRUSHES: FilterBrush[] = [
  { id: "blur", name: "Blur" },
  { id: "sharpen", name: "Sharpen" },
  { id: "emboss", name: "Emboss" },
  { id: "invert", name: "Invert" },
  { id: "grayscale", name: "Grayscale" },
  { id: "brightness", name: "Brightness" },
  { id: "contrast", name: "Contrast" },
  { id: "sepia", name: "Sepia" },
];

/**
 * ToolProperties component with restructured brush selection UI featuring declarative activeBrush state,
 * three independent brush registries (procedural, filter, custom), dropdown-style selection interface,
 * and dynamic filter parameter controls based on active filter brush; renders controls only without internal title.
 */
export default function ToolProperties() {
  const [currentTool, setCurrentTool] = React.useState<string>("pencil");
  const [hasSelection, setHasSelection] = React.useState(false);
  const [pencilOpen, setPencilOpen] = React.useState(true);
  const [shapeOpen, setShapeOpen] = React.useState(true);
  const [fontFamily, setFontFamily] = React.useState("pixel-press-start");

  // Initialize font size using the default font's allowed sizes
  const [fontSize, setFontSize] = React.useState(() => {
    const allowedSizes = getAllowedSizesForFont("pixel-press-start");
    return allowedSizes[1] || allowedSizes[0]; // Default to second size (16) or first if unavailable
  });

  // Pencil shape state - initialized to neutral default "square"
  const [pencilShape, setPencilShapeState] = React.useState<"round" | "square">(
    "square",
  );

  // Shape mode state (for rectangle and circle tools)
  const [shapeMode, setShapeModeState] = React.useState<"fill" | "stroke">(
    "stroke",
  );

  // Declarative brush state
  const [activeBrush, setActiveBrush] = React.useState<ActiveBrush>({
    kind: "procedural",
    id: "grass",
  });

  // Brush section collapsible states
  const [proceduralOpen, setProceduralOpen] = React.useState(true);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [customOpen, setCustomOpen] = React.useState(false);

  // Brush dropdown expanded states (separate from section collapsible)
  const [proceduralDropdownOpen, setProceduralDropdownOpen] =
    React.useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = React.useState(false);
  const [customDropdownOpen, setCustomDropdownOpen] = React.useState(false);

  // Procedural brush settings
  const [brushRandomness, setBrushRandomnessState] = React.useState(0);
  const [brushSatShift, setBrushSatShiftState] = React.useState(0);
  const [brushLightShift, setBrushLightShiftState] = React.useState(0);

  // Filter parameter states
  const [filterRadius, setFilterRadiusState] = React.useState(1);
  const [filterAmount, setFilterAmountState] = React.useState(0);

  // Custom brush state
  const [createBrushDialogOpen, setCreateBrushDialogOpen] =
    React.useState(false);
  const [brushCounter, setBrushCounter] = React.useState(1);
  const [customBrushes, setCustomBrushes] = React.useState<BrushData[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Refs for click-outside detection
  const proceduralDropdownRef = React.useRef<HTMLDivElement>(null);
  const filterDropdownRef = React.useRef<HTMLDivElement>(null);
  const customDropdownRef = React.useRef<HTMLDivElement>(null);

  // Poll current tool and selection state from window.editor
  React.useEffect(() => {
    const pollTool = () => {
      if ((window as any).editor?.tool?.currentTool) {
        const tool = (window as any).editor.tool.currentTool;
        setCurrentTool(tool);
      }

      // Check selection state
      if ((window as any).editor?.tool?.hasSelection) {
        const selection = (window as any).editor.tool.hasSelection();
        setHasSelection(selection);
      }
    };

    // Initial poll
    pollTool();

    // Poll every 100ms to detect tool changes
    const interval = setInterval(pollTool, 100);

    return () => clearInterval(interval);
  }, []);

  // Sync pencil shape state with ToolController when currentTool changes or on mount
  React.useEffect(() => {
    if (currentTool === "pencil") {
      // Access the real pencil shape from the tool engine
      if ((window as any).editor?.tool?.getPencilShape) {
        const shape = (window as any).editor.tool.getPencilShape();
        if (shape === "round" || shape === "square") {
          setPencilShapeState(shape);
        }
      }
    }
  }, [currentTool]);

  // Click-outside handler for dropdowns
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        proceduralDropdownRef.current &&
        !proceduralDropdownRef.current.contains(event.target as Node)
      ) {
        setProceduralDropdownOpen(false);
      }
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setFilterDropdownOpen(false);
      }
      if (
        customDropdownRef.current &&
        !customDropdownRef.current.contains(event.target as Node)
      ) {
        setCustomDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync activeBrush state with ToolController
  React.useEffect(() => {
    if (currentTool !== "brush") return;

    if (activeBrush.kind === "procedural") {
      // Set procedural brush
      if ((window as any).editor?.tool?.setBrushPreset) {
        (window as any).editor.tool.setBrushPreset(activeBrush.id);
      }
      // Clear custom brush
      if ((window as any).editor?.tool?.setCustomBrush) {
        (window as any).editor.tool.setCustomBrush(null);
      }
      // Clear filter brush
      if ((window as any).editor?.tool?.clearFilterBrush) {
        (window as any).editor.tool.clearFilterBrush();
      }
    } else if (activeBrush.kind === "custom") {
      // Find custom brush by ID
      const brush = customBrushes.find((b) => b.name === activeBrush.id);
      if (brush && (window as any).editor?.tool?.setCustomBrush) {
        (window as any).editor.tool.setCustomBrush(brush);
      }
      // Clear filter brush
      if ((window as any).editor?.tool?.clearFilterBrush) {
        (window as any).editor.tool.clearFilterBrush();
      }
    } else if (activeBrush.kind === "filter") {
      // Set filter brush
      if ((window as any).editor?.tool?.setTool) {
        (window as any).editor.tool.setTool("brush");
      }
      if ((window as any).editor?.tool?.setFilterBrush) {
        (window as any).editor.tool.setFilterBrush(activeBrush.id);
      }
      // Clear custom brush
      if ((window as any).editor?.tool?.setCustomBrush) {
        (window as any).editor.tool.setCustomBrush(null);
      }
    }
  }, [activeBrush, currentTool, customBrushes]);

  const handleFontSizeChange = (value: number[]) => {
    const rawSize = value[0];

    // Snap to nearest allowed size for current font
    const snappedSize = getNearestSizeForFont(rawSize, fontFamily);
    setFontSize(snappedSize);

    // Update engine via window.editor.tool
    if ((window as any).editor?.tool?.setFontSize) {
      (window as any).editor.tool.setFontSize(snappedSize);
    }
  };

  const handleFontFamilyChange = (value: string) => {
    setFontFamily(value);

    // Re-snap font size to valid increments for the new font family
    const snappedSize = getNearestSizeForFont(fontSize, value);
    setFontSize(snappedSize);

    // Update engine via window.editor.tool
    if ((window as any).editor?.tool?.setFontFamily) {
      (window as any).editor.tool.setFontFamily(value);
    }

    // Also update font size in case it changed due to snapping
    if ((window as any).editor?.tool?.setFontSize) {
      (window as any).editor.tool.setFontSize(snappedSize);
    }
  };

  // Pencil shape handler
  const handlePencilShapeChange = (value: string) => {
    const shape = value as "round" | "square";
    setPencilShapeState(shape);
    if ((window as any).editor?.tool?.setPencilShape) {
      (window as any).editor.tool.setPencilShape(shape);
    }
  };

  // Shape mode handler (for rectangle and circle tools)
  const handleShapeModeChange = (value: string) => {
    const mode = value as "fill" | "stroke";
    setShapeModeState(mode);
    if ((window as any).editor?.tool?.setShapeMode) {
      (window as any).editor.tool.setShapeMode(mode);
    }
  };

  // Brush selection handlers
  const handleProceduralBrushSelect = (id: ProceduralBrushType) => {
    setActiveBrush({ kind: "procedural", id });
    setProceduralDropdownOpen(false);
  };

  const handleFilterBrushSelect = (id: string) => {
    setActiveBrush({ kind: "filter", id });
    setFilterDropdownOpen(false);
  };

  const handleCustomBrushSelect = (id: string) => {
    setActiveBrush({ kind: "custom", id });
    setCustomDropdownOpen(false);
  };

  // Procedural brush settings handlers
  const handleBrushRandomnessChange = (value: number[]) => {
    const randomness = value[0];
    setBrushRandomnessState(randomness);
    if ((window as any).editor?.tool?.setBrushRandomness) {
      (window as any).editor.tool.setBrushRandomness(randomness);
    }
  };

  const handleBrushSatShiftChange = (value: number[]) => {
    const shift = value[0];
    setBrushSatShiftState(shift);
    if ((window as any).editor?.tool?.setBrushSaturationShift) {
      (window as any).editor.tool.setBrushSaturationShift(shift);
    }
  };

  const handleBrushLightShiftChange = (value: number[]) => {
    const shift = value[0];
    setBrushLightShiftState(shift);
    if ((window as any).editor?.tool?.setBrushLightnessShift) {
      (window as any).editor.tool.setBrushLightnessShift(shift);
    }
  };

  // Filter parameter handlers
  const handleFilterRadiusChange = (value: number[]) => {
    const radius = value[0];
    setFilterRadiusState(radius);
    if ((window as any).editor?.tool?.setFilterRadius) {
      (window as any).editor.tool.setFilterRadius(radius);
    }
  };

  const handleFilterAmountChange = (value: number[]) => {
    const amount = value[0];
    setFilterAmountState(amount);
    if ((window as any).editor?.tool?.setFilterAmount) {
      (window as any).editor.tool.setFilterAmount(amount);
    }
  };

  // Custom brush handlers
  const openCreateBrushDialog = () => {
    setCreateBrushDialogOpen(true);
  };

  const handleCreateBrushClick = (e: React.MouseEvent) => {
    // Prevent event propagation to avoid selection cancellation
    e.preventDefault();
    e.stopPropagation();
    openCreateBrushDialog();
  };

  const handleCreateBrushMouseDown = (e: React.MouseEvent) => {
    // Prevent event propagation to avoid lasso tool from intercepting
    e.preventDefault();
    e.stopPropagation();
  };

  /**
   * Save brush handler - serializes brush data and triggers automatic browser download
   */
  const handleSaveBrush = (name: string) => {
    // Extract pixel data from selection using SelectionManager
    const editor = (window as any).editor;
    if (!editor?.tool?.selectionManager) return;

    const selectionManager = editor.tool.selectionManager;

    // Extract floating pixels if selection exists but no floating pixels yet
    if (
      selectionManager.hasSelection() &&
      !selectionManager.hasFloatingPixels()
    ) {
      selectionManager.extractFloatingPixelsForBrushExport();
    }

    // Get floating pixels (already in world coordinates)
    const floatingPixels = selectionManager.getFloatingPixels();
    if (!floatingPixels || floatingPixels.length === 0) return;

    const floatingRect = selectionManager.getFloatingRect();
    if (!floatingRect) return;

    // Calculate center offsets for centering brush around (0,0)
    const centerX = Math.floor(floatingRect.width / 2);
    const centerY = Math.floor(floatingRect.height / 2);

    // Convert to local coordinates centered around (0,0)
    const pixels = floatingPixels.map((p: any) => ({
      x: p.x - floatingRect.x - centerX,
      y: p.y - floatingRect.y - centerY,
      r: p.r,
      g: p.g,
      b: p.b,
      a: p.a,
    }));

    const width = floatingRect.width;
    const height = floatingRect.height;

    // Use downloadBrush utility which handles canonical format and sanitized filename
    downloadBrush({
      name,
      width,
      height,
      pixels,
    });

    // Increment counter for next brush
    setBrushCounter((prev) => prev + 1);

    // Close dialog immediately after triggering download
    setCreateBrushDialogOpen(false);
  };

  const handleLoadBrushClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const brushData = await loadBrushFromFile(file);
    if (!brushData) {
      console.error(
        "Failed to load brush file - invalid format or validation failed",
      );
      return;
    }

    // Check if brush with same name already exists
    const existingIndex = customBrushes.findIndex(
      (b) => b.name === brushData.name,
    );
    if (existingIndex >= 0) {
      // Replace existing brush
      setCustomBrushes((prev) => {
        const updated = [...prev];
        updated[existingIndex] = brushData;
        return updated;
      });
    } else {
      // Add new brush
      setCustomBrushes((prev) => [...prev, brushData]);
    }

    // Auto-activate the loaded custom brush
    setActiveBrush({ kind: "custom", id: brushData.name });

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Determine if current tool is text tool
  const isTextTool = currentTool === "text";

  // Determine if current tool is pencil tool
  const isPencilTool = currentTool === "pencil";

  // Determine if current tool is brush tool
  const isBrushTool = currentTool === "brush";

  // Determine if current tool is rectangle or circle tool
  const isShapeTool = currentTool === "rectangle" || currentTool === "circle";

  // Get dynamic min/max range based on selected font
  const allowedSizes = getAllowedSizesForFont(fontFamily);
  const minSize = allowedSizes[0];
  const maxSize = allowedSizes[allowedSizes.length - 1];

  // Get current brush display name
  const getCurrentBrushName = () => {
    if (activeBrush.kind === "procedural") {
      const brush = PROCEDURAL_BRUSHES.find((b) => b.id === activeBrush.id);
      return brush?.name || "Unknown";
    }
    if (activeBrush.kind === "filter") {
      const brush = FILTER_BRUSHES.find((b) => b.id === activeBrush.id);
      return brush?.name || "Unknown";
    }
    if (activeBrush.kind === "custom") {
      return activeBrush.id;
    }
    return "Unknown";
  };

  return (
    <div className="space-y-3">
      {/* Create Brush From Selection Button */}
      {hasSelection && (
        <div className="mb-3">
          <Button
            onMouseDown={handleCreateBrushMouseDown}
            onClick={handleCreateBrushClick}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Create Brush From Selection
          </Button>
        </div>
      )}

      {/* Pencil Tool: Pencil Settings */}
      {isPencilTool && (
        <Collapsible open={pencilOpen} onOpenChange={setPencilOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded hover:bg-accent/50 transition-colors">
            <span className="text-sm font-medium">Pencil Settings</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${pencilOpen ? "" : "-rotate-90"}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 px-2 space-y-3">
            <div>
              <Label className="text-xs mb-2 block">Shape</Label>
              <RadioGroup
                value={pencilShape}
                onValueChange={handlePencilShapeChange}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="round" id="pencil-round" />
                  <Label
                    htmlFor="pencil-round"
                    className="text-xs cursor-pointer"
                  >
                    Round
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="square" id="pencil-square" />
                  <Label
                    htmlFor="pencil-square"
                    className="text-xs cursor-pointer"
                  >
                    Square
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Rectangle/Circle Tools: Shape Settings */}
      {isShapeTool && (
        <Collapsible open={shapeOpen} onOpenChange={setShapeOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded hover:bg-accent/50 transition-colors">
            <span className="text-sm font-medium">Shape Settings</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${shapeOpen ? "" : "-rotate-90"}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 px-2 space-y-3">
            <div>
              <Label className="text-xs mb-2 block">Mode</Label>
              <RadioGroup
                value={shapeMode}
                onValueChange={handleShapeModeChange}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fill" id="shape-fill" />
                  <Label
                    htmlFor="shape-fill"
                    className="text-xs cursor-pointer"
                  >
                    Fill
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="stroke" id="shape-stroke" />
                  <Label
                    htmlFor="shape-stroke"
                    className="text-xs cursor-pointer"
                  >
                    Stroke
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Text Tool: Font Settings */}
      {isTextTool && (
        <Collapsible open={pencilOpen} onOpenChange={setPencilOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded hover:bg-accent/50 transition-colors">
            <span className="text-sm font-medium">Font Settings</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${pencilOpen ? "" : "-rotate-90"}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 px-2 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="font-size" className="text-xs font-medium">
                  Font Size
                </Label>
                <span className="text-xs text-muted-foreground font-mono">
                  {fontSize}
                </span>
              </div>
              <Slider
                id="font-size"
                min={minSize}
                max={maxSize}
                step={1}
                value={[fontSize]}
                onValueChange={handleFontSizeChange}
                className="w-full"
              />
            </div>
            <div>
              <Label className="text-xs mb-2 block">Font Family</Label>
              <RadioGroup
                value={fontFamily}
                onValueChange={handleFontFamilyChange}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="pixel-press-start"
                    id="pixel-press-start"
                  />
                  <Label
                    htmlFor="pixel-press-start"
                    className="text-xs cursor-pointer"
                  >
                    Press Start 2P
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pixel-vt323" id="pixel-vt323" />
                  <Label
                    htmlFor="pixel-vt323"
                    className="text-xs cursor-pointer"
                  >
                    VT323
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="pixel-silkscreen"
                    id="pixel-silkscreen"
                  />
                  <Label
                    htmlFor="pixel-silkscreen"
                    className="text-xs cursor-pointer"
                  >
                    Silkscreen
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Brush Tool: Restructured Brush Selection UI with Dropdowns */}
      {isBrushTool && (
        <div className="space-y-3">
          {/* Procedural Section */}
          <Collapsible open={proceduralOpen} onOpenChange={setProceduralOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded hover:bg-accent/50 transition-colors">
              <span className="text-sm font-medium">Procedural</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${proceduralOpen ? "" : "-rotate-90"}`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 px-2 space-y-3">
              {/* Procedural Brush Dropdown */}
              <div ref={proceduralDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setProceduralDropdownOpen(!proceduralDropdownOpen)
                  }
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                    activeBrush.kind === "procedural"
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent hover:bg-accent/80"
                  }`}
                >
                  <span>
                    {activeBrush.kind === "procedural"
                      ? getCurrentBrushName()
                      : "Select Brush"}
                  </span>
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${proceduralDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {proceduralDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                    {PROCEDURAL_BRUSHES.map((brush) => (
                      <button
                        type="button"
                        key={brush.id}
                        onClick={() => handleProceduralBrushSelect(brush.id)}
                        className={`w-full text-left px-2 py-1.5 text-xs transition-colors ${
                          activeBrush.kind === "procedural" &&
                          activeBrush.id === brush.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent"
                        }`}
                      >
                        {brush.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Procedural Brush Settings (only when procedural brush is active) */}
              {activeBrush.kind === "procedural" && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="brush-randomness"
                        className="text-xs font-medium"
                      >
                        Randomness
                      </Label>
                      <span className="text-xs text-muted-foreground font-mono">
                        {Math.round(brushRandomness * 100)}%
                      </span>
                    </div>
                    <Slider
                      id="brush-randomness"
                      min={0}
                      max={1}
                      step={0.01}
                      value={[brushRandomness]}
                      onValueChange={handleBrushRandomnessChange}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="brush-sat-shift"
                        className="text-xs font-medium"
                      >
                        Saturation Shift
                      </Label>
                      <span className="text-xs text-muted-foreground font-mono">
                        {brushSatShift.toFixed(2)}
                      </span>
                    </div>
                    <Slider
                      id="brush-sat-shift"
                      min={-1}
                      max={1}
                      step={0.01}
                      value={[brushSatShift]}
                      onValueChange={handleBrushSatShiftChange}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="brush-light-shift"
                        className="text-xs font-medium"
                      >
                        Lightness Shift
                      </Label>
                      <span className="text-xs text-muted-foreground font-mono">
                        {brushLightShift.toFixed(2)}
                      </span>
                    </div>
                    <Slider
                      id="brush-light-shift"
                      min={-1}
                      max={1}
                      step={0.01}
                      value={[brushLightShift]}
                      onValueChange={handleBrushLightShiftChange}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Filter Section */}
          <Collapsible open={filterOpen} onOpenChange={setFilterOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded hover:bg-accent/50 transition-colors">
              <span className="text-sm font-medium">Filter</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${filterOpen ? "" : "-rotate-90"}`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 px-2 space-y-3">
              {/* Filter Brush Dropdown */}
              <div ref={filterDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                    activeBrush.kind === "filter"
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent hover:bg-accent/80"
                  }`}
                >
                  <span>
                    {activeBrush.kind === "filter"
                      ? getCurrentBrushName()
                      : "Select Brush"}
                  </span>
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${filterDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {filterDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                    {FILTER_BRUSHES.map((brush) => (
                      <button
                        type="button"
                        key={brush.id}
                        onClick={() => handleFilterBrushSelect(brush.id)}
                        className={`w-full text-left px-2 py-1.5 text-xs transition-colors ${
                          activeBrush.kind === "filter" &&
                          activeBrush.id === brush.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent"
                        }`}
                      >
                        {brush.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Filter-Specific Parameter Controls */}
              {activeBrush.kind === "filter" && (
                <div className="space-y-3 pt-2 border-t">
                  {/* Blur: radius slider */}
                  {activeBrush.id === "blur" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="filter-radius"
                          className="text-xs font-medium"
                        >
                          Radius
                        </Label>
                        <span className="text-xs text-muted-foreground font-mono">
                          {filterRadius}
                        </span>
                      </div>
                      <Slider
                        id="filter-radius"
                        min={1}
                        max={6}
                        step={1}
                        value={[filterRadius]}
                        onValueChange={handleFilterRadiusChange}
                        className="w-full"
                      />
                    </div>
                  )}

                  {/* Brightness: amount slider */}
                  {activeBrush.id === "brightness" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="filter-amount"
                          className="text-xs font-medium"
                        >
                          Amount
                        </Label>
                        <span className="text-xs text-muted-foreground font-mono">
                          {filterAmount}
                        </span>
                      </div>
                      <Slider
                        id="filter-amount"
                        min={-100}
                        max={100}
                        step={1}
                        value={[filterAmount]}
                        onValueChange={handleFilterAmountChange}
                        className="w-full"
                      />
                    </div>
                  )}

                  {/* Contrast: amount slider */}
                  {activeBrush.id === "contrast" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="filter-amount"
                          className="text-xs font-medium"
                        >
                          Amount
                        </Label>
                        <span className="text-xs text-muted-foreground font-mono">
                          {filterAmount}
                        </span>
                      </div>
                      <Slider
                        id="filter-amount"
                        min={-100}
                        max={100}
                        step={1}
                        value={[filterAmount]}
                        onValueChange={handleFilterAmountChange}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Custom Section */}
          <Collapsible open={customOpen} onOpenChange={setCustomOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded hover:bg-accent/50 transition-colors">
              <span className="text-sm font-medium">Custom</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${customOpen ? "" : "-rotate-90"}`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 px-2 space-y-3">
              {/* Custom Brush Dropdown (only if brushes exist) */}
              {customBrushes.length > 0 && (
                <div ref={customDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setCustomDropdownOpen(!customDropdownOpen)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                      activeBrush.kind === "custom"
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent hover:bg-accent/80"
                    }`}
                  >
                    <span>
                      {activeBrush.kind === "custom"
                        ? getCurrentBrushName()
                        : "Select Brush"}
                    </span>
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${customDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {customDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                      {customBrushes.map((brush) => (
                        <button
                          type="button"
                          key={brush.name}
                          onClick={() => handleCustomBrushSelect(brush.name)}
                          className={`w-full text-left px-2 py-1.5 text-xs transition-colors ${
                            activeBrush.kind === "custom" &&
                            activeBrush.id === brush.name
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-accent"
                          }`}
                        >
                          {brush.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Load Brush Button */}
              <Button
                onClick={handleLoadBrushClick}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Load Brush
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />

              {/* Empty state message */}
              {customBrushes.length === 0 && (
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  No custom brushes loaded. Click "Load Brush" to import a brush
                  file.
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Create Brush Dialog */}
      <CreateBrushDialog
        open={createBrushDialogOpen}
        onOpenChange={setCreateBrushDialogOpen}
        onSave={handleSaveBrush}
        defaultName={`Brush ${brushCounter}`}
      />
    </div>
  );
}
