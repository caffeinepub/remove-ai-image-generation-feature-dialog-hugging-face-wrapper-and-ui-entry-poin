/**
 * LayerPropertiesPanel.tsx
 *
 * Layer properties panel component that displays filter controls for the active layer including hue, brightness, contrast, grayscale, blur, and drop shadow parameters with real-time updates, plus layer alignment controls with minimal monochrome icons for positioning layers on the canvas, with section headers styled to match "Pencil Settings" with only first letter capitalized.
 */

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { LayerManager } from "@/engine/LayerManager";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
} from "lucide-react";
import React from "react";

interface LayerPropertiesPanelProps {
  layerManager: LayerManager | null;
  activeLayerId: string | null;
  onLayersChange: () => void;
}

export default function LayerPropertiesPanel({
  layerManager,
  activeLayerId,
  onLayersChange,
}: LayerPropertiesPanelProps) {
  // Get active layer
  const activeLayer = React.useMemo(() => {
    if (!layerManager || !activeLayerId) return null;
    const node = layerManager.getItem(activeLayerId);
    if (!node || node.type !== "layer" || !node.layer) return null;
    return node.layer;
  }, [layerManager, activeLayerId]);

  if (!activeLayer) {
    return (
      <div className="text-xs text-muted-foreground p-2">
        No active layer selected
      </div>
    );
  }

  const handleHueChange = (value: number[]) => {
    if (!layerManager || !activeLayerId) return;
    layerManager.setLayerFilter(activeLayerId, "hue", value[0]);
    onLayersChange();
  };

  const handleBrightnessChange = (value: number[]) => {
    if (!layerManager || !activeLayerId) return;
    layerManager.setLayerFilter(activeLayerId, "brightness", value[0]);
    onLayersChange();
  };

  const handleContrastChange = (value: number[]) => {
    if (!layerManager || !activeLayerId) return;
    layerManager.setLayerFilter(activeLayerId, "contrast", value[0]);
    onLayersChange();
  };

  const handleGrayscaleChange = (value: number[]) => {
    if (!layerManager || !activeLayerId) return;
    layerManager.setLayerFilter(activeLayerId, "grayscale", value[0]);
    onLayersChange();
  };

  const handleBlurChange = (value: number[]) => {
    if (!layerManager || !activeLayerId) return;
    layerManager.setLayerFilter(activeLayerId, "blur", value[0]);
    onLayersChange();
  };

  const handleDropShadowOffsetXChange = (value: number[]) => {
    if (!layerManager || !activeLayerId) return;
    layerManager.setLayerDropShadow(activeLayerId, "offsetX", value[0]);
    onLayersChange();
  };

  const handleDropShadowOffsetYChange = (value: number[]) => {
    if (!layerManager || !activeLayerId) return;
    layerManager.setLayerDropShadow(activeLayerId, "offsetY", value[0]);
    onLayersChange();
  };

  const handleDropShadowBlurChange = (value: number[]) => {
    if (!layerManager || !activeLayerId) return;
    layerManager.setLayerDropShadow(activeLayerId, "blur", value[0]);
    onLayersChange();
  };

  const handleDropShadowOpacityChange = (value: number[]) => {
    if (!layerManager || !activeLayerId) return;
    layerManager.setLayerDropShadow(activeLayerId, "opacity", value[0]);
    onLayersChange();
  };

  // Alignment handlers
  const handleAlignLeft = () => {
    if (!layerManager || !activeLayerId) return;
    layerManager.alignLayerLeft(activeLayerId);
    onLayersChange();
  };

  const handleAlignRight = () => {
    if (!layerManager || !activeLayerId) return;
    layerManager.alignLayerRight(activeLayerId);
    onLayersChange();
  };

  const handleAlignHorizontalCenter = () => {
    if (!layerManager || !activeLayerId) return;
    layerManager.alignLayerHorizontalCenter(activeLayerId);
    onLayersChange();
  };

  const handleAlignVerticalMiddle = () => {
    if (!layerManager || !activeLayerId) return;
    layerManager.alignLayerVerticalMiddle(activeLayerId);
    onLayersChange();
  };

  const handleAlignTop = () => {
    if (!layerManager || !activeLayerId) return;
    layerManager.alignLayerTop(activeLayerId);
    onLayersChange();
  };

  const handleAlignBottom = () => {
    if (!layerManager || !activeLayerId) return;
    layerManager.alignLayerBottom(activeLayerId);
    onLayersChange();
  };

  return (
    <div className="space-y-3 p-2">
      {/* Alignment Section */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-white">Alignment</div>
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={handleAlignLeft}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={handleAlignRight}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Align Right"
          >
            <AlignRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={handleAlignHorizontalCenter}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Align Horizontal Center"
          >
            <AlignCenterHorizontal className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={handleAlignVerticalMiddle}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Align Vertical Middle"
          >
            <AlignCenterVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={handleAlignTop}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Align Top"
          >
            <AlignVerticalJustifyStart className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={handleAlignBottom}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Align Bottom"
          >
            <AlignVerticalJustifyEnd className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="pt-2 border-t space-y-3">
        <div className="text-sm font-medium text-white">Filter</div>

        {/* Hue */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="layer-hue" className="text-xs font-medium">
              Hue
            </Label>
            <span className="text-xs text-muted-foreground font-mono">
              {activeLayer.filters.hue}°
            </span>
          </div>
          <Slider
            id="layer-hue"
            min={-180}
            max={180}
            step={1}
            value={[activeLayer.filters.hue]}
            onValueChange={handleHueChange}
            className="w-full"
          />
        </div>

        {/* Brightness */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="layer-brightness" className="text-xs font-medium">
              Brightness
            </Label>
            <span className="text-xs text-muted-foreground font-mono">
              {activeLayer.filters.brightness > 0 ? "+" : ""}
              {activeLayer.filters.brightness}
            </span>
          </div>
          <Slider
            id="layer-brightness"
            min={-100}
            max={100}
            step={1}
            value={[activeLayer.filters.brightness]}
            onValueChange={handleBrightnessChange}
            className="w-full"
          />
        </div>

        {/* Contrast */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="layer-contrast" className="text-xs font-medium">
              Contrast
            </Label>
            <span className="text-xs text-muted-foreground font-mono">
              {activeLayer.filters.contrast > 0 ? "+" : ""}
              {activeLayer.filters.contrast}
            </span>
          </div>
          <Slider
            id="layer-contrast"
            min={-100}
            max={100}
            step={1}
            value={[activeLayer.filters.contrast]}
            onValueChange={handleContrastChange}
            className="w-full"
          />
        </div>

        {/* Grayscale */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="layer-grayscale" className="text-xs font-medium">
              Grayscale
            </Label>
            <span className="text-xs text-muted-foreground font-mono">
              {activeLayer.filters.grayscale}%
            </span>
          </div>
          <Slider
            id="layer-grayscale"
            min={0}
            max={100}
            step={1}
            value={[activeLayer.filters.grayscale]}
            onValueChange={handleGrayscaleChange}
            className="w-full"
          />
        </div>

        {/* Blur */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="layer-blur" className="text-xs font-medium">
              Blur
            </Label>
            <span className="text-xs text-muted-foreground font-mono">
              {activeLayer.filters.blur}px
            </span>
          </div>
          <Slider
            id="layer-blur"
            min={0}
            max={10}
            step={0.5}
            value={[activeLayer.filters.blur]}
            onValueChange={handleBlurChange}
            className="w-full"
          />
        </div>
      </div>

      {/* Drop Shadow Section */}
      <div className="pt-2 border-t space-y-3">
        <div className="text-sm font-medium text-white">Drop shadow</div>

        {/* Offset X */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="layer-shadow-x" className="text-xs font-medium">
              Offset X
            </Label>
            <span className="text-xs text-muted-foreground font-mono">
              {activeLayer.filters.dropShadow.offsetX}px
            </span>
          </div>
          <Slider
            id="layer-shadow-x"
            min={-20}
            max={20}
            step={1}
            value={[activeLayer.filters.dropShadow.offsetX]}
            onValueChange={handleDropShadowOffsetXChange}
            className="w-full"
          />
        </div>

        {/* Offset Y */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="layer-shadow-y" className="text-xs font-medium">
              Offset Y
            </Label>
            <span className="text-xs text-muted-foreground font-mono">
              {activeLayer.filters.dropShadow.offsetY}px
            </span>
          </div>
          <Slider
            id="layer-shadow-y"
            min={-20}
            max={20}
            step={1}
            value={[activeLayer.filters.dropShadow.offsetY]}
            onValueChange={handleDropShadowOffsetYChange}
            className="w-full"
          />
        </div>

        {/* Blur */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="layer-shadow-blur" className="text-xs font-medium">
              Blur
            </Label>
            <span className="text-xs text-muted-foreground font-mono">
              {activeLayer.filters.dropShadow.blur}px
            </span>
          </div>
          <Slider
            id="layer-shadow-blur"
            min={0}
            max={10}
            step={0.5}
            value={[activeLayer.filters.dropShadow.blur]}
            onValueChange={handleDropShadowBlurChange}
            className="w-full"
          />
        </div>

        {/* Opacity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="layer-shadow-opacity"
              className="text-xs font-medium"
            >
              Opacity
            </Label>
            <span className="text-xs text-muted-foreground font-mono">
              {activeLayer.filters.dropShadow.opacity}%
            </span>
          </div>
          <Slider
            id="layer-shadow-opacity"
            min={0}
            max={100}
            step={1}
            value={[activeLayer.filters.dropShadow.opacity]}
            onValueChange={handleDropShadowOpacityChange}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
