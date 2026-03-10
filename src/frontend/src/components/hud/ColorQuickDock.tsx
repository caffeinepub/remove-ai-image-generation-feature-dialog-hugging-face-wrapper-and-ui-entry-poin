import { Button } from "@/components/ui/button";
import { getEditorRuntime } from "@/editor/EditorRuntime";
import { ChevronsRight, Plus } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

// Helper functions for color operations
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : null;
};

const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, "0");
    return hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const rgbToHsv = (
  r: number,
  g: number,
  b: number,
): { h: number; s: number; v: number } => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) / 6;
    } else if (max === gn) {
      h = ((bn - rn) / delta + 2) / 6;
    } else {
      h = ((rn - gn) / delta + 4) / 6;
    }
  }

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h: h * 360, s: s * 100, v: v * 100 };
};

const hsvToRgb = (
  h: number,
  s: number,
  v: number,
): { r: number; g: number; b: number } => {
  const hn = h / 360;
  const sn = s / 100;
  const vn = v / 100;

  const i = Math.floor(hn * 6);
  const f = hn * 6 - i;
  const p = vn * (1 - sn);
  const q = vn * (1 - f * sn);
  const t = vn * (1 - (1 - f) * sn);

  let r = 0;
  let g = 0;
  let b = 0;

  switch (i % 6) {
    case 0:
      r = vn;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = vn;
      b = p;
      break;
    case 2:
      r = p;
      g = vn;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = vn;
      break;
    case 4:
      r = t;
      g = p;
      b = vn;
      break;
    case 5:
      r = vn;
      g = p;
      b = q;
      break;
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
};

interface ColorQuickDockProps {
  collapsed?: boolean;
  focusModeActive?: boolean;
}

export default function ColorQuickDock({
  collapsed = false,
  focusModeActive = false,
}: ColorQuickDockProps) {
  // Primary and secondary color state (RGBA)
  const [primaryColor, setPrimaryColor] = useState({
    r: 255,
    g: 255,
    b: 255,
    a: 255,
  });
  const [secondaryColor, setSecondaryColor] = useState({
    r: 0,
    g: 0,
    b: 0,
    a: 255,
  });

  // Recent colors list (max 8 colors)
  const [recentColors, setRecentColors] = useState<string[]>([]);

  // Current palette (read from ColorPanel if available)
  const [currentPalette, _setCurrentPalette] = useState<string[]>([]);

  // Color picker state
  const [pickerHue, setPickerHue] = useState(0);
  const [pickerSaturation, setPickerSaturation] = useState(100);
  const [pickerValue, setPickerValue] = useState(100);

  // Refs for color picker interaction
  const svRectRef = useRef<HTMLDivElement>(null);
  const hueBarRef = useRef<HTMLDivElement>(null);
  const [isDraggingSV, setIsDraggingSV] = useState(false);
  const [isDraggingHue, setIsDraggingHue] = useState(false);

  // Sync primary color from window.editor on mount and updates
  useEffect(() => {
    const syncFromEditor = () => {
      if (window.editor?.tool?.currentColor) {
        const color = window.editor.tool.currentColor;
        setPrimaryColor({ r: color.r, g: color.g, b: color.b, a: color.a });

        // Update picker HSV from primary color
        const hsv = rgbToHsv(color.r, color.g, color.b);
        setPickerHue(hsv.h);
        setPickerSaturation(hsv.s);
        setPickerValue(hsv.v);
      }
    };

    // Initial sync
    syncFromEditor();

    // Poll for updates (simple approach for synchronization)
    const interval = setInterval(syncFromEditor, 100);

    return () => clearInterval(interval);
  }, []);

  // Register setPrimaryColorFromOutside for external updates
  useEffect(() => {
    if (window.editor) {
      const originalSetter = window.editor.setPrimaryColorFromOutside;

      window.editor.setPrimaryColorFromOutside = (
        r: number,
        g: number,
        b: number,
        a: number,
      ) => {
        // Update local state
        setPrimaryColor({ r, g, b, a });

        // Update picker HSV
        const hsv = rgbToHsv(r, g, b);
        setPickerHue(hsv.h);
        setPickerSaturation(hsv.s);
        setPickerValue(hsv.v);

        // Call original setter if it exists
        if (originalSetter) {
          originalSetter(r, g, b, a);
        }
      };
    }

    return () => {
      if (window.editor) {
        (window.editor as any).setPrimaryColorFromOutside = undefined;
      }
    };
  }, []);

  // Listen for primary color changes from ColorPanel palette selections
  useEffect(() => {
    const handlePrimaryColorChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{
        r: number;
        g: number;
        b: number;
        a: number;
      }>;
      const { r, g, b } = customEvent.detail;

      // Convert to hex
      const hexColor = rgbToHex(r, g, b);

      // Update recent colors
      setRecentColors((prev) => {
        // Remove duplicates
        const filtered = prev.filter((c) => c !== hexColor);
        // Insert at front and truncate to 8
        return [hexColor, ...filtered].slice(0, 8);
      });
    };

    window.addEventListener(
      "editor:primary-color-changed",
      handlePrimaryColorChanged,
    );

    return () => {
      window.removeEventListener(
        "editor:primary-color-changed",
        handlePrimaryColorChanged,
      );
    };
  }, []);

  // Apply primary color to brush and refresh canvas
  const applyPrimaryColor = (r: number, g: number, b: number) => {
    setPrimaryColor({ r, g, b, a: 255 });

    // Add to recent colors
    const hexColor = rgbToHex(r, g, b);
    setRecentColors((prev) => {
      const filtered = prev.filter((c) => c !== hexColor);
      return [hexColor, ...filtered].slice(0, 8);
    });

    if (window.editor?.tool?.setColor) {
      window.editor.tool.setColor(r, g, b, 255);
    }
    if (window.editor?.refresh) {
      window.editor.refresh();
    }
  };

  // Swap primary and secondary colors
  const handleSwap = () => {
    const temp = { ...primaryColor };
    applyPrimaryColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
    setSecondaryColor(temp);
  };

  // Click secondary swatch to copy to primary
  const handleSecondaryClick = () => {
    applyPrimaryColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
  };

  // Handle "Add to Palette" button click
  const handleAddToPalette = () => {
    // Read current primary color RGB values
    const hexColor = rgbToHex(primaryColor.r, primaryColor.g, primaryColor.b);

    // Dispatch CustomEvent to ColorPanel
    window.dispatchEvent(
      new CustomEvent("editor:add-color-to-palette", {
        detail: { hex: hexColor },
      }),
    );
  };

  // Handle recent color click
  const handleRecentColorClick = (hexColor: string) => {
    const rgb = hexToRgb(hexColor);
    if (rgb) {
      applyPrimaryColor(rgb.r, rgb.g, rgb.b);

      // Update picker HSV
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      setPickerHue(hsv.h);
      setPickerSaturation(hsv.s);
      setPickerValue(hsv.v);
    }
  };

  // Handle palette color click
  const handlePaletteColorClick = (hexColor: string) => {
    const rgb = hexToRgb(hexColor);
    if (rgb) {
      applyPrimaryColor(rgb.r, rgb.g, rgb.b);

      // Update picker HSV
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      setPickerHue(hsv.h);
      setPickerSaturation(hsv.s);
      setPickerValue(hsv.v);
    }
  };

  // Update primary color from picker HSV
  const updateColorFromPicker = (h: number, s: number, v: number) => {
    const rgb = hsvToRgb(h, s, v);
    applyPrimaryColor(rgb.r, rgb.g, rgb.b);
  };

  // Handle SV rectangle interaction
  const handleSVPointerDown = (e: React.PointerEvent) => {
    setIsDraggingSV(true);
    updateSVFromPointer(e);
  };

  const handleSVPointerMove = (e: React.PointerEvent) => {
    if (isDraggingSV) {
      updateSVFromPointer(e);
    }
  };

  const handleSVPointerUp = () => {
    setIsDraggingSV(false);
  };

  const updateSVFromPointer = (e: React.PointerEvent) => {
    const rect = svRectRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const s = (x / rect.width) * 100;
    const v = 100 - (y / rect.height) * 100;

    setPickerSaturation(s);
    setPickerValue(v);
    updateColorFromPicker(pickerHue, s, v);
  };

  // Handle hue bar interaction
  const handleHuePointerDown = (e: React.PointerEvent) => {
    setIsDraggingHue(true);
    updateHueFromPointer(e);
  };

  const handleHuePointerMove = (e: React.PointerEvent) => {
    if (isDraggingHue) {
      updateHueFromPointer(e);
    }
  };

  const handleHuePointerUp = () => {
    setIsDraggingHue(false);
  };

  const updateHueFromPointer = (e: React.PointerEvent) => {
    const rect = hueBarRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const h = (x / rect.width) * 360;

    setPickerHue(h);
    updateColorFromPicker(h, pickerSaturation, pickerValue);
  };

  // Generate SV rectangle background gradient
  const svBackgroundStyle = {
    background: `
      linear-gradient(to bottom, transparent, black),
      linear-gradient(to right, white, hsl(${pickerHue}, 100%, 50%))
    `,
  };

  // Handle collapse button click
  const handleCollapseClick = () => {
    const runtime = getEditorRuntime();
    runtime.toggleHudVisibility("colorQuickDockExpanded");
  };

  // Determine positioning style based on Focus Mode
  const positioningStyle = focusModeActive
    ? { position: "absolute" as const, top: 0, right: 0 }
    : { position: "absolute" as const, top: "1rem", right: "1rem" };

  return (
    <div className="relative pointer-events-auto" style={positioningStyle}>
      {/* Collapse handle on exterior left margin */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCollapseClick}
        className="absolute -left-6 top-2 h-8 w-5 p-0 bg-background/95 border border-border rounded-l-sm hover:bg-accent/50 transition-colors"
        style={{ zIndex: 51 }}
        title={collapsed ? "Expand Color Dock" : "Collapse Color Dock"}
        data-ui-element="true"
      >
        <ChevronsRight
          className={`h-3 w-3 transition-transform ${collapsed ? "rotate-180" : ""}`}
        />
      </Button>

      {/* Main dock container - width adjusts based on collapsed state */}
      <div
        className="bg-background/95 border border-border rounded-sm shadow-lg p-3 space-y-3"
        style={{
          width: collapsed ? "auto" : "200px",
          zIndex: 50,
        }}
        data-ui-element="true"
      >
        {/* Primary/Secondary Swatches with Swap Icon - Always Visible */}
        <div className="flex items-start gap-2">
          <div className="relative">
            <div
              className="w-12 h-12 rounded border border-border cursor-pointer"
              style={{
                backgroundColor: `rgb(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b})`,
              }}
              title="Primary Color"
            />
            <div
              className="absolute bottom-0 right-0 w-[22px] h-[22px] rounded border border-border cursor-pointer hover:border-primary transition-colors"
              style={{
                backgroundColor: `rgb(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b})`,
              }}
              onClick={handleSecondaryClick}
              onKeyDown={(e) =>
                e.key === "Enter" || e.key === " "
                  ? handleSecondaryClick()
                  : undefined
              }
              role="button"
              tabIndex={0}
              title="Secondary Color (click to use)"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleSwap}
            className="h-6 w-6 p-0"
            title="Swap Colors"
          >
            <span className="text-sm">⇄</span>
          </Button>
        </div>

        {/* Extended UI - Only visible when not collapsed */}
        {!collapsed && (
          <>
            {/* Add to Palette Button */}
            <div className="flex justify-start">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddToPalette}
                className="h-7 px-2 text-xs"
                title="Add to Palette"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add to Palette
              </Button>
            </div>

            {/* Recent Colors */}
            {recentColors.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">
                  Recent
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {recentColors.map((hexColor) => (
                    <div
                      key={hexColor}
                      className="w-5 h-5 rounded border border-border cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: hexColor }}
                      onClick={() => handleRecentColorClick(hexColor)}
                      onKeyDown={(e) =>
                        e.key === "Enter" || e.key === " "
                          ? handleRecentColorClick(hexColor)
                          : undefined
                      }
                      role="button"
                      tabIndex={0}
                      title={hexColor}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Current Palette */}
            {currentPalette.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">
                  Palette
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {currentPalette.slice(0, 16).map((hexColor) => (
                    <div
                      key={hexColor}
                      className="w-5 h-5 rounded border border-border cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: hexColor }}
                      onClick={() => handlePaletteColorClick(hexColor)}
                      onKeyDown={(e) =>
                        e.key === "Enter" || e.key === " "
                          ? handlePaletteColorClick(hexColor)
                          : undefined
                      }
                      role="button"
                      tabIndex={0}
                      title={hexColor}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Aseprite-style Color Picker */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                Picker
              </div>

              {/* Saturation/Value Rectangle */}
              <div
                ref={svRectRef}
                className="relative w-full h-32 rounded border border-border cursor-crosshair"
                style={svBackgroundStyle}
                onPointerDown={handleSVPointerDown}
                onPointerMove={handleSVPointerMove}
                onPointerUp={handleSVPointerUp}
                onPointerLeave={handleSVPointerUp}
              >
                {/* Picker cursor */}
                <div
                  className="absolute w-3 h-3 border-2 border-white rounded-full pointer-events-none"
                  style={{
                    left: `${pickerSaturation}%`,
                    top: `${100 - pickerValue}%`,
                    transform: "translate(-50%, -50%)",
                    boxShadow: "0 0 0 1px black",
                  }}
                />
              </div>

              {/* Hue Bar */}
              <div
                ref={hueBarRef}
                className="relative w-full h-4 rounded border border-border cursor-crosshair"
                style={{
                  background:
                    "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                }}
                onPointerDown={handleHuePointerDown}
                onPointerMove={handleHuePointerMove}
                onPointerUp={handleHuePointerUp}
                onPointerLeave={handleHuePointerUp}
              >
                {/* Hue cursor */}
                <div
                  className="absolute w-2 h-full border-2 border-white pointer-events-none"
                  style={{
                    left: `${(pickerHue / 360) * 100}%`,
                    transform: "translateX(-50%)",
                    boxShadow: "0 0 0 1px black",
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
