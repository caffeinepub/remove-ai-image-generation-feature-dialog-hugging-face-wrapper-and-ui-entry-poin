/**
 * ProjectState.ts
 * Encapsulates all per-canvas-tab state: frame data, canvas dimensions,
 * project identity, camera position, and view settings.
 * EditorRuntime holds one instance; Phase 2 will hold an array for multi-tab support.
 */

import { FrameManager } from "./FrameManager";

export interface CameraState {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface ViewSettings {
  showGrid: boolean;
  showPixelGrid: boolean;
  showTileGrid: boolean;
  tileSize: number;
  onionPrev: boolean;
  onionNext: boolean;
  onionStrength: number;
  loop: boolean;
}

export class ProjectState {
  frameManager: FrameManager;
  canvasWidth: number;
  canvasHeight: number;
  projectId: string | null = null;
  projectName: string | null = null;

  camera: CameraState = { zoom: 1, offsetX: 0, offsetY: 0 };

  view: ViewSettings = {
    showGrid: true,
    showPixelGrid: true,
    showTileGrid: false,
    tileSize: 8,
    onionPrev: true,
    onionNext: true,
    onionStrength: 0.3,
    loop: true,
  };

  constructor(width = 32, height = 32) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.frameManager = new FrameManager(width, height);
  }
}
