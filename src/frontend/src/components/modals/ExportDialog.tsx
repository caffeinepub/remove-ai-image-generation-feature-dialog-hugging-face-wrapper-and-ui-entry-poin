import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React, { useState, useEffect } from "react";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: ExportOptions) => void;
}

export interface ExportOptions {
  format: "png" | "png-sequence" | "spritesheet" | "webm";
  scale: number;
  background: "transparent" | "solid";
  backgroundColor?: string;
  // Spritesheet options
  layout?: "horizontal" | "vertical" | "grid";
  // WebM options
  fps?: number;
  quality?: number;
  transparency?: boolean;
}

export function ExportDialog({
  open,
  onOpenChange,
  onExport,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportOptions["format"]>("png");
  const [scale, setScale] = useState<number>(1);
  const [background, setBackground] =
    useState<ExportOptions["background"]>("transparent");
  const [backgroundColor, setBackgroundColor] = useState("#000000");

  // Spritesheet options
  const [layout, setLayout] = useState<"horizontal" | "vertical" | "grid">(
    "horizontal",
  );

  // WebM options
  const [fps, setFps] = useState(12);
  const [quality, setQuality] = useState(80);

  const handleExport = () => {
    const options: ExportOptions = {
      format,
      scale,
      background,
      backgroundColor: background === "solid" ? backgroundColor : undefined,
    };

    if (format === "spritesheet") {
      options.layout = layout;
    }

    if (format === "webm") {
      options.fps = fps;
      options.quality = quality;
      options.transparency = background === "transparent";
      options.backgroundColor =
        background === "solid" ? backgroundColor : undefined;
    }

    onExport(options);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal container={document.getElementById("dialog-root")}>
        <DialogContent className="sm:max-w-[425px] z-[1000]">
          <DialogHeader>
            <DialogTitle>Export</DialogTitle>
            <DialogDescription>
              Choose export format and settings
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Format Selection */}
            <div className="grid gap-2">
              <Label htmlFor="format">Format</Label>
              <Select
                value={format}
                onValueChange={(value) =>
                  setFormat(value as ExportOptions["format"])
                }
              >
                <SelectTrigger id="format">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG (Current Frame)</SelectItem>
                  <SelectItem value="png-sequence">PNG Sequence</SelectItem>
                  <SelectItem value="spritesheet">Sprite Sheet</SelectItem>
                  <SelectItem value="webm">WebM Video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Scale Selection */}
            <div className="grid gap-2">
              <Label htmlFor="scale">Scale</Label>
              <Select
                value={scale.toString()}
                onValueChange={(value) => setScale(Number.parseInt(value))}
              >
                <SelectTrigger id="scale">
                  <SelectValue placeholder="Select scale" />
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

            {/* Background Selection */}
            <div className="grid gap-2">
              <Label htmlFor="background">Background</Label>
              <Select
                value={background}
                onValueChange={(value) =>
                  setBackground(value as ExportOptions["background"])
                }
              >
                <SelectTrigger id="background">
                  <SelectValue placeholder="Select background" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transparent">Transparent</SelectItem>
                  <SelectItem value="solid">Solid Color</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Background Color Picker (only shown when solid is selected) */}
            {background === "solid" && (
              <div className="grid gap-2">
                <Label htmlFor="backgroundColor">Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="backgroundColor"
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-20 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>
            )}

            {/* Spritesheet Options */}
            {format === "spritesheet" && (
              <div className="grid gap-2">
                <Label htmlFor="layout">Layout</Label>
                <Select
                  value={layout}
                  onValueChange={(value) =>
                    setLayout(value as "horizontal" | "vertical" | "grid")
                  }
                >
                  <SelectTrigger id="layout">
                    <SelectValue placeholder="Select layout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="horizontal">Horizontal</SelectItem>
                    <SelectItem value="vertical">Vertical</SelectItem>
                    <SelectItem value="grid">Grid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* WebM Options */}
            {format === "webm" && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="fps">Frame Rate (FPS)</Label>
                  <Input
                    id="fps"
                    type="number"
                    min="1"
                    max="60"
                    value={fps}
                    onChange={(e) =>
                      setFps(Number.parseInt(e.target.value) || 12)
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quality">Quality (%)</Label>
                  <Input
                    id="quality"
                    type="number"
                    min="1"
                    max="100"
                    value={quality}
                    onChange={(e) =>
                      setQuality(Number.parseInt(e.target.value) || 80)
                    }
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport}>Export</Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
