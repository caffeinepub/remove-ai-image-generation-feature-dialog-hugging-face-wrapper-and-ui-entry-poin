import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Brush,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FlipHorizontal,
  Moon,
  Orbit,
  Palette,
  Shuffle,
  Sun,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

// Preset palette definitions
const PRESET_PALETTES: Record<string, { name: string; colors: string[] }> = {
  "nes-classic": {
    name: "NES Classic",
    colors: [
      "#000000",
      "#FCFCFC",
      "#F8F8F8",
      "#BCBCBC",
      "#7C7C7C",
      "#A4E4FC",
      "#3CBCFC",
      "#0078F8",
      "#0000FC",
      "#B8B8F8",
      "#6888FC",
      "#0058F8",
      "#0000BC",
      "#D8B8F8",
      "#9878F8",
      "#6844FC",
      "#4428BC",
      "#F8B8F8",
      "#F878F8",
      "#D800CC",
      "#940084",
      "#F8A4C0",
      "#F85898",
      "#E40058",
      "#A80020",
      "#F0D0B0",
      "#F87858",
      "#F83800",
      "#A81000",
      "#FCD8A8",
      "#FCA044",
      "#E45C10",
      "#881400",
      "#F8D878",
      "#F8B800",
      "#AC7C00",
      "#503000",
      "#D8F878",
      "#B8F818",
      "#00B800",
      "#007800",
      "#B8F8B8",
      "#58D854",
      "#00A800",
      "#006800",
      "#B8F8D8",
      "#58F898",
      "#00A844",
      "#005800",
      "#00FCFC",
      "#00E8D8",
      "#008888",
      "#004058",
      "#F8D8F8",
      "#787878",
    ],
  },
  "retro-sunset": {
    name: "Retro Sunset",
    colors: [
      "#2E1A47",
      "#3D2B5F",
      "#4A3B6E",
      "#5C4D7D",
      "#6E5F8C",
      "#FF6B9D",
      "#FFA07A",
      "#FFD700",
      "#FF8C00",
      "#FF4500",
      "#C71585",
      "#8B008B",
      "#4B0082",
      "#191970",
      "#000080",
    ],
  },
  "gameboy-dmg": {
    name: "Game Boy DMG",
    colors: ["#0F380F", "#306230", "#8BAC0F", "#9BBC0F"],
  },
  "arcane-fantasy": {
    name: "Arcane Fantasy",
    colors: [
      "#1A0F2E",
      "#2E1A47",
      "#4A2C6E",
      "#6B3FA0",
      "#8E5CC7",
      "#B17FE8",
      "#D4A5FF",
      "#E8C7FF",
      "#FFE5FF",
      "#FF6B9D",
      "#C71585",
      "#8B008B",
      "#4B0082",
      "#2E1A47",
      "#1A0F2E",
    ],
  },
  "vaporwave-neon": {
    name: "Vaporwave Neon",
    colors: [
      "#FF00FF",
      "#FF10F0",
      "#FF71CE",
      "#01CDFE",
      "#05FFA1",
      "#B967FF",
      "#FFFB96",
      "#FD1D53",
      "#F706CF",
      "#00D9FF",
      "#7DFFAF",
      "#FFB3FD",
      "#FFF01F",
      "#FF006E",
      "#8338EC",
    ],
  },
  "ghibli-pastels": {
    name: "Ghibli Pastels",
    colors: [
      "#F4E8C1",
      "#A0C1B8",
      "#709FB0",
      "#726A95",
      "#351F39",
      "#FFB6B9",
      "#FEC8D8",
      "#FFDFD3",
      "#B4E7CE",
      "#A8D8EA",
      "#AA96DA",
      "#FCBAD3",
      "#FFFFD2",
      "#A8E6CF",
      "#FFD3B6",
    ],
  },
  "doomfire-inferno": {
    name: "Doomfire Inferno",
    colors: [
      "#070707",
      "#1F0707",
      "#2F0F07",
      "#470F07",
      "#571707",
      "#671F07",
      "#771F07",
      "#8F2707",
      "#9F2F07",
      "#AF3F07",
      "#BF4707",
      "#C74707",
      "#DF4F07",
      "#DF5707",
      "#DF5707",
      "#D75F07",
      "#D7670F",
      "#CF6F0F",
      "#CF770F",
      "#CF7F0F",
      "#CF8717",
      "#C78717",
      "#C78F17",
      "#C7971F",
      "#BF9F1F",
      "#BF9F1F",
      "#BFA727",
      "#BFA727",
      "#BFAF2F",
      "#B7AF2F",
      "#B7B72F",
      "#B7B737",
      "#CFCF6F",
      "#DFDF9F",
      "#EFEFC7",
      "#FFFFFF",
    ],
  },
  "cyber-industrial": {
    name: "Cyber Industrial",
    colors: [
      "#0A0E27",
      "#16213E",
      "#1A1A2E",
      "#0F3460",
      "#533483",
      "#E94560",
      "#FF6B9D",
      "#00D9FF",
      "#00FFF5",
      "#39FF14",
      "#CCFF00",
      "#FFD700",
      "#FFA500",
      "#FF4500",
      "#8B0000",
    ],
  },
  "elden-tome": {
    name: "Elden Tome",
    colors: [
      "#1C1C1C",
      "#2E2E2E",
      "#3F3F3F",
      "#5A5A5A",
      "#7A7A7A",
      "#8B7355",
      "#A0826D",
      "#B8956A",
      "#D4AF37",
      "#FFD700",
      "#FFA500",
      "#FF8C00",
      "#FF6347",
      "#DC143C",
      "#8B0000",
    ],
  },
  "legendary-pixel": {
    name: "Legendary Pixel",
    colors: [
      "#000000",
      "#1D2B53",
      "#7E2553",
      "#008751",
      "#AB5236",
      "#5F574F",
      "#C2C3C7",
      "#FFF1E8",
      "#FF004D",
      "#FFA300",
      "#FFEC27",
      "#00E436",
      "#29ADFF",
      "#83769C",
      "#FF77A8",
      "#FFCCAA",
    ],
  },
};

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

const rgbToHsl = (
  r: number,
  g: number,
  b: number,
): { h: number; s: number; l: number } => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        break;
      case gn:
        h = ((bn - rn) / d + 2) / 6;
        break;
      case bn:
        h = ((rn - gn) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
};

const hslToHex = (h: number, s: number, l: number): string => {
  const hn = h / 360;
  const sn = s / 100;
  const ln = l / 100;

  let r: number;
  let g: number;
  let b: number;

  if (sn === 0) {
    r = g = b = ln;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      let tn = t;
      if (tn < 0) tn += 1;
      if (tn > 1) tn -= 1;
      if (tn < 1 / 6) return p + (q - p) * 6 * tn;
      if (tn < 1 / 2) return q;
      if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
      return p;
    };

    const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
    const p = 2 * ln - q;
    r = hue2rgb(p, q, hn + 1 / 3);
    g = hue2rgb(p, q, hn);
    b = hue2rgb(p, q, hn - 1 / 3);
  }

  return rgbToHex(
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255),
  );
};

const adjustBrightness = (hex: string, amount: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const r = Math.max(0, Math.min(255, rgb.r + amount));
  const g = Math.max(0, Math.min(255, rgb.g + amount));
  const b = Math.max(0, Math.min(255, rgb.b + amount));

  return rgbToHex(r, g, b);
};

const desaturateColor = (hex: string): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const gray = Math.round(0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b);
  return rgbToHex(gray, gray, gray);
};

const invertColor = (hex: string): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  return rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
};

const shiftHue = (hex: string, amountDegrees: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  hsl.h = (hsl.h + amountDegrees + 360) % 360;

  return hslToHex(hsl.h, hsl.s, hsl.l);
};

const colorize = (hex: string): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  // Increase saturation and adjust lightness for more vibrant color
  hsl.s = Math.min(100, hsl.s * 1.5 + 20);
  hsl.l = Math.max(30, Math.min(70, hsl.l));

  return hslToHex(hsl.h, hsl.s, hsl.l);
};

const generateHarmony = (hex: string): string[] => {
  const rgb = hexToRgb(hex);
  if (!rgb) return [hex];

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const harmony: string[] = [];

  // Base color
  harmony.push(hex);

  // Complementary
  harmony.push(hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l));

  // Triadic
  harmony.push(hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l));
  harmony.push(hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l));

  // Analogous
  harmony.push(hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l));
  harmony.push(hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l));

  // Split complementary
  harmony.push(hslToHex((hsl.h + 150) % 360, hsl.s, hsl.l));
  harmony.push(hslToHex((hsl.h + 210) % 360, hsl.s, hsl.l));

  // Lighter and darker variants
  harmony.push(hslToHex(hsl.h, hsl.s, Math.min(100, hsl.l + 20)));
  harmony.push(hslToHex(hsl.h, hsl.s, Math.max(0, hsl.l - 20)));

  return harmony;
};

export default function ColorPanel() {
  // Primary color state (RGBA)
  const [primaryColor, setPrimaryColor] = useState({
    r: 255,
    g: 255,
    b: 255,
    a: 255,
  });
  // Secondary color state (RGBA)
  const [secondaryColor, setSecondaryColor] = useState({
    r: 0,
    g: 0,
    b: 0,
    a: 255,
  });
  // Hex input state
  const [hexInput, setHexInput] = useState("#ffffff");

  // Collapsible states - enforced defaults: Palette open, RGB/Hex closed, Color Operations closed
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [rgbOpen, setRgbOpen] = useState(false);
  const [colorOpsOpen, setColorOpsOpen] = useState(false);

  // Palette states - default to "nes-classic"
  const [selectedPreset, setSelectedPreset] = useState<string>("nes-classic");
  const [_presetColors, setPresetColors] = useState<string[]>(
    PRESET_PALETTES["nes-classic"].colors,
  );
  const [palette, setPalette] = useState<string[]>(
    PRESET_PALETTES["nes-classic"].colors,
  );

  // Session palettes (memory-only storage)
  const [sessionPalettes, setSessionPalettes] = useState<
    Record<string, string[]>
  >({});

  // New palette dialog state
  const [newPaletteDialogOpen, setNewPaletteDialogOpen] = useState(false);
  const [newPaletteName, setNewPaletteName] = useState("");
  const [newPaletteError, setNewPaletteError] = useState("");

  // Color picker popover state
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  // File input ref for palette import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update hex input when primary color changes
  useEffect(() => {
    setHexInput(rgbToHex(primaryColor.r, primaryColor.g, primaryColor.b));
  }, [primaryColor]);

  // Listen for "Add to Palette" events from ColorQuickDock
  useEffect(() => {
    const handleAddColorToPalette = (event: Event) => {
      const customEvent = event as CustomEvent<{ hex: string }>;
      const { hex } = customEvent.detail;

      // Check if color already exists in palette
      if (!palette.includes(hex)) {
        // Append to palette
        setPalette((prev) => [...prev, hex]);
      }
    };

    window.addEventListener(
      "editor:add-color-to-palette",
      handleAddColorToPalette,
    );

    return () => {
      window.removeEventListener(
        "editor:add-color-to-palette",
        handleAddColorToPalette,
      );
    };
  }, [palette]);

  // Apply primary color to brush and refresh canvas
  const applyPrimaryColor = (r: number, g: number, b: number) => {
    setPrimaryColor({ r, g, b, a: 255 });
    if (window.editor?.tool?.setColor) {
      window.editor.tool.setColor(r, g, b, 255);
    }
    if (window.editor?.refresh) {
      window.editor.refresh();
    }
  };

  // Register setPrimaryColorFromOutside for eyedropper tool
  useEffect(() => {
    if (window.editor) {
      window.editor.setPrimaryColorFromOutside = (
        r: number,
        g: number,
        b: number,
        a: number,
      ) => {
        // Update local state
        setPrimaryColor({ r, g, b, a });
        setHexInput(rgbToHex(r, g, b));

        // Sync to ToolController
        if (window.editor?.tool?.setColor) {
          window.editor.tool.setColor(r, g, b, a);
        }

        // Refresh canvas
        if (window.editor?.refresh) {
          window.editor.refresh();
        }
      };
    }

    // Cleanup
    return () => {
      if (window.editor) {
        (window.editor as any).setPrimaryColorFromOutside = undefined;
      }
    };
  }, []);

  // Handle RGB slider changes
  const handleRChange = (value: number[]) => {
    applyPrimaryColor(value[0], primaryColor.g, primaryColor.b);
  };

  const handleGChange = (value: number[]) => {
    applyPrimaryColor(primaryColor.r, value[0], primaryColor.b);
  };

  const handleBChange = (value: number[]) => {
    applyPrimaryColor(primaryColor.r, primaryColor.g, value[0]);
  };

  // Handle hex input change
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHexInput(value);

    // Validate and apply hex color
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      const rgb = hexToRgb(value);
      if (rgb) {
        applyPrimaryColor(rgb.r, rgb.g, rgb.b);
      }
    }
  };

  // Handle hex input blur - ensure valid format
  const handleHexBlur = () => {
    const rgb = hexToRgb(hexInput);
    if (rgb) {
      applyPrimaryColor(rgb.r, rgb.g, rgb.b);
    } else {
      // Reset to current primary color if invalid
      setHexInput(rgbToHex(primaryColor.r, primaryColor.g, primaryColor.b));
    }
  };

  // Swap primary and secondary colors
  const _handleSwap = () => {
    const temp = { ...primaryColor };
    applyPrimaryColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
    setSecondaryColor(temp);
  };

  // Click secondary swatch to copy to primary
  const _handleSecondaryClick = () => {
    applyPrimaryColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
  };

  // Get palette name for display
  const getPaletteName = (key: string): string => {
    if (PRESET_PALETTES[key]) {
      return PRESET_PALETTES[key].name;
    }
    return key;
  };

  // Handle preset selection
  const handlePresetChange = (presetKey: string) => {
    setSelectedPreset(presetKey);

    // Check if it's a built-in preset
    if (PRESET_PALETTES[presetKey]) {
      const preset = PRESET_PALETTES[presetKey];
      setPresetColors(preset.colors);
      setPalette(preset.colors);
    }
    // Check if it's a session palette
    else if (sessionPalettes[presetKey]) {
      setPalette(sessionPalettes[presetKey]);
      setPresetColors(sessionPalettes[presetKey]);
    }
  };

  // Handle palette swatch click (left-click sets primary)
  const handlePaletteSwatchClick = (hexColor: string) => {
    const rgb = hexToRgb(hexColor);
    if (rgb) {
      applyPrimaryColor(rgb.r, rgb.g, rgb.b);

      // Dispatch custom event to notify ColorQuickDock
      window.dispatchEvent(
        new CustomEvent("editor:primary-color-changed", {
          detail: { r: rgb.r, g: rgb.g, b: rgb.b, a: 255 },
        }),
      );
    }
  };

  // Handle palette swatch right-click (remove from palette)
  const handlePaletteSwatchRightClick = (
    e: React.MouseEvent,
    hexColor: string,
  ) => {
    e.preventDefault();
    setPalette(palette.filter((c) => c !== hexColor));
  };

  // New Palette - open dialog
  const handleNewPalette = () => {
    setNewPaletteName("");
    setNewPaletteError("");
    setNewPaletteDialogOpen(true);
  };

  // Confirm new palette creation
  const handleConfirmNewPalette = () => {
    const trimmedName = newPaletteName.trim();

    // Validate name
    if (!trimmedName) {
      setNewPaletteError("Palette name cannot be empty");
      return;
    }

    // Check for duplicate names in built-in presets
    if (PRESET_PALETTES[trimmedName.toLowerCase().replace(/\s+/g, "-")]) {
      setNewPaletteError("A preset with this name already exists");
      return;
    }

    // Check for duplicate names in session palettes
    if (sessionPalettes[trimmedName]) {
      setNewPaletteError("A palette with this name already exists");
      return;
    }

    // Create new empty palette
    setSessionPalettes((prev) => ({
      ...prev,
      [trimmedName]: [],
    }));

    // Set as active palette
    setSelectedPreset(trimmedName);
    setPalette([]);
    setPresetColors([]);

    // Close dialog
    setNewPaletteDialogOpen(false);
    setNewPaletteName("");
    setNewPaletteError("");
  };

  // Cancel new palette creation
  const handleCancelNewPalette = () => {
    setNewPaletteDialogOpen(false);
    setNewPaletteName("");
    setNewPaletteError("");
  };

  // Save Palette - download JSON with current palette name
  const handleSavePalette = () => {
    let paletteName = "Custom Palette";

    // Use current palette name if available
    if (selectedPreset) {
      paletteName = getPaletteName(selectedPreset);
    }

    const paletteData = {
      name: paletteName,
      colors: palette,
    };

    const dataStr = JSON.stringify(paletteData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${paletteName.toLowerCase().replace(/\s+/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Load Palette - trigger file input
  const handleLoadPalette = () => {
    fileInputRef.current?.click();
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (json.colors && Array.isArray(json.colors)) {
            const paletteName = json.name || "Imported Palette";

            // Register as session palette
            setSessionPalettes((prev) => ({
              ...prev,
              [paletteName]: json.colors,
            }));

            // Set as active palette
            setSelectedPreset(paletteName);
            setPalette(json.colors);
            setPresetColors(json.colors);
          }
        } catch (error) {
          console.error("Failed to parse palette JSON:", error);
        }
      };
      reader.readAsText(file);
    }
    // Reset input value to allow loading the same file again
    e.target.value = "";
  };

  // Handle native color picker change
  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hexColor = e.target.value;
    const rgb = hexToRgb(hexColor);
    if (rgb) {
      applyPrimaryColor(rgb.r, rgb.g, rgb.b);
    }
  };

  // Color operation handlers
  const handleInvertColor = () => {
    const currentHex = rgbToHex(primaryColor.r, primaryColor.g, primaryColor.b);
    const newHex = invertColor(currentHex);
    const rgb = hexToRgb(newHex);
    if (rgb) {
      applyPrimaryColor(rgb.r, rgb.g, rgb.b);
    }
  };

  const handleDesaturate = () => {
    const currentHex = rgbToHex(primaryColor.r, primaryColor.g, primaryColor.b);
    const newHex = desaturateColor(currentHex);
    const rgb = hexToRgb(newHex);
    if (rgb) {
      applyPrimaryColor(rgb.r, rgb.g, rgb.b);
    }
  };

  const handleLighten = () => {
    const currentHex = rgbToHex(primaryColor.r, primaryColor.g, primaryColor.b);
    const newHex = adjustBrightness(currentHex, 30);
    const rgb = hexToRgb(newHex);
    if (rgb) {
      applyPrimaryColor(rgb.r, rgb.g, rgb.b);
    }
  };

  const handleDarken = () => {
    const currentHex = rgbToHex(primaryColor.r, primaryColor.g, primaryColor.b);
    const newHex = adjustBrightness(currentHex, -30);
    const rgb = hexToRgb(newHex);
    if (rgb) {
      applyPrimaryColor(rgb.r, rgb.g, rgb.b);
    }
  };

  const handleAutoHarmony = () => {
    const currentHex = rgbToHex(primaryColor.r, primaryColor.g, primaryColor.b);
    const harmonyColors = generateHarmony(currentHex);
    setPalette(harmonyColors);
  };

  const handleRandomizePalette = () => {
    const randomColors: string[] = [];
    for (let i = 0; i < 10; i++) {
      const r = Math.floor(Math.random() * 256);
      const g = Math.floor(Math.random() * 256);
      const b = Math.floor(Math.random() * 256);
      randomColors.push(rgbToHex(r, g, b));
    }
    setPalette(randomColors);
  };

  const handleHueMinus = () => {
    const currentHex = rgbToHex(primaryColor.r, primaryColor.g, primaryColor.b);
    const newHex = shiftHue(currentHex, -15);
    const rgb = hexToRgb(newHex);
    if (rgb) {
      applyPrimaryColor(rgb.r, rgb.g, rgb.b);
    }
  };

  const handleHuePlus = () => {
    const currentHex = rgbToHex(primaryColor.r, primaryColor.g, primaryColor.b);
    const newHex = shiftHue(currentHex, 15);
    const rgb = hexToRgb(newHex);
    if (rgb) {
      applyPrimaryColor(rgb.r, rgb.g, rgb.b);
    }
  };

  const handleColorize = () => {
    const currentHex = rgbToHex(primaryColor.r, primaryColor.g, primaryColor.b);
    const newHex = colorize(currentHex);
    const rgb = hexToRgb(newHex);
    if (rgb) {
      applyPrimaryColor(rgb.r, rgb.g, rgb.b);
    }
  };

  return (
    <div className="space-y-3">
      {/* Palette Collapsible - First, open by default */}
      <Collapsible open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded hover:bg-accent/50 transition-colors">
          <span className="text-sm font-medium">Palette</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${paletteOpen ? "" : "-rotate-90"}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 px-2 space-y-3">
          {/* Preset Palette Selector */}
          <div className="space-y-2">
            <Label htmlFor="preset-select" className="text-xs font-medium">
              Preset Palettes
            </Label>
            <Select value={selectedPreset} onValueChange={handlePresetChange}>
              <SelectTrigger id="preset-select" className="w-full">
                <SelectValue placeholder="Select a preset..." />
              </SelectTrigger>
              <SelectContent>
                {/* Built-in presets */}
                <SelectItem value="nes-classic">NES Classic</SelectItem>
                <SelectItem value="retro-sunset">Retro Sunset</SelectItem>
                <SelectItem value="gameboy-dmg">Game Boy DMG</SelectItem>
                <SelectItem value="arcane-fantasy">Arcane Fantasy</SelectItem>
                <SelectItem value="vaporwave-neon">Vaporwave Neon</SelectItem>
                <SelectItem value="ghibli-pastels">Ghibli Pastels</SelectItem>
                <SelectItem value="doomfire-inferno">
                  Doomfire Inferno
                </SelectItem>
                <SelectItem value="cyber-industrial">
                  Cyber Industrial
                </SelectItem>
                <SelectItem value="elden-tome">Elden Tome</SelectItem>
                <SelectItem value="legendary-pixel">Legendary Pixel</SelectItem>

                {/* Session palettes */}
                {Object.keys(sessionPalettes).map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Palette Management Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewPalette}
              className="flex-1 text-xs"
            >
              New Palette
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSavePalette}
              className="flex-1 text-xs"
              disabled={palette.length === 0}
            >
              Save Palette
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadPalette}
              className="flex-1 text-xs"
            >
              Load Palette
            </Button>
          </div>

          {/* Hidden file input for palette loading */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Palette Color Grid */}
          {palette.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Colors</Label>
              <div className="grid grid-cols-8 gap-1">
                {palette.map((hexColor) => (
                  <div
                    key={hexColor}
                    className="w-6 h-6 rounded border border-border cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: hexColor }}
                    onClick={() => handlePaletteSwatchClick(hexColor)}
                    onKeyDown={(e) =>
                      (e.key === "Enter" || e.key === " ") &&
                      handlePaletteSwatchClick(hexColor)
                    }
                    role="button"
                    tabIndex={0}
                    onContextMenu={(e) =>
                      handlePaletteSwatchRightClick(e, hexColor)
                    }
                    title={`${hexColor} (right-click to remove)`}
                  />
                ))}
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* RGB/Hex Inputs Collapsible - Second, closed by default */}
      <Collapsible open={rgbOpen} onOpenChange={setRgbOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded hover:bg-accent/50 transition-colors">
          <span className="text-sm font-medium">RGB/Hex Inputs</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${rgbOpen ? "" : "-rotate-90"}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 px-2 space-y-3">
          {/* Hex Input with Color Picker button */}
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="hex-input" className="text-xs font-medium">
                Hex Color
              </Label>
              <Input
                id="hex-input"
                type="text"
                value={hexInput}
                onChange={handleHexChange}
                onBlur={handleHexBlur}
                className="font-mono text-sm"
                placeholder="#RRGGBB"
                maxLength={7}
              />
            </div>

            {/* Color wheel button (24x24) */}
            <div className="flex flex-col justify-end">
              <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0 mt-6"
                    title="Color Picker"
                  >
                    <Palette className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="end">
                  <div className="space-y-2">
                    <Label
                      htmlFor="color-picker"
                      className="text-xs font-medium"
                    >
                      Pick Color
                    </Label>
                    <input
                      id="color-picker"
                      type="color"
                      value={rgbToHex(
                        primaryColor.r,
                        primaryColor.g,
                        primaryColor.b,
                      )}
                      onChange={handleColorPickerChange}
                      className="w-full h-32 cursor-pointer rounded border border-border"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* RGB Sliders */}
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="r-slider" className="text-xs font-medium">
                  Red
                </Label>
                <span className="text-xs text-muted-foreground font-mono">
                  {primaryColor.r}
                </span>
              </div>
              <Slider
                id="r-slider"
                min={0}
                max={255}
                step={1}
                value={[primaryColor.r]}
                onValueChange={handleRChange}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="g-slider" className="text-xs font-medium">
                  Green
                </Label>
                <span className="text-xs text-muted-foreground font-mono">
                  {primaryColor.g}
                </span>
              </div>
              <Slider
                id="g-slider"
                min={0}
                max={255}
                step={1}
                value={[primaryColor.g]}
                onValueChange={handleGChange}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="b-slider" className="text-xs font-medium">
                  Blue
                </Label>
                <span className="text-xs text-muted-foreground font-mono">
                  {primaryColor.b}
                </span>
              </div>
              <Slider
                id="b-slider"
                min={0}
                max={255}
                step={1}
                value={[primaryColor.b]}
                onValueChange={handleBChange}
                className="w-full"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Color Operations Collapsible - Third, closed by default */}
      <Collapsible open={colorOpsOpen} onOpenChange={setColorOpsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded hover:bg-accent/50 transition-colors">
          <span className="text-sm font-medium">Color Operations</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${colorOpsOpen ? "" : "-rotate-90"}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 px-2">
          <div className="grid grid-cols-3 gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleInvertColor}
              className="h-7 p-0"
              title="Invert Color"
            >
              <FlipHorizontal className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDesaturate}
              className="h-7 p-0"
              title="Desaturate (Grayscale)"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLighten}
              className="h-7 p-0"
              title="Lighten"
            >
              <Sun className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDarken}
              className="h-7 p-0"
              title="Darken"
            >
              <Moon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoHarmony}
              className="h-7 p-0"
              title="Auto-Harmony"
            >
              <Orbit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRandomizePalette}
              className="h-7 p-0"
              title="Randomize Palette"
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleHueMinus}
              className="h-7 p-0"
              title="Hue -15°"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleHuePlus}
              className="h-7 p-0"
              title="Hue +15°"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleColorize}
              className="h-7 p-0"
              title="Colorize"
            >
              <Brush className="h-4 w-4" />
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* New Palette Dialog */}
      <Dialog
        open={newPaletteDialogOpen}
        onOpenChange={setNewPaletteDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Palette</DialogTitle>
            <DialogDescription>
              Enter a name for your new palette. It will be created empty and
              stored in this session.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="palette-name">Palette Name</Label>
              <Input
                id="palette-name"
                value={newPaletteName}
                onChange={(e) => {
                  setNewPaletteName(e.target.value);
                  setNewPaletteError("");
                }}
                placeholder="Enter palette name..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleConfirmNewPalette();
                  }
                }}
              />
              {newPaletteError && (
                <p className="text-sm text-destructive">{newPaletteError}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelNewPalette}>
              Cancel
            </Button>
            <Button onClick={handleConfirmNewPalette}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
