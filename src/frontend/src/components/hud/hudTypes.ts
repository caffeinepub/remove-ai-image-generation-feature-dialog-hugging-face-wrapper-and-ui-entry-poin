// HUD state interface defining all properties displayed in the HUD system
export interface HUDState {
  tool: string;
  brushSize: number;
  zoom: number;
  hoverPixel: { x: number; y: number } | null;
  mirrorX: boolean;
  mirrorY: boolean;
  pixelPerfect: boolean;
  dither: boolean;
  hasSelection: boolean;
  isRotating: boolean;
  isTransformMode: boolean;
  isTextMode: boolean;
  activeLayerIndex: number;
  activeLayerName: string | null;
  activeLayerParentGroupName: string | null;
}
