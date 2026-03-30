import React, { useEffect, useRef, useState } from "react";
import { renderCanvas } from "../components/canvas/CanvasRenderer";
import CanvasSurface from "../components/canvas/CanvasSurface";
import PixelGridOverlay from "../components/canvas/PixelGridOverlay";
import PixelHighlightOverlay from "../components/canvas/PixelHighlightOverlay";
import SelectionOverlay from "../components/canvas/SelectionOverlay";
import TabBar from "../components/canvas/TabBar";
import TileGridOverlay from "../components/canvas/TileGridOverlay";
import ColorQuickDock from "../components/hud/ColorQuickDock";
import { HUDGeneralInfo } from "../components/hud/HUDGeneralInfo";
import { HUDNotes } from "../components/hud/HUDNotes";
import { HUDShortcuts } from "../components/hud/HUDShortcuts";
import type { HUDState } from "../components/hud/hudTypes";
import Header from "../components/layout/Header";
import RightSidebar from "../components/layout/RightSidebar";
import Timeline from "../components/layout/Timeline";
import ToolOptionsBar from "../components/layout/ToolOptionsBar";
import ToolPanel from "../components/layout/ToolPanel";
import CanvasSizeDialog from "../components/modals/CanvasSizeDialog";
import {
  ExportDialog,
  type ExportOptions,
} from "../components/modals/ExportDialog";
import ImportDialog, {
  type ImportOptions,
} from "../components/modals/ImportDialog";
import ImportSpritesheetDialog from "../components/modals/ImportSpritesheetDialog";
import { EditorRuntime, getEditorRuntime } from "../editor/EditorRuntime";
import {
  exportCurrentFramePNG,
  exportPNGSequence,
  exportSpriteSheet,
  exportWebM,
} from "../engine/ExportManager";
import { importSpritesheet } from "../engine/SpritesheetImporter";
import { type TabState, createTab } from "../engine/TabManager";
import { useActor } from "../hooks/useActor";
import {
  type SerializedProject,
  rebuildLayerTree,
} from "../lib/projectSerializer";

const _DEBUG =
  (typeof process !== "undefined" && process.env.DEV === "true") ||
  (typeof localStorage !== "undefined" &&
    localStorage.getItem("DEBUG_EDITOR") === "1");

export default function HomePage() {
  // ── Multi-tab state ────────────────────────────────────────────────────────
  // Each tab owns its own EditorRuntime (independent canvas, layers, frames,
  // undo history, camera). Tool type/color are synced when switching tabs.
  const [tabs, setTabs] = useState<TabState[]>(() => {
    const initialRuntime = getEditorRuntime();
    return [createTab("tab-0", "Canvas 1", initialRuntime)];
  });
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // Derive the active runtime — all existing code references `runtime` unchanged
  const runtime = tabs[activeTabIndex].runtime;
  // Keep a ref so stale-closure handlers (keydown, window.editor) always use the current runtime
  const runtimeRef = useRef(runtime);
  runtimeRef.current = runtime;
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const isInitialMount = useRef(true);

  const { actor } = useActor();

  const canvasRef = useRef<{
    getCanvasElement: () => HTMLCanvasElement | null;
    getContext: () => CanvasRenderingContext2D | null;
  }>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const needsRedrawRef = useRef(false);

  // Shared offscreen canvas for move preview rendering
  const _offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const _offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const [canvasSize, setCanvasSize] = useState({
    width: runtime.canvasWidth,
    height: runtime.canvasHeight,
  });
  const [tabName, setTabName] = useState("Canvas 1");
  const [camera, setCamera] = useState({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const [showGrid, setShowGrid] = useState(true);
  const [showPixelGrid, setShowPixelGrid] = useState(true);
  const [showTileGrid, setShowTileGrid] = useState(false);
  const [tileSize, setTileSize] = useState(8);
  const [layersVersion, setLayersVersion] = useState(0);
  const [framesVersion, setFramesVersion] = useState(0);
  const [activeFrameIndexState, setActiveFrameIndexState] = useState(
    runtime.activeFrameIndex,
  );
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);

  const [onionPrev, setOnionPrev] = useState(true);
  const [onionNext, setOnionNext] = useState(true);
  const [onionStrength, setOnionStrength] = useState(0.3);

  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const playbackIntervalRef = useRef<number | null>(null);

  // Tool options state
  const [mirrorX, setMirrorX] = useState(false);
  const [mirrorY, setMirrorY] = useState(false);
  const [pixelPerfect, setPixelPerfect] = useState(false);
  const [dither, setDither] = useState(false);

  // Dialog states
  const [canvasSizeDialogOpen, setCanvasSizeDialogOpen] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showSpritesheetDialog, setShowSpritesheetDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<{
    bitmap: ImageBitmap;
    width: number;
    height: number;
    fileSize: number;
    hasTransparency: boolean;
  } | null>(null);

  // Focus Mode state
  const [focusModeActive, setFocusModeActive] = useState(false);

  // Pending tab restore for multi-tab project loading
  const [pendingTabRestore, setPendingTabRestoreState] = useState<{
    project: SerializedProject;
    name: string;
    projectId: string | null;
  } | null>(null);

  // Hover pixel tracking ref (replaced state with ref)
  const hoverPixelRef = useRef<{ x: number; y: number } | null>(null);

  // Brush size state
  const [brushSize, setBrushSize] = useState(1);

  // Current tool state for HUD
  const [currentTool, setCurrentTool] = useState<string>("pencil");

  // Internal clipboard state
  const clipboardRef = useRef<{
    pixels: Array<{
      x: number;
      y: number;
      r: number;
      g: number;
      b: number;
      a: number;
    }>;
    width: number;
    height: number;
  } | null>(null);

  // Cursor style state for dynamic cursor feedback
  const [cursorStyle, setCursorStyle] = useState<string>("default");

  // HUD visibility state - reactive to runtime changes
  const [hudVisibility, setHudVisibility] = useState(
    runtime.getHudVisibility(),
  );

  // Record editor visit once actor is available
  useEffect(() => {
    if (actor) {
      actor.recordEditorVisit().catch((error) => {
        console.error("Failed to record editor visit:", error);
      });
    }
  }, [actor]);

  // Subscribe to HUD visibility changes from runtime
  useEffect(() => {
    const unsubscribe = runtime.onHudVisibilityChange(setHudVisibility);
    return unsubscribe;
  }, [runtime]);

  // Subscribe to layer changes from runtime
  useEffect(() => {
    const unsubscribe = runtime.onLayersChanged(() => {
      forceLayersUpdate();
      needsRedrawRef.current = true;
    });
    return unsubscribe;
  }, [runtime]);

  // One-time synchronization effect to align UI activeLayerId with runtime's active layer on initial load
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    const layerManager = runtime.getCurrentLayerManager();
    const activeId = layerManager.getActiveLayerId();
    if (activeId) {
      setActiveLayerId(activeId);
    }
  }, []);

  const forceLayersUpdate = () => setLayersVersion((v) => v + 1);
  const forceFramesUpdate = () => setFramesVersion((v) => v + 1);

  // ── Tab management handlers ────────────────────────────────────────────────

  /**
   * Switch to a different tab.
   * Saves the current camera/canvasSize/activeLayerId into the current tab slot,
   * then loads the new tab's saved state into the active-state variables.
   * Tool settings (tool type, color, brush size) are synced to the new runtime.
   */
  const handleTabSwitch = (newIndex: number) => {
    if (newIndex === activeTabIndex) return;

    // Snapshot current state into the current tab entry
    setTabs((prev) =>
      prev.map((t, i) =>
        i === activeTabIndex
          ? { ...t, name: tabName, camera, canvasSize, activeLayerId }
          : t,
      ),
    );

    const newTab = tabs[newIndex];

    // Sync tool settings from current runtime to new runtime
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const srcTool = runtime.toolController as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dstTool = newTab.runtime.toolController as any;
    try {
      (dstTool as any).setTool?.((srcTool as any).currentTool);
      const c = (srcTool as any).getCurrentColor?.();
      if (c) dstTool.setColor(c.r, c.g, c.b, c.a);
      if ((srcTool as any).brushSize !== undefined)
        (dstTool as any).brushSize = (srcTool as any).brushSize;
    } catch {
      // Sync failures are non-fatal
    }

    // Activate new tab
    setActiveTabIndex(newIndex);
    setCamera(newTab.camera);
    setCanvasSize(newTab.canvasSize);
    setTabName(newTab.name);
    setActiveLayerId(
      newTab.activeLayerId ??
        newTab.runtime.frameManager
          .getCurrentFrame()
          ?.layerManager.getActiveLayerId() ??
        null,
    );
    setActiveFrameIndexState(newTab.runtime.activeFrameIndex);
    forceLayersUpdate();
    forceFramesUpdate();
    needsRedrawRef.current = true;
  };

  /**
   * Add a new canvas tab (max 2 tabs).
   * Creates a fresh EditorRuntime (32×32 default), saves current tab state,
   * and switches to the new tab. The camera auto-fits after mount.
   */
  const handleTabAdd = () => {
    if (tabs.length >= 2) return;

    const newRuntime = new EditorRuntime(32, 32);
    const newId = `tab-${Date.now()}`;
    const newName = `Canvas ${tabs.length + 1}`;
    const newTab: TabState = {
      id: newId,
      name: newName,
      runtime: newRuntime,
      camera: { zoom: 1, offsetX: 0, offsetY: 0 },
      canvasSize: { width: 32, height: 32 },
      activeLayerId:
        newRuntime.frameManager
          .getCurrentFrame()
          ?.layerManager.getActiveLayerId() ?? null,
      isDirty: false,
      projectId: null,
      projectName: null,
    };

    // Save current tab state before switching
    setTabs((prev) => [
      ...prev.map((t, i) =>
        i === activeTabIndex
          ? { ...t, name: tabName, camera, canvasSize, activeLayerId }
          : t,
      ),
      newTab,
    ]);

    // Sync tool settings to new runtime
    try {
      (newRuntime.toolController as any).setTool?.(
        (runtime.toolController as any).currentTool,
      );
      const c = (runtime.toolController as any).getCurrentColor?.();
      if (c) newRuntime.toolController.setColor(c.r, c.g, c.b, c.a);
      if ((runtime.toolController as any).brushSize !== undefined)
        (newRuntime.toolController as any).brushSize = (
          runtime.toolController as any
        ).brushSize;
    } catch {
      // Sync failures are non-fatal
    }

    setActiveTabIndex(tabs.length);
    setCamera({ zoom: 1, offsetX: 0, offsetY: 0 });
    setCanvasSize({ width: 32, height: 32 });
    setTabName(newName);
    setActiveLayerId(newTab.activeLayerId);
    setActiveFrameIndexState(0);
    forceLayersUpdate();
    forceFramesUpdate();
    needsRedrawRef.current = true;

    // Auto-fit view for the new tab after the canvas mounts
    const container = canvasContainerRef.current;
    if (container) {
      requestAnimationFrame(() => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        const zoom = Math.min((w * 0.6) / 32, (h * 0.6) / 32);
        setCamera({
          zoom,
          offsetX: (w - 32 * zoom) / 2,
          offsetY: (h - 32 * zoom) / 2,
        });
      });
    }
  };

  /**
   * Close a tab. Always keeps at least one tab open.
   * If the closed tab is active, switches to the adjacent tab.
   */
  const handleTabClose = (index: number) => {
    if (tabs.length <= 1) return;

    const newTabs = tabs.filter((_, i) => i !== index);
    setTabs(newTabs);

    let newActive = activeTabIndex;
    if (index === activeTabIndex) {
      // Switch to the previous tab (or stay at 0)
      newActive = Math.max(0, activeTabIndex - 1);
      const newTab = newTabs[newActive];
      setCamera(newTab.camera);
      setCanvasSize(newTab.canvasSize);
      setTabName(newTab.name);
      setActiveLayerId(
        newTab.activeLayerId ??
          newTab.runtime.frameManager
            .getCurrentFrame()
            ?.layerManager.getActiveLayerId() ??
          null,
      );
      setActiveFrameIndexState(newTab.runtime.activeFrameIndex);
      forceLayersUpdate();
      forceFramesUpdate();
      needsRedrawRef.current = true;
    } else if (index < activeTabIndex) {
      newActive = activeTabIndex - 1;
    }
    setActiveTabIndex(newActive);
  };

  // Helper function to get active layer hierarchy info
  const getActiveLayerInfo = (): {
    name: string | null;
    parentGroupName: string | null;
  } => {
    const layerManager = runtime.getCurrentLayerManager();
    if (!layerManager || !activeLayerId) {
      return { name: null, parentGroupName: null };
    }

    const activeNode = layerManager.getActiveLayerNode();
    if (!activeNode) {
      return { name: null, parentGroupName: null };
    }

    const parentGroupName = layerManager.getParentGroupName(activeLayerId);

    return {
      name: activeNode.name,
      parentGroupName: parentGroupName,
    };
  };

  // Build HUD state from current UI and tool controller states
  const layerInfo = getActiveLayerInfo();
  const hudState: HUDState = {
    tool: currentTool,
    brushSize: brushSize,
    zoom: camera.zoom,
    hoverPixel: null,
    mirrorX: mirrorX,
    mirrorY: mirrorY,
    pixelPerfect: pixelPerfect,
    dither: dither,
    hasSelection: runtime.toolController.hasSelection() || false,
    isRotating: false,
    isTransformMode: false,
    isTextMode: runtime.toolController.isTextActive() || false,
    activeLayerIndex: getActiveLayerIndex(),
    activeLayerName: layerInfo.name,
    activeLayerParentGroupName: layerInfo.parentGroupName,
  };

  /**
   * Reset editor from project - fully tears down and recreates all editor state
   * @param project - Serialized project to load, or null for new project
   */
  const resetEditorFromProject = (project: SerializedProject | null) => {
    // Determine canvas dimensions
    const width = project ? project.canvasWidth : 32;
    const height = project ? project.canvasHeight : 32;

    // Reset the runtime (creates FrameManager with one default layer)
    runtime.reset(width, height);

    // Update canvas size state
    setCanvasSize({ width, height });

    // Resize actual canvas element immediately
    const canvas = canvasRef.current?.getCanvasElement();
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
    }

    if (project === null) {
      // NEW PROJECT: Frame already created by runtime.reset() with one default layer
      // No need to create additional layers - FrameManager constructor handles this

      // Reset project tracking
      runtime.setCurrentProject(null, null);
    } else {
      // OPEN/UPLOAD PROJECT: Reconstruct frames from serialized data
      // Clear the default frame created by constructor
      const defaultFrameIds = runtime.frameManager.getFrameIds();
      if (defaultFrameIds.length > 0) {
        runtime.frameManager.deleteFrame(defaultFrameIds[0]);
      }

      // Recreate frames from project data
      project.frames.forEach((frameData, frameIndex) => {
        // Add new frame
        const _frameId = runtime.frameManager.addFrame();
        runtime.frameManager.setActiveFrame(frameIndex);

        const frame = runtime.frameManager.getCurrentFrame();
        if (!frame) return;

        // Set frame duration
        runtime.frameManager.setFrameDuration(frameIndex, frameData.duration);

        // Attach undo manager before rebuilding tree
        frame.layerManager.attachUndoManager(frame.undoRedoManager);

        // Rebuild the hierarchical layer tree from serialized data
        rebuildLayerTree(frame.layerManager, frameData.layerTree);

        // Set active layer to first layer using LayerManager's active layer ID
        const activeId = frame.layerManager.getActiveLayerId();
        if (activeId) {
          frame.layerManager.setActiveLayer(activeId);
        }
      });

      // Set active frame to first frame
      runtime.switchToFrame(0);
    }

    // Get current frame and update active layer state
    const currentFrame = runtime.frameManager.getCurrentFrame();
    if (currentFrame) {
      const activeId = currentFrame.layerManager.getActiveLayerId();
      setActiveLayerId(activeId);
    }

    // Update active frame state
    setActiveFrameIndexState(0);

    // Force UI updates
    forceLayersUpdate();
    forceFramesUpdate();
    needsRedrawRef.current = true;

    // Recenter camera
    const container = canvasContainerRef.current;
    if (container) {
      requestAnimationFrame(() => {
        if (!container) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        const targetZoom = Math.min(
          (containerWidth * 0.6) / width,
          (containerHeight * 0.6) / height,
        );

        setCamera({
          zoom: targetZoom,
          offsetX: (containerWidth - width * targetZoom) / 2,
          offsetY: (containerHeight - height * targetZoom) / 2,
        });
      });
    }
  };

  // Auto-center and zoom canvas to fill ~60% of workspace
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const targetZoom = Math.min(
        (containerWidth * 0.6) / canvasSize.width,
        (containerHeight * 0.6) / canvasSize.height,
      );

      setCamera({
        zoom: targetZoom,
        offsetX: (containerWidth - canvasSize.width * targetZoom) / 2,
        offsetY: (containerHeight - canvasSize.height * targetZoom) / 2,
      });
    });
  }, [canvasSize]);

  // Recenter canvas on window resize
  useEffect(() => {
    const handleResize = () => {
      const container = canvasContainerRef.current;
      if (!container) return;

      const cw = container.clientWidth;
      const ch = container.clientHeight;

      const targetZoom = Math.min(
        (cw * 0.6) / canvasSize.width,
        (ch * 0.6) / canvasSize.height,
      );

      setCamera({
        zoom: targetZoom,
        offsetX: (cw - canvasSize.width * targetZoom) / 2,
        offsetY: (ch - canvasSize.height * targetZoom) / 2,
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [canvasSize]);

  // Outside-canvas selection cancellation with UI element filtering
  useEffect(() => {
    const handleDocumentPointerDown = (e: PointerEvent) => {
      const canvas = canvasRef.current?.getCanvasElement();
      if (!canvas) return;

      const target = e.target as HTMLElement;

      // ✅ Minimal fix: ignore clicks on UI controls
      if (
        target.closest("button") ||
        target.closest('[role="button"]') ||
        target.closest('[role="menuitem"]') ||
        target.closest('[role="menu"]') ||
        target.closest('[role="dialog"]') ||
        target.closest("input") ||
        target.closest("textarea") ||
        target.closest('[data-ui-element="true"]')
      ) {
        return;
      }

      // Existing behavior
      if (!canvas.contains(target)) {
        runtime.toolController.cancelSelectionFromOutside();
        needsRedrawRef.current = true;
      }
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown);

    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
    };
  }, [runtime]);

  // Update cursor style based on selection hit testing and rotation mode
  useEffect(() => {
    const updateCursor = () => {
      const selectionManager = (runtime.toolController as any).selectionManager;

      if (!selectionManager || !runtime.toolController.hasSelection()) {
        setCursorStyle("default");
        requestAnimationFrame(updateCursor);
        return;
      }

      // Check if in rotation mode
      const isRotating = selectionManager.isInRotationMode();

      if (isRotating) {
        setCursorStyle("crosshair");
        requestAnimationFrame(updateCursor);
        return;
      }

      // Get hover pixel position
      const hoverPixel = hoverPixelRef.current;
      if (!hoverPixel) {
        setCursorStyle("default");
        requestAnimationFrame(updateCursor);
        return;
      }

      // Perform hit test
      const hitResult = selectionManager.hitTest(hoverPixel.x, hoverPixel.y);

      if (!hitResult) {
        setCursorStyle("default");
      } else if (hitResult === "inside") {
        setCursorStyle("move");
      } else if (hitResult === "corner") {
        // Determine which corner for appropriate resize cursor
        const rect = selectionManager.getSelectionRect();
        if (!rect) {
          setCursorStyle("default");
        } else {
          const minX = rect.x;
          const maxX = rect.x + rect.width - 1;
          const minY = rect.y;
          const maxY = rect.y + rect.height - 1;

          const isLeft =
            Math.abs(hoverPixel.x - minX) < Math.abs(hoverPixel.x - maxX);
          const isTop =
            Math.abs(hoverPixel.y - minY) < Math.abs(hoverPixel.y - maxY);

          if (isTop && isLeft) {
            setCursorStyle("nwse-resize");
          } else if (isTop && !isLeft) {
            setCursorStyle("nesw-resize");
          } else if (!isTop && isLeft) {
            setCursorStyle("nesw-resize");
          } else {
            setCursorStyle("nwse-resize");
          }
        }
      } else if (hitResult === "edge") {
        // Determine which edge for appropriate resize cursor
        const rect = selectionManager.getSelectionRect();
        if (!rect) {
          setCursorStyle("default");
        } else {
          const minX = rect.x;
          const maxX = rect.x + rect.width - 1;
          const minY = rect.y;
          const maxY = rect.y + rect.height - 1;

          const onLeft = Math.abs(hoverPixel.x - minX) <= 0;
          const onRight = Math.abs(hoverPixel.x - maxX) <= 0;
          const onTop = Math.abs(hoverPixel.y - minY) <= 0;
          const onBottom = Math.abs(hoverPixel.y - maxY) <= 0;

          if (onLeft || onRight) {
            setCursorStyle("ew-resize");
          } else if (onTop || onBottom) {
            setCursorStyle("ns-resize");
          } else {
            setCursorStyle("default");
          }
        }
      }

      requestAnimationFrame(updateCursor);
    };

    const rafId = requestAnimationFrame(updateCursor);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [runtime]);

  const redraw = () => {
    const ctx = canvasRef.current?.getContext();
    const layerManager = runtime.getCurrentLayerManager();
    if (!ctx || !layerManager) return;

    renderCanvas(
      layerManager,
      ctx,
      showGrid,
      runtime.frameManager,
      activeFrameIndexState,
      onionPrev,
      onionNext,
      onionStrength,
      runtime.toolController,
    );
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    let frame: number;
    const renderLoop = () => {
      if (needsRedrawRef.current) {
        redraw();
        needsRedrawRef.current = false;
      }
      frame = requestAnimationFrame(renderLoop);
    };
    frame = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(frame);
  }, [
    showGrid,
    layersVersion,
    framesVersion,
    activeFrameIndexState,
    onionPrev,
    onionNext,
    onionStrength,
  ]);

  // Handle import PNG - show dialog first
  const handleImportPNG = async (file: File) => {
    try {
      const bitmap = await createImageBitmap(file);

      // Analyze transparency
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = bitmap.width;
      tempCanvas.height = bitmap.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return;

      tempCtx.drawImage(bitmap, 0, 0);
      const imageData = tempCtx.getImageData(0, 0, bitmap.width, bitmap.height);

      let hasTransparency = false;
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] < 255) {
          hasTransparency = true;
          break;
        }
      }

      setPendingImportData({
        bitmap,
        width: bitmap.width,
        height: bitmap.height,
        fileSize: file.size,
        hasTransparency,
      });
      setShowImportDialog(true);
    } catch (error) {
      console.error("Failed to import PNG:", error);
    }
  };

  /**
   * Unified Delete Selection - handles both floating selections and layer pixel clearing
   *
   * Behavior:
   * - If no selection exists → return immediately (no action)
   * - If selection exists AND floating pixels exist:
   *   → Discard floating selection without restoring background pixels
   *   → Wrap in single undo transaction
   * - If selection exists AND no floating pixels exist:
   *   → Clear pixels from active layer using selectionRect and lassoMask
   *   → Wrap in single undo transaction
   *
   * Expected result:
   * - Delete removes only floating pixels when present, preserving background
   * - Delete clears layer pixels when no floating selection exists
   * - One undo step for restoration in both cases
   * - Works identically for Rectangle, Lasso, and Magic selection tools
   */
  const deleteSelection = () => {
    const layerManager = runtime.getCurrentLayerManager();
    if (!layerManager) return;

    // Step 1: Check if there's an active selection
    if (!runtime.toolController.hasSelection()) {
      return;
    }

    // Step 2: Get selection manager from tool controller
    const selectionManager = (runtime.toolController as any).selectionManager;
    if (!selectionManager) return;

    // Step 3: Check if floating pixels exist
    const hasFloatingPixels = selectionManager.hasFloatingPixels();

    // Step 4: Begin undo transaction
    const undoManager = runtime.getCurrentUndoRedoManager();
    if (undoManager) {
      undoManager.beginTransaction();
    }

    if (hasFloatingPixels) {
      // FLOATING SELECTION PATH: Discard floating pixels without restoring background
      selectionManager.discardSelectionNoRestore();

      // Clear selection state in tool controller
      runtime.toolController.clearSelection();
    } else {
      // NO FLOATING PIXELS PATH: Clear pixels from active layer
      const selectionRect = selectionManager.getSelectionRect();
      if (!selectionRect) {
        if (undoManager) {
          undoManager.endTransaction();
        }
        return;
      }

      const lassoMask = (selectionManager as any).lassoMask;
      const activeLayer = layerManager.getActiveLayer();
      if (!activeLayer) {
        if (undoManager) {
          undoManager.endTransaction();
        }
        return;
      }

      // Iterate through all pixels within selectionRect
      for (let y = 0; y < selectionRect.height; y++) {
        for (let x = 0; x < selectionRect.width; x++) {
          // If lassoMask exists, check mask value
          if (lassoMask && !lassoMask[y]?.[x]) {
            continue; // Skip pixels not in mask
          }

          const worldX = selectionRect.x + x;
          const worldY = selectionRect.y + y;

          // Clear pixel to transparent (set RGBA to 0,0,0,0)
          activeLayer.setPixel(worldX, worldY, 0, 0, 0, 0);
        }
      }

      // Discard selection without restoring (pixels already cleared)
      selectionManager.discardSelectionNoRestore();

      // Clear selection state in tool controller
      runtime.toolController.clearSelection();
    }

    // Step 5: End undo transaction
    if (undoManager) {
      undoManager.endTransaction();
    }

    // Step 6: Force UI update
    forceLayersUpdate();
    needsRedrawRef.current = true;
  };

  // Clipboard operations
  const handleCopy = () => {
    const runtime = runtimeRef.current;
    const layerManager = runtime.getCurrentLayerManager();
    if (!layerManager) return;

    // Check if there's an active selection
    if (!runtime.toolController.hasSelection()) {
      return;
    }

    // Get selection manager from tool controller
    const selectionManager = (runtime.toolController as any).selectionManager;
    if (!selectionManager) return;

    // Check if floating pixels exist
    const floatingPixels = selectionManager.getFloatingPixels();

    if (floatingPixels && floatingPixels.length > 0) {
      // Copy floating pixels directly (already in world coordinates)
      const floatingRect = selectionManager.getFloatingRect();
      if (!floatingRect) return;

      // Convert world coordinates to local coordinates
      const localPixels = floatingPixels.map((p: any) => ({
        x: p.x - floatingRect.x,
        y: p.y - floatingRect.y,
        r: p.r,
        g: p.g,
        b: p.b,
        a: p.a,
      }));

      clipboardRef.current = {
        pixels: localPixels,
        width: floatingRect.width,
        height: floatingRect.height,
      };
    } else {
      // Extract pixels from layer within selection rectangle
      const selectionRect = selectionManager.getSelectionRect();
      if (!selectionRect) return;

      const activeLayer = layerManager.getActiveLayer();
      if (!activeLayer) return;

      const pixels: Array<{
        x: number;
        y: number;
        r: number;
        g: number;
        b: number;
        a: number;
      }> = [];

      // Extract pixels within selection bounds
      for (let y = 0; y < selectionRect.height; y++) {
        for (let x = 0; x < selectionRect.width; x++) {
          const worldX = selectionRect.x + x;
          const worldY = selectionRect.y + y;

          const pixel = activeLayer.getPixel(worldX, worldY);
          if (pixel && pixel[3] > 0) {
            pixels.push({
              x: x,
              y: y,
              r: pixel[0],
              g: pixel[1],
              b: pixel[2],
              a: pixel[3],
            });
          }
        }
      }

      clipboardRef.current = {
        pixels: pixels,
        width: selectionRect.width,
        height: selectionRect.height,
      };
    }
  };

  const handleCut = () => {
    const runtime = runtimeRef.current;
    const layerManager = runtime.getCurrentLayerManager();
    const undoManager = runtime.getCurrentUndoRedoManager();

    if (!layerManager || !undoManager) return;

    // Check if there's an active selection
    if (!runtime.toolController.hasSelection()) {
      return;
    }

    // Get selection manager from tool controller
    const selectionManager = (runtime.toolController as any).selectionManager;
    if (!selectionManager) return;

    // Check if floating pixels exist
    const floatingPixels = selectionManager.getFloatingPixels();

    if (floatingPixels && floatingPixels.length > 0) {
      // Step 1: Copy to clipboard
      handleCopy();

      // Step 2: Begin undo transaction
      undoManager.beginTransaction();

      // Step 3: Permanently remove floating pixels
      selectionManager.discardSelectionNoRestore();

      // Step 4: End undo transaction
      undoManager.endTransaction();

      // Step 5: Clear selection state
      runtime.toolController.clearSelection();

      forceLayersUpdate();
      needsRedrawRef.current = true;
      return;
    }

    // NO FLOATING PIXELS: Copy pixels from layer, clear layer with undo transaction, clear selection

    // Step 1: Copy selected pixels to clipboard
    handleCopy();

    // Step 2: Get selection rectangle and lasso mask
    const selectionRect = selectionManager.getSelectionRect();
    if (!selectionRect) return;

    const activeLayer = layerManager.getActiveLayer();
    if (!activeLayer) return;

    // Get lasso mask if it exists
    const lassoMask = (selectionManager as any).lassoMask;

    // Step 3: Begin undo transaction for cut operation
    undoManager.beginTransaction();

    // Step 4: Clear selected pixels from active layer
    for (let y = 0; y < selectionRect.height; y++) {
      for (let x = 0; x < selectionRect.width; x++) {
        // Respect lasso mask if present
        if (lassoMask && !lassoMask[y]?.[x]) {
          continue;
        }

        const worldX = selectionRect.x + x;
        const worldY = selectionRect.y + y;

        // Clear pixel to transparent
        activeLayer.setPixel(worldX, worldY, 0, 0, 0, 0);
      }
    }

    // Step 5: End undo transaction
    undoManager.endTransaction();

    // Step 6: Clear the selection
    selectionManager.cancelSelection();
    runtime.toolController.clearSelection();

    // Force UI update
    forceLayersUpdate();
    needsRedrawRef.current = true;
  };

  const handlePaste = () => {
    const runtime = runtimeRef.current;
    if (!clipboardRef.current) return;

    const { pixels, width, height } = clipboardRef.current;
    const undoManager = runtime.getCurrentUndoRedoManager();

    // Calculate paste coordinates using mouse position or fallback to canvas center
    let pasteX: number;
    let pasteY: number;

    if (hoverPixelRef.current) {
      // Use mouse position when available
      pasteX = hoverPixelRef.current.x;
      pasteY = hoverPixelRef.current.y;
    } else {
      // Fallback to canvas center
      pasteX = Math.floor((canvasSize.width - width) / 2);
      pasteY = Math.floor((canvasSize.height - height) / 2);
    }

    // Begin undo transaction for paste operation
    if (undoManager) {
      undoManager.beginTransaction();
    }

    // Call pasteFromClipboard with calculated coordinates
    runtime.toolController.pasteFromClipboard(
      pixels,
      width,
      height,
      pasteX,
      pasteY,
    );

    // End undo transaction for paste operation
    if (undoManager) {
      undoManager.endTransaction();
    }

    // Update layers and redraw canvas
    forceLayersUpdate();
    needsRedrawRef.current = true;
  };

  /**
   * Duplicate Selection (Ctrl+D) - creates an offset copy of the current selection
   *
   * Behavior:
   * - Returns early if no active selection exists
   * - Starts a new undo transaction
   * - Uses same logic as handleCopy() to obtain clipboard data
   * - Retrieves selectionRect from selectionManager
   * - Calls pasteFromClipboard with offset coordinates (rect.x + 1, rect.y + 1)
   * - Ends undo transaction for single undo entry
   *
   * Expected result:
   * - Creates a floating, transformable duplicate at offset position
   * - Original selection remains unchanged
   * - Works for rectangle, lasso, and magic selection tools
   * - Produces exactly one undo entry
   */
  const handleDuplicateSelection = () => {
    const runtime = runtimeRef.current;
    const layerManager = runtime.getCurrentLayerManager();
    const undoManager = runtime.getCurrentUndoRedoManager();

    if (!layerManager || !undoManager) return;

    // Step 1: Check if there's an active selection
    if (!runtime.toolController.hasSelection()) {
      return;
    }

    // Step 2: Get selection manager from tool controller
    const selectionManager = (runtime.toolController as any).selectionManager;
    if (!selectionManager) return;

    // Step 3: Begin undo transaction
    undoManager.beginTransaction();

    // Step 4: Copy selection data (same logic as handleCopy)
    const floatingPixels = selectionManager.getFloatingPixels();
    let pixels: Array<{
      x: number;
      y: number;
      r: number;
      g: number;
      b: number;
      a: number;
    }>;
    let width: number;
    let height: number;

    if (floatingPixels && floatingPixels.length > 0) {
      // Copy floating pixels directly
      const floatingRect = selectionManager.getFloatingRect();
      if (!floatingRect) {
        undoManager.endTransaction();
        return;
      }

      // Convert world coordinates to local coordinates
      pixels = floatingPixels.map((p: any) => ({
        x: p.x - floatingRect.x,
        y: p.y - floatingRect.y,
        r: p.r,
        g: p.g,
        b: p.b,
        a: p.a,
      }));

      width = floatingRect.width;
      height = floatingRect.height;
    } else {
      // Extract pixels from layer within selection rectangle
      const selectionRect = selectionManager.getSelectionRect();
      if (!selectionRect) {
        undoManager.endTransaction();
        return;
      }

      const activeLayer = layerManager.getActiveLayer();
      if (!activeLayer) {
        undoManager.endTransaction();
        return;
      }

      pixels = [];

      // Extract pixels within selection bounds
      for (let y = 0; y < selectionRect.height; y++) {
        for (let x = 0; x < selectionRect.width; x++) {
          const worldX = selectionRect.x + x;
          const worldY = selectionRect.y + y;

          const pixel = activeLayer.getPixel(worldX, worldY);
          if (pixel && pixel[3] > 0) {
            pixels.push({
              x: x,
              y: y,
              r: pixel[0],
              g: pixel[1],
              b: pixel[2],
              a: pixel[3],
            });
          }
        }
      }

      width = selectionRect.width;
      height = selectionRect.height;
    }

    // Step 5: Get selection rectangle for offset positioning
    const selectionRect = selectionManager.getSelectionRect();
    if (!selectionRect) {
      undoManager.endTransaction();
      return;
    }

    // Step 6: Paste at offset position (x+1, y+1)
    const pasteX = selectionRect.x + 1;
    const pasteY = selectionRect.y + 1;

    runtime.toolController.pasteFromClipboard(
      pixels,
      width,
      height,
      pasteX,
      pasteY,
    );

    // Step 7: End undo transaction
    undoManager.endTransaction();

    // Step 8: Force UI update
    forceLayersUpdate();
    needsRedrawRef.current = true;
  };

  // Focus Mode toggle
  const toggleFocusMode = () => {
    setFocusModeActive((prev) => !prev);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    // Initialize window.editor if it doesn't exist
    const anyWin = window as any;
    if (!anyWin.editor) {
      anyWin.editor = {};
    }

    // Assign properties directly to window.editor without recreating the object
    anyWin.editor.resize = handleCanvasResize;
    anyWin.editor.camera = camera;
    anyWin.editor.frameManager = runtime.frameManager;

    // CRITICAL: Direct assignment to ToolController instance - no wrapping, no spread, no proxy
    anyWin.editor.tool = runtime.toolController;

    anyWin.editor.resetEditorFromProject = resetEditorFromProject;
    anyWin.editor.toggleGrid = () => {
      setShowGrid((prev) => !prev);
      needsRedrawRef.current = true;
    };
    anyWin.editor.setTool = (tool: string) => {
      runtime.toolController.setTool(tool as any);
      setCurrentTool(tool);
    };
    anyWin.editor.setFontSize = (size: number) => {
      runtime.toolController.setFontSize(size);
    };
    anyWin.editor.undo = () => {
      const undoManager = runtime.getCurrentUndoRedoManager();
      const layerManager = runtime.getCurrentLayerManager();
      if (undoManager && layerManager) {
        undoManager.undo((cmd, pixels) => {
          layerManager.restoreRegion(cmd, pixels);
        });
        needsRedrawRef.current = true;
      }
    };
    anyWin.editor.redo = () => {
      const undoManager = runtime.getCurrentUndoRedoManager();
      const layerManager = runtime.getCurrentLayerManager();
      if (undoManager && layerManager) {
        undoManager.redo((cmd, pixels) => {
          layerManager.restoreRegion(cmd, pixels);
        });
        needsRedrawRef.current = true;
      }
    };
    anyWin.editor.refresh = () => {
      forceLayersUpdate();
      needsRedrawRef.current = true;
    };
    anyWin.editor.toggleOnionPrev = () => {
      setOnionPrev((prev) => !prev);
      needsRedrawRef.current = true;
    };
    anyWin.editor.toggleOnionNext = () => {
      setOnionNext((prev) => !prev);
      needsRedrawRef.current = true;
    };
    anyWin.editor.setOnionStrength = (value: number) => {
      setOnionStrength(Math.max(0, Math.min(1, value)));
      needsRedrawRef.current = true;
    };

    if (!anyWin.editor.ui) {
      anyWin.editor.ui = {};
    }
    anyWin.editor.ui.openCanvasSizeDialog = () => setCanvasSizeDialogOpen(true);
    anyWin.editor.ui.openExportDialog = () => setShowExportDialog(true);
    anyWin.editor.ui.openImportDialog = (file: File) => handleImportPNG(file);
    anyWin.editor.ui.toggleFocusMode = toggleFocusMode;

    if (!anyWin.editor.clipboard) {
      anyWin.editor.clipboard = {};
    }
    anyWin.editor.clipboard.copy = handleCopy;
    anyWin.editor.clipboard.cut = handleCut;
    anyWin.editor.clipboard.paste = handlePaste;
    anyWin.editor.clipboard.hasData = () => clipboardRef.current !== null;
    anyWin.editor.getActiveRuntime = () => runtimeRef.current;

    if (!anyWin.editor.selection) {
      anyWin.editor.selection = {};
    }
    anyWin.editor.selection.deleteSelection = deleteSelection;
    anyWin.editor.selection.handleDuplicateSelection = handleDuplicateSelection;

    if (!anyWin.editor.export) {
      anyWin.editor.export = {};
    }
    anyWin.editor.export.pngCurrent = async (
      scale?: number,
      background?: "transparent" | "solid",
      backgroundColor?: string,
    ): Promise<Blob> => {
      const layerManager = runtime.getCurrentLayerManager();
      if (!layerManager) {
        throw new Error("Editor not initialized");
      }
      const validScale = scale && scale >= 1 ? Math.floor(scale) : 1;
      const compositeBuffer = layerManager.getCompositeBuffer();
      const width = runtime.canvasWidth;
      const height = runtime.canvasHeight;

      const baseCanvas = document.createElement("canvas");
      baseCanvas.width = width;
      baseCanvas.height = height;
      const ctx = baseCanvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get 2D context");

      if (background === "solid") {
        ctx.fillStyle = backgroundColor || "#000000";
        ctx.fillRect(0, 0, width, height);
      }

      const imageData = new ImageData(
        new Uint8ClampedArray(compositeBuffer),
        width,
        height,
      );
      ctx.putImageData(imageData, 0, 0);

      let finalCanvas = baseCanvas;
      if (validScale > 1) {
        const scaledCanvas = document.createElement("canvas");
        scaledCanvas.width = width * validScale;
        scaledCanvas.height = height * validScale;
        const scaledCtx = scaledCanvas.getContext("2d");
        if (!scaledCtx) throw new Error("Failed to get scaled 2D context");
        scaledCtx.imageSmoothingEnabled = false;
        scaledCtx.drawImage(
          baseCanvas,
          0,
          0,
          width,
          height,
          0,
          0,
          scaledCanvas.width,
          scaledCanvas.height,
        );
        finalCanvas = scaledCanvas;
      }

      return new Promise((resolve, reject) => {
        finalCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create blob"));
        }, "image/png");
      });
    };

    anyWin.editor.export.pngSequence = async (
      scale?: number,
    ): Promise<Array<{ blob: Blob; frameIndex: number }>> => {
      const validScale = scale && scale >= 1 ? Math.floor(scale) : 1;
      const frames = runtime.frameManager.getFrames();
      const width = runtime.canvasWidth;
      const height = runtime.canvasHeight;
      const results: Array<{ blob: Blob; frameIndex: number }> = [];

      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const compositeBuffer = frame.layerManager.getCompositeBuffer();

        const baseCanvas = document.createElement("canvas");
        baseCanvas.width = width;
        baseCanvas.height = height;
        const ctx = baseCanvas.getContext("2d");
        if (!ctx) throw new Error("Failed to get 2D context");

        const imageData = new ImageData(
          new Uint8ClampedArray(compositeBuffer),
          width,
          height,
        );
        ctx.putImageData(imageData, 0, 0);

        let finalCanvas = baseCanvas;
        if (validScale > 1) {
          const scaledCanvas = document.createElement("canvas");
          scaledCanvas.width = width * validScale;
          scaledCanvas.height = height * validScale;
          const scaledCtx = scaledCanvas.getContext("2d");
          if (!scaledCtx) throw new Error("Failed to get scaled 2D context");
          scaledCtx.imageSmoothingEnabled = false;
          scaledCtx.drawImage(
            baseCanvas,
            0,
            0,
            width,
            height,
            0,
            0,
            scaledCanvas.width,
            scaledCanvas.height,
          );
          finalCanvas = scaledCanvas;
        }

        const blob = await new Promise<Blob>((resolve, reject) => {
          finalCanvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to create blob"));
          }, "image/png");
        });

        results.push({ blob, frameIndex: i });
      }

      return results;
    };

    anyWin.editor.export.spriteSheet = async (
      layout: "horizontal" | "vertical" | "grid",
      options?: {
        scale?: number;
        includeFrameSeparators?: boolean;
        separatorSize?: number;
        separatorColor?: string;
        background?: "transparent" | "solid";
        backgroundColor?: string;
      },
    ): Promise<{ blob: Blob; width: number; height: number }> => {
      const validScale =
        options?.scale && options.scale >= 1 ? Math.floor(options.scale) : 1;
      const frames = runtime.frameManager.getFrames();
      const frameWidth = runtime.canvasWidth;
      const frameHeight = runtime.canvasHeight;

      const sep = options?.includeFrameSeparators
        ? options.separatorSize || 1
        : 0;

      let sheetWidth: number;
      let sheetHeight: number;
      let cols: number;
      let rows: number;

      if (layout === "horizontal") {
        sheetWidth = frameWidth * frames.length + sep * (frames.length - 1);
        sheetHeight = frameHeight;
        cols = frames.length;
        rows = 1;
      } else if (layout === "vertical") {
        sheetWidth = frameWidth;
        sheetHeight = frameHeight * frames.length + sep * (frames.length - 1);
        cols = 1;
        rows = frames.length;
      } else {
        cols = Math.ceil(Math.sqrt(frames.length));
        rows = Math.ceil(frames.length / cols);
        sheetWidth = frameWidth * cols + sep * (cols - 1);
        sheetHeight = frameHeight * rows + sep * (rows - 1);
      }

      const baseCanvas = document.createElement("canvas");
      baseCanvas.width = sheetWidth;
      baseCanvas.height = sheetHeight;
      const ctx = baseCanvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get 2D context");

      if (options?.background === "solid") {
        ctx.fillStyle = options.backgroundColor || "#000000";
        ctx.fillRect(0, 0, sheetWidth, sheetHeight);
      }

      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const compositeBuffer = frame.layerManager.getCompositeBuffer();

        const frameCanvas = document.createElement("canvas");
        frameCanvas.width = frameWidth;
        frameCanvas.height = frameHeight;
        const frameCtx = frameCanvas.getContext("2d");
        if (!frameCtx) throw new Error("Failed to get frame 2D context");

        const imageData = new ImageData(
          new Uint8ClampedArray(compositeBuffer),
          frameWidth,
          frameHeight,
        );
        frameCtx.putImageData(imageData, 0, 0);

        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * (frameWidth + sep);
        const y = row * (frameHeight + sep);

        ctx.drawImage(frameCanvas, x, y);
      }

      if (options?.includeFrameSeparators && sep > 0) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = options.separatorColor || "#000000";

        if (layout === "horizontal") {
          for (let i = 1; i < frames.length; i++) {
            const x = i * frameWidth + (i - 1) * sep + frameWidth;
            ctx.fillRect(x, 0, sep, sheetHeight);
          }
        } else if (layout === "vertical") {
          for (let i = 1; i < frames.length; i++) {
            const y = i * frameHeight + (i - 1) * sep + frameHeight;
            ctx.fillRect(0, y, sheetWidth, sep);
          }
        } else {
          for (let c = 1; c < cols; c++) {
            const x = c * frameWidth + (c - 1) * sep + frameWidth;
            ctx.fillRect(x, 0, sep, sheetHeight);
          }

          for (let r = 1; r < rows; r++) {
            const y = r * frameHeight + (r - 1) * sep + frameHeight;
            ctx.fillRect(0, y, sheetWidth, sep);
          }
        }

        ctx.restore();
      }

      let finalCanvas = baseCanvas;
      if (validScale > 1) {
        const scaledCanvas = document.createElement("canvas");
        scaledCanvas.width = sheetWidth * validScale;
        scaledCanvas.height = sheetHeight * validScale;
        const scaledCtx = scaledCanvas.getContext("2d");
        if (!scaledCtx) throw new Error("Failed to get scaled 2D context");
        scaledCtx.imageSmoothingEnabled = false;
        scaledCtx.drawImage(
          baseCanvas,
          0,
          0,
          sheetWidth,
          sheetHeight,
          0,
          0,
          scaledCanvas.width,
          scaledCanvas.height,
        );
        finalCanvas = scaledCanvas;
      }

      const blob = await new Promise<Blob>((resolve, reject) => {
        finalCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create blob"));
        }, "image/png");
      });

      return { blob, width: finalCanvas.width, height: finalCanvas.height };
    };

    anyWin.editor.export.webm = async (
      fps = 30,
      transparency = false,
      scale?: number,
    ): Promise<Blob> => {
      const validScale = scale && scale >= 1 ? Math.floor(scale) : 1;
      const frames = runtime.frameManager.getFrames();
      const width = runtime.canvasWidth;
      const height = runtime.canvasHeight;

      const recordCanvas = document.createElement("canvas");
      recordCanvas.width = width * validScale;
      recordCanvas.height = height * validScale;
      const recordCtx = recordCanvas.getContext("2d");
      if (!recordCtx) throw new Error("Failed to get 2D context for recording");

      recordCtx.imageSmoothingEnabled = false;

      const stream = recordCanvas.captureStream();
      const mimeType = transparency
        ? "video/webm;codecs=vp9"
        : "video/webm;codecs=vp8";
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.start();

      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const compositeBuffer = frame.layerManager.getCompositeBuffer();

        const baseCanvas = document.createElement("canvas");
        baseCanvas.width = width;
        baseCanvas.height = height;
        const ctx = baseCanvas.getContext("2d");
        if (!ctx) throw new Error("Failed to get frame 2D context");

        const imageData = new ImageData(
          new Uint8ClampedArray(compositeBuffer),
          width,
          height,
        );
        ctx.putImageData(imageData, 0, 0);

        recordCtx.clearRect(0, 0, recordCanvas.width, recordCanvas.height);
        recordCtx.drawImage(
          baseCanvas,
          0,
          0,
          width,
          height,
          0,
          0,
          recordCanvas.width,
          recordCanvas.height,
        );

        const frameDuration = frame.duration || 1000 / fps;
        await new Promise((resolve) => setTimeout(resolve, frameDuration));
      }

      return new Promise((resolve, reject) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob);
        };
        mediaRecorder.onerror = () => {
          reject(new Error("MediaRecorder error"));
        };
        mediaRecorder.stop();
      });
    };

    anyWin.editor.export.importPNG = async (
      file: File,
    ): Promise<{ width: number; height: number; data: Uint8ClampedArray }> => {
      const bitmap = await createImageBitmap(file);

      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get 2D context for import");
      }

      ctx.drawImage(bitmap, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      return {
        width: canvas.width,
        height: canvas.height,
        data: imageData.data,
      };
    };

    anyWin.editor.currentProjectId = runtime.currentProjectId;
    anyWin.editor.getCurrentProjectId = () =>
      runtimeRef.current?.currentProjectId ?? null;
    anyWin.editor.currentProjectName = runtime.currentProjectName;
    anyWin.editor.setCurrentProjectId = (id: string | null) => {
      runtime.setCurrentProject(id, runtime.currentProjectName);
      anyWin.editor.currentProjectId = id;
    };
    anyWin.editor.setCurrentProjectName = (name: string | null) => {
      runtime.setCurrentProject(runtime.currentProjectId, name);
      anyWin.editor.currentProjectName = name;
    };
    anyWin.editor.markTabClean = () => {
      setTabs((prev) =>
        prev.map((t, i) =>
          i === activeTabIndex ? { ...t, isDirty: false } : t,
        ),
      );
    };
    anyWin.editor.setActiveTabName = (name: string) => {
      setTabName(name);
      setTabs((prev) =>
        prev.map((t, i) => (i === activeTabIndex ? { ...t, name } : t)),
      );
    };

    // Multi-tab APIs for project save/load
    anyWin.editor.getAllTabsData = () =>
      tabsRef.current.map((t) => ({
        name: t.name,
        frameManager: t.runtime.frameManager,
      }));

    anyWin.editor.addTab = handleTabAdd;

    anyWin.editor.setPendingTabRestore = (
      project: SerializedProject,
      name: string,
      projectId: string | null,
    ) => {
      setPendingTabRestoreState({ project, name, projectId });
    };

    needsRedrawRef.current = true;
  }, [camera, activeTabIndex]);

  useEffect(() => {
    if ((window as any).editor) {
      (window as any).editor.camera = camera;
    }
  }, [camera]);

  // Handle pending tab restore for multi-tab project loading
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional - stable callbacks via refs
  useEffect(() => {
    if (!pendingTabRestore) return;
    if (tabsRef.current.length >= 2 && activeTabIndex !== 1) {
      handleTabSwitch(1);
    } else if (tabsRef.current.length >= 2 && activeTabIndex === 1) {
      resetEditorFromProject(pendingTabRestore.project);
      // Set the project ID on Tab 2's runtime so Save overrides correctly
      if (pendingTabRestore.projectId && runtimeRef.current) {
        runtimeRef.current.setCurrentProject(
          pendingTabRestore.projectId,
          pendingTabRestore.name,
        );
      }
      setTabName(pendingTabRestore.name);
      setTabs((prev) =>
        prev.map((t, i) =>
          i === 1 ? { ...t, name: pendingTabRestore.name, isDirty: false } : t,
        ),
      );
      setPendingTabRestoreState(null);
      // Switch back to tab 0 so user lands on first canvas
      handleTabSwitch(0);
    }
  }, [pendingTabRestore, activeTabIndex]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setTabs((prev) =>
      prev.map((t, i) => (i === activeTabIndex ? { ...t, isDirty: true } : t)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layersVersion, framesVersion]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    needsRedrawRef.current = true;
  }, [layersVersion, framesVersion]);

  // Helper to check if typing in input field or contentEditable element
  const isTypingInInput = (target: HTMLElement): boolean => {
    return (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable
    );
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const runtime = runtimeRef.current;

      const target = e.target as HTMLElement;
      const isInputField = isTypingInInput(target);

      // Global hotkey guard: prevent editor hotkeys when focus is inside input fields
      if (isInputField) {
        return;
      }

      // TEXT TOOL KEYBOARD ROUTING SAFEGUARD
      // If text tool is active with a text buffer, fully own keyboard input
      if (runtime.toolController.isTextActive()) {
        // Stop propagation and prevent default to block all shortcuts
        e.stopPropagation();
        e.preventDefault();

        // Handle text-specific keys
        if (e.key === "Escape") {
          // Cancel text
          runtime.toolController.cancelText();

          // Force layers update
          forceLayersUpdate();

          // Sync activeLayerId from current layer manager
          const layerManager = runtime.getCurrentLayerManager();
          setActiveLayerId(
            layerManager ? layerManager.getActiveLayerId() : null,
          );

          // Set needsRedrawRef
          needsRedrawRef.current = true;
          return;
        }

        if (e.key === "Enter") {
          // Commit text
          runtime.toolController.commitText();

          // Force layers update
          forceLayersUpdate();

          // Sync activeLayerId from current layer manager
          const layerManager = runtime.getCurrentLayerManager();
          setActiveLayerId(
            layerManager ? layerManager.getActiveLayerId() : null,
          );

          // Set needsRedrawRef
          needsRedrawRef.current = true;
          return;
        }

        if (e.key === "Backspace") {
          runtime.toolController.backspaceText();
          needsRedrawRef.current = true;
          return;
        }

        // Printable character keys (no ctrl/meta/alt modifiers)
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          runtime.toolController.appendText(e.key);
          needsRedrawRef.current = true;
          return;
        }

        // All other keys are ignored during text editing
        return;
      }

      // KEYBOARD PRECEDENCE: Check for active selection first
      const hasSelection = runtime.toolController.hasSelection();

      if (hasSelection) {
        // Selection action precedence: Delete/Backspace only
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          deleteSelection();
          return;
        }

        // G and O keys removed - no longer trigger selection actions
        // Allow other selection-related keys like Enter, Escape, R to pass through
      }

      // Tool keyboard shortcuts (no modifiers, not in input fields, no active selection)
      if (
        !hasSelection &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !e.shiftKey
      ) {
        const toolMap: Record<string, string> = {
          p: "pencil",
          P: "pencil",
          e: "eraser",
          E: "eraser",
          b: "brush",
          B: "brush",
          s: "select",
          S: "select",
          t: "text",
          T: "text",
          g: "fill",
          G: "fill",
          i: "eyedropper",
          I: "eyedropper",
          o: "outline",
          O: "outline",
          m: "magic",
          M: "magic",
          l: "lasso",
          L: "lasso",
        };

        const toolName = toolMap[e.key];
        if (toolName) {
          e.preventDefault();
          runtime.toolController.setTool(toolName as any);
          setCurrentTool(toolName);
          return;
        }
      }

      if (runtime.toolController) {
        if (hasSelection && e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();

          // Begin undo transaction for transform commit
          const undoManager = runtime.getCurrentUndoRedoManager();
          if (undoManager) {
            undoManager.beginTransaction();
          }

          runtime.toolController.handleSelectionKey("Enter");

          // End undo transaction for transform commit
          if (undoManager) {
            undoManager.endTransaction();
          }

          needsRedrawRef.current = true;
          return;
        }

        if (hasSelection && e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          runtime.toolController.handleSelectionKey("Escape");
          needsRedrawRef.current = true;
          return;
        }

        if (hasSelection && (e.key === "r" || e.key === "R")) {
          e.preventDefault();
          e.stopPropagation();
          runtime.toolController.handleSelectionKey("R_down");
          needsRedrawRef.current = true;
          return;
        }
      }

      // Focus Mode toggle (F key)
      if (
        (e.key === "f" || e.key === "F") &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        e.preventDefault();
        toggleFocusMode();
        return;
      }

      // Exit Focus Mode (Esc key)
      if (e.key === "Escape" && focusModeActive) {
        e.preventDefault();
        setFocusModeActive(false);
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        setIsSpacePressed(true);
      }

      // Undo (Ctrl+Z)
      if (
        (e.key === "z" || e.key === "Z") &&
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey
      ) {
        e.preventDefault();

        // Perform undo without canceling floating selection
        const undoManager = runtime.getCurrentUndoRedoManager();
        const layerManager = runtime.getCurrentLayerManager();
        if (undoManager && layerManager) {
          undoManager.undo((cmd, pixels) => {
            layerManager.restoreRegion(cmd, pixels);
          });
          needsRedrawRef.current = true;
        }
      }

      // Redo (Ctrl+Shift+Z)
      if (
        (e.key === "z" || e.key === "Z") &&
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey
      ) {
        e.preventDefault();
        const undoManager = runtime.getCurrentUndoRedoManager();
        const layerManager = runtime.getCurrentLayerManager();
        if (undoManager && layerManager) {
          undoManager.redo((cmd, pixels) => {
            layerManager.restoreRegion(cmd, pixels);
          });
          needsRedrawRef.current = true;
        }
      }

      // Cut (Ctrl+X)
      if ((e.key === "x" || e.key === "X") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleCut();
      }

      // Copy (Ctrl+C)
      if ((e.key === "c" || e.key === "C") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleCopy();
      }

      // Paste (Ctrl+V)
      if ((e.key === "v" || e.key === "V") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handlePaste();
      }

      // Duplicate Selection (Ctrl+D)
      if ((e.key === "d" || e.key === "D") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleDuplicateSelection();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        setIsSpacePressed(false);
        setIsPanning(false);
      }

      if (runtime.toolController && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        e.stopPropagation();
        runtime.toolController.handleSelectionKey("R_up");
        needsRedrawRef.current = true;
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [focusModeActive]);

  const handleCanvasReady = (_ctx: CanvasRenderingContext2D) => {
    needsRedrawRef.current = true;
  };

  const mapPointerToPixel = (e: PointerEvent) => {
    const canvas = canvasRef.current?.getCanvasElement();
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = mouseX / camera.zoom;
    const worldY = mouseY / camera.zoom;

    return { x: Math.floor(worldX), y: Math.floor(worldY) };
  };

  const handleCanvasPointerDown = (e: PointerEvent) => {
    const canvas = canvasRef.current?.getCanvasElement();
    if (!canvas) return;

    const isPanningMode = isSpacePressed || e.button === 1;

    if (isPanningMode) {
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        offsetX: camera.offsetX,
        offsetY: camera.offsetY,
      };
      return;
    }

    const coord = mapPointerToPixel(e);
    if (!coord) return;

    // Call pointerDown with only x and y coordinates (modifier keys not supported in original ToolController)
    runtime.toolController.pointerDown(coord.x, coord.y);
    needsRedrawRef.current = true;
  };

  const handleCanvasPointerMove = (e: PointerEvent) => {
    if (isPanning && panStartRef.current) {
      const deltaX = e.clientX - panStartRef.current.x;
      const deltaY = e.clientY - panStartRef.current.y;

      setCamera({
        ...camera,
        offsetX: panStartRef.current.offsetX + deltaX,
        offsetY: panStartRef.current.offsetY + deltaY,
      });
      return;
    }

    const coord = mapPointerToPixel(e);
    if (!coord) return;

    hoverPixelRef.current = coord;

    if ((window as any).editor?.tool?.brushSize !== undefined) {
      const currentBrushSize = (window as any).editor.tool.brushSize;
      if (currentBrushSize !== brushSize) {
        setBrushSize(currentBrushSize);
      }
    }

    runtime.toolController.pointerMove(
      e,
      coord.x,
      coord.y,
      e.shiftKey,
      e.altKey,
      e.ctrlKey,
      e.metaKey,
    );
    needsRedrawRef.current = true;
  };

  const handleCanvasPointerUp = (e: PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
      return;
    }

    const coord = mapPointerToPixel(e);
    if (!coord) return;

    // Call pointerUp with only x and y coordinates (modifier keys not supported in original ToolController)
    runtime.toolController.pointerUp(coord.x, coord.y);
    needsRedrawRef.current = true;
  };

  const handleCanvasResize = (width: number, height: number) => {
    // Resize the FrameManager
    runtime.frameManager.resizeCanvas(width, height);

    // Update runtime canvas size
    runtime.setCanvasSize(width, height);

    // Get the updated LayerManager from the current frame
    const layerManager = runtime.getCurrentLayerManager();

    // Reset the UndoRedoManager
    const undoManager = runtime.getCurrentUndoRedoManager();
    undoManager.reset();

    // Reattach the UndoRedoManager to the LayerManager
    layerManager.attachUndoManager(undoManager);

    // Reattach to ToolController
    runtime.toolController.setLayerManager(layerManager);
    runtime.toolController.attachUndoManager(undoManager);
    runtime.toolController.setColor(255, 255, 255, 255);

    // Update canvas size state
    setCanvasSize({ width, height });

    needsRedrawRef.current = true;
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    const container = canvasContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - camera.offsetX) / camera.zoom;
    const worldY = (mouseY - camera.offsetY) / camera.zoom;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(32, Math.max(0.25, camera.zoom * zoomFactor));

    const newOffsetX = mouseX - worldX * newZoom;
    const newOffsetY = mouseY - worldY * newZoom;

    setCamera({
      zoom: newZoom,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
    });
  };

  const handleLayersChange = () => {
    forceLayersUpdate();
    const layerManager = runtime.getCurrentLayerManager();
    if (layerManager) {
      const currentActiveId = layerManager.getActiveLayerId();
      setActiveLayerId(currentActiveId);
    }
    needsRedrawRef.current = true;
  };

  const handleSelectLayer = (index: number | null) => {
    if (index === null) return;

    const layerManager = runtime.getCurrentLayerManager();
    if (!layerManager) return;

    const flatNodes = layerManager.flatten();
    if (index >= 0 && index < flatNodes.length) {
      const layerId = flatNodes[index].id;
      layerManager.setActiveLayer(layerId);
      setActiveLayerId(layerId);
      forceLayersUpdate();
      needsRedrawRef.current = true;
    }
  };

  function getActiveLayerIndex(): number {
    const layerManager = runtime.getCurrentLayerManager();
    if (!layerManager || !activeLayerId) return 0;
    const flatNodes = layerManager.flatten();
    const index = flatNodes.findIndex((node: any) => node.id === activeLayerId);
    return index >= 0 ? index : 0;
  }

  const handleFrameChange = (index: number) => {
    // Switch to frame using runtime
    const success = runtime.switchToFrame(index);
    if (!success) return;

    // Update local state
    setActiveFrameIndexState(index);

    // Update active layer ID
    const layerManager = runtime.getCurrentLayerManager();
    const currentActiveId = layerManager.getActiveLayerId();
    setActiveLayerId(currentActiveId);

    // Force UI updates
    setLayersVersion((v) => v + 1);
    needsRedrawRef.current = true;
  };

  const handleAddFrame = () => {
    runtime.frameManager.addFrame();
    forceFramesUpdate();
    const newIndex = runtime.frameManager.getFrameCount() - 1;
    handleFrameChange(newIndex);
  };

  const handleDeleteFrame = (index: number) => {
    const frameIds = runtime.frameManager.getFrameIds();
    if (frameIds.length <= 1) return;
    const frameId = frameIds[index];
    runtime.frameManager.deleteFrame(frameId);
    forceFramesUpdate();
    const newIndex = runtime.frameManager.getCurrentFrameIndex();
    handleFrameChange(newIndex);
  };

  const handleDuplicateFrame = (index: number) => {
    const frameIds = runtime.frameManager.getFrameIds();
    const frameId = frameIds[index];
    runtime.frameManager.duplicateFrame(frameId);
    forceFramesUpdate();
    const newIndex = index + 1;
    handleFrameChange(newIndex);
  };

  const handleFramesChange = () => {
    forceFramesUpdate();
  };

  const handleTogglePrev = () => {
    setOnionPrev((prev) => !prev);
    needsRedrawRef.current = true;
  };

  const handleToggleNext = () => {
    setOnionNext((prev) => !prev);
    needsRedrawRef.current = true;
  };

  const handleStrengthChange = (value: number) => {
    setOnionStrength(value);
    needsRedrawRef.current = true;
  };

  const playAnimation = () => {
    if (isPlaying) return;

    setIsPlaying(true);
    setOnionPrev(false);
    setOnionNext(false);

    const tick = () => {
      const currentIndex = runtime.frameManager.getCurrentFrameIndex();
      const frameCount = runtime.frameManager.getFrameCount();
      const duration = runtime.frameManager.getFrameDuration(currentIndex);

      playbackIntervalRef.current = window.setTimeout(() => {
        let nextIndex = currentIndex + 1;
        if (nextIndex >= frameCount) {
          if (loop) {
            nextIndex = 0;
          } else {
            stopAnimation();
            return;
          }
        }

        handleFrameChange(nextIndex);
        forceFramesUpdate();
        needsRedrawRef.current = true;

        tick();
      }, duration);
    };

    tick();
  };

  const stopAnimation = () => {
    if (playbackIntervalRef.current !== null) {
      clearTimeout(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
    setIsPlaying(false);
    setOnionPrev(true);
    setOnionNext(true);
  };

  const handleToggleLoop = () => {
    setLoop((prev) => !prev);
  };

  const handleToggleMirrorX = () => {
    setMirrorX((prev) => {
      const newValue = !prev;
      runtime.toolController.setMirrorX(newValue);
      return newValue;
    });
  };

  const handleToggleMirrorY = () => {
    setMirrorY((prev) => {
      const newValue = !prev;
      runtime.toolController.setMirrorY(newValue);
      return newValue;
    });
  };

  const handleTogglePixelPerfect = () => {
    setPixelPerfect((prev) => {
      const newValue = !prev;
      runtime.toolController.setPixelPerfect(newValue);
      return newValue;
    });
  };

  const handleToggleDither = () => {
    setDither((prev) => {
      const newValue = !prev;
      runtime.toolController.setDither(newValue);
      return newValue;
    });
  };

  const handleToggleGrid = () => {
    setShowGrid((prev) => !prev);
    needsRedrawRef.current = true;
  };

  const handleTogglePixelGrid = () => {
    setShowPixelGrid((prev) => !prev);
  };

  const handleToggleTileGrid = () => {
    setShowTileGrid((prev) => !prev);
  };

  const handleTileSizeChange = (value: number) => {
    setTileSize(value);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [camera]);

  const handleCanvasSizeConfirm = (
    newWidth: number,
    newHeight: number,
    applyToAll: boolean,
  ) => {
    // If applyToAll, resize all tabs (inactive ones just need data resize)
    if (applyToAll && tabs.length > 1) {
      tabs.forEach((tab, idx) => {
        if (idx !== activeTabIndex) {
          tab.runtime.frameManager.resizeCanvas(newWidth, newHeight);
          tab.runtime.setCanvasSize(newWidth, newHeight);
        }
      });
      setTabs((prev) =>
        prev.map((tab) => ({
          ...tab,
          canvasSize: { width: newWidth, height: newHeight },
        })),
      );
    }

    // Resize using runtime
    runtime.frameManager.resizeCanvas(newWidth, newHeight);
    runtime.setCanvasSize(newWidth, newHeight);

    const layerManager = runtime.getCurrentLayerManager();
    const undoManager = runtime.getCurrentUndoRedoManager();

    // Resize actual canvas element
    const canvas = canvasRef.current?.getCanvasElement();
    if (canvas) {
      canvas.width = newWidth;
      canvas.height = newHeight;
    }

    // Reattach managers
    layerManager.attachUndoManager(undoManager);
    runtime.toolController.setLayerManager(layerManager);
    runtime.toolController.attachUndoManager(undoManager);
    runtime.toolController.setColor(255, 255, 255, 255);

    // Update canvas size state
    setCanvasSize({ width: newWidth, height: newHeight });

    // Recenter canvas
    const container = canvasContainerRef.current;
    if (container) {
      requestAnimationFrame(() => {
        if (!container) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        const targetZoom = Math.min(
          (containerWidth * 0.6) / newWidth,
          (containerHeight * 0.6) / newHeight,
        );

        setCamera({
          zoom: targetZoom,
          offsetX: (containerWidth - newWidth * targetZoom) / 2,
          offsetY: (containerHeight - newWidth * targetZoom) / 2,
        });
      });
    }

    forceLayersUpdate();
    needsRedrawRef.current = true;
    setCanvasSizeDialogOpen(false);
  };

  const handleImportContinue = (options: ImportOptions) => {
    if (!pendingImportData) return;

    const layerManager = runtime.getCurrentLayerManager();
    if (!layerManager) return;

    const canvasW = canvasSize.width;
    const canvasH = canvasSize.height;
    const imgW = pendingImportData.width;
    const imgH = pendingImportData.height;

    let scaleX = 1;
    let scaleY = 1;

    if (options.trueSize) {
      scaleX = 1;
      scaleY = 1;
    } else if (options.fitToCanvas) {
      const fitScaleX = canvasW / imgW;
      const fitScaleY = canvasH / imgH;
      const fitScale = Math.min(fitScaleX, fitScaleY, 1);
      scaleX = fitScale;
      scaleY = fitScale;
    } else if (options.downscaleIfNeeded) {
      if (imgW > canvasW || imgH > canvasH) {
        const fitScaleX = canvasW / imgW;
        const fitScaleY = canvasH / imgH;
        const fitScale = Math.min(fitScaleX, fitScaleY);
        scaleX = fitScale;
        scaleY = fitScale;
      } else {
        scaleX = 1;
        scaleY = 1;
      }
    }

    scaleX *= options.initialScale;
    scaleY *= options.initialScale;

    const finalWidth = Math.ceil(imgW * scaleX);
    const finalHeight = Math.ceil(imgH * scaleY);

    const canvas = document.createElement("canvas");
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      pendingImportData.bitmap,
      0,
      0,
      imgW,
      imgH,
      0,
      0,
      finalWidth,
      finalHeight,
    );

    const finalImageData = ctx.getImageData(0, 0, finalWidth, finalHeight);

    if (options.importAsReference) {
      layerManager.importReferenceImage(finalImageData, "Imported Image");

      setShowImportDialog(false);
      setPendingImportData(null);

      forceLayersUpdate();
      needsRedrawRef.current = true;
    } else {
      layerManager.importImageCentered(finalImageData, "Imported Image");

      forceLayersUpdate();
      needsRedrawRef.current = true;

      setShowImportDialog(false);
      setPendingImportData(null);
    }
  };

  const handleImportDialogCancel = () => {
    setShowImportDialog(false);
    setPendingImportData(null);
  };

  const handleOpenSpritesheetDialog = () => {
    setShowImportDialog(false);
    setShowSpritesheetDialog(true);
  };

  const handleSpritesheetConfirm = async (
    tileWidth: number,
    tileHeight: number,
  ) => {
    if (!pendingImportData) return;

    try {
      // Import spritesheet using the utility
      const frameCount = await importSpritesheet(
        pendingImportData.bitmap,
        tileWidth,
        tileHeight,
        runtime.frameManager,
      );

      console.log(
        `Successfully imported ${frameCount} frames from spritesheet`,
      );

      // Update canvas size to match tile dimensions
      setCanvasSize({ width: tileWidth, height: tileHeight });

      // Update runtime canvas size
      runtime.setCanvasSize(tileWidth, tileHeight);

      // Resize actual canvas element
      const canvas = canvasRef.current?.getCanvasElement();
      if (canvas) {
        canvas.width = tileWidth;
        canvas.height = tileHeight;
      }

      // Update active layer ID
      const layerManager = runtime.getCurrentLayerManager();
      const currentActiveId = layerManager.getActiveLayerId();
      setActiveLayerId(currentActiveId);

      // Force UI updates
      forceLayersUpdate();
      forceFramesUpdate();
      needsRedrawRef.current = true;

      // Recenter camera
      const container = canvasContainerRef.current;
      if (container) {
        requestAnimationFrame(() => {
          if (!container) return;

          const containerWidth = container.clientWidth;
          const containerHeight = container.clientHeight;

          const targetZoom = Math.min(
            (containerWidth * 0.6) / tileWidth,
            (containerHeight * 0.6) / tileHeight,
          );

          setCamera({
            zoom: targetZoom,
            offsetX: (containerWidth - tileWidth * targetZoom) / 2,
            offsetY: (containerHeight - tileHeight * targetZoom) / 2,
          });
        });
      }

      // Close dialogs and clear pending data
      setShowSpritesheetDialog(false);
      setPendingImportData(null);
    } catch (error) {
      console.error("Failed to import spritesheet:", error);
      // Keep dialog open on error
    }
  };

  const handleSpritesheetCancel = () => {
    setShowSpritesheetDialog(false);
    // Return to import dialog
    setShowImportDialog(true);
  };

  const handleExport = async (options: ExportOptions) => {
    try {
      const layerManager = runtime.getCurrentLayerManager();
      if (!layerManager) {
        console.error("Export failed: Editor not initialized");
        return;
      }

      const normalizedBackground: "transparent" | "solid" =
        options.background === "solid" ? "solid" : "transparent";

      const backgroundColor =
        normalizedBackground === "solid" ? options.backgroundColor : undefined;

      if (options.format === "png") {
        await exportCurrentFramePNG(
          layerManager,
          canvasSize.width,
          canvasSize.height,
          {
            scale: options.scale,
            background: normalizedBackground,
            backgroundColor: backgroundColor,
          },
        );
      } else if (options.format === "png-sequence") {
        await exportPNGSequence(runtime.frameManager, {
          scale: options.scale,
          background: normalizedBackground,
          backgroundColor: backgroundColor,
        });
      } else if (options.format === "spritesheet") {
        await exportSpriteSheet(
          runtime.frameManager,
          options.layout || "horizontal",
          {
            scale: options.scale,
            background: normalizedBackground,
            backgroundColor: backgroundColor,
          },
        );
      } else if (options.format === "webm") {
        const webmTransparency = normalizedBackground === "transparent";

        await exportWebM(runtime.frameManager, {
          scale: options.scale,
          fps: options.fps || 12,
          transparency: webmTransparency,
          backgroundColor: backgroundColor,
        });
      }
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header />

      <div className="flex flex-1 overflow-hidden min-h-0">
        {!focusModeActive && <ToolPanel />}

        <div className="flex flex-1 flex-col min-h-0 min-w-0">
          {!focusModeActive && (
            <ToolOptionsBar
              mirrorX={mirrorX}
              mirrorY={mirrorY}
              pixelPerfect={pixelPerfect}
              dither={dither}
              showGrid={showGrid}
              showPixelGrid={showPixelGrid}
              showTileGrid={showTileGrid}
              tileSize={tileSize}
              onToggleMirrorX={handleToggleMirrorX}
              onToggleMirrorY={handleToggleMirrorY}
              onTogglePixelPerfect={handleTogglePixelPerfect}
              onToggleDither={handleToggleDither}
              onToggleGrid={handleToggleGrid}
              onTogglePixelGrid={handleTogglePixelGrid}
              onToggleTileGrid={handleToggleTileGrid}
              onTileSizeChange={handleTileSizeChange}
            />
          )}

          <TabBar
            tabs={tabs.map((t, i) => ({
              ...t,
              name: i === activeTabIndex ? tabName : t.name,
            }))}
            activeIndex={activeTabIndex}
            onTabChange={handleTabSwitch}
            onRename={(_, name) => setTabName(name)}
            onAdd={handleTabAdd}
            onClose={handleTabClose}
            dirtyFlags={tabs.map((t, i) =>
              i === activeTabIndex ? tabs[activeTabIndex].isDirty : t.isDirty,
            )}
          />
          <div
            ref={canvasContainerRef}
            className="flex h-full w-full overflow-hidden bg-background"
            style={{
              position: "relative",
              cursor: cursorStyle,
            }}
            onPointerLeave={() => {
              hoverPixelRef.current = null;
            }}
          >
            {/* Canvas interaction layer wrapper - pointer-events: none by default */}
            <div
              id="canvas-interaction-layer"
              style={{ position: "relative", width: "100%", height: "100%" }}
            >
              <CanvasSurface
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                onReady={handleCanvasReady}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                camera={camera}
                showGrid={showGrid}
              />
            </div>

            {/* Canvas-Aligned Overlay Layer (not transformed) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: 20 }}
            >
              <PixelHighlightOverlay
                hoverRef={hoverPixelRef}
                zoom={camera.zoom}
                offsetX={camera.offsetX}
                offsetY={camera.offsetY}
              />
              <TileGridOverlay
                width={canvasSize.width}
                height={canvasSize.height}
                zoom={camera.zoom}
                offsetX={camera.offsetX}
                offsetY={camera.offsetY}
                show={showTileGrid}
                tileSize={tileSize}
              />
              <PixelGridOverlay
                width={canvasSize.width}
                height={canvasSize.height}
                zoom={camera.zoom}
                offsetX={camera.offsetX}
                offsetY={camera.offsetY}
                show={showPixelGrid}
              />
            </div>

            {/* Selection Overlay Layer (not transformed) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: 30 }}
            >
              <SelectionOverlay
                toolController={runtime.toolController}
                zoom={camera.zoom}
                offsetX={camera.offsetX}
                offsetY={camera.offsetY}
              />
            </div>

            {/* HUD Layer - scoped to canvas container with absolute positioning */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: 100 }}
            >
              {/* Other HUD elements - conditionally hidden during Focus Mode */}
              {!focusModeActive && (
                <>
                  {hudVisibility.notes && <HUDNotes state={hudState} />}
                  {hudVisibility.shortcuts && <HUDShortcuts state={hudState} />}
                  {hudVisibility.generalInfo && (
                    <HUDGeneralInfo state={hudState} />
                  )}
                </>
              )}

              {/* ColorQuickDock - always rendered, positioned based on Focus Mode */}
              <ColorQuickDock
                collapsed={!hudVisibility.colorQuickDockExpanded}
                focusModeActive={focusModeActive}
              />
            </div>
          </div>

          {!focusModeActive && (
            <Timeline
              frameManager={runtime.frameManager}
              activeFrameIndex={activeFrameIndexState}
              onFrameChange={handleFrameChange}
              onAddFrame={handleAddFrame}
              onDeleteFrame={handleDeleteFrame}
              onDuplicateFrame={handleDuplicateFrame}
              onFramesChange={handleFramesChange}
              onionPrev={onionPrev}
              onionNext={onionNext}
              onionStrength={onionStrength}
              onTogglePrev={handleTogglePrev}
              onToggleNext={handleToggleNext}
              onStrengthChange={handleStrengthChange}
              isPlaying={isPlaying}
              loop={loop}
              onPlay={playAnimation}
              onStop={stopAnimation}
              onToggleLoop={handleToggleLoop}
            />
          )}
        </div>

        {!focusModeActive && (
          <RightSidebar
            layerManager={runtime.getCurrentLayerManager()}
            activeLayerIndex={getActiveLayerIndex()}
            activeLayerId={activeLayerId}
            onLayersChange={handleLayersChange}
            onSelectLayer={handleSelectLayer}
          />
        )}
      </div>

      {/* Modal Dialogs - rendered outside transformed containers */}
      <CanvasSizeDialog
        open={canvasSizeDialogOpen}
        onOpenChange={setCanvasSizeDialogOpen}
        currentWidth={canvasSize.width}
        currentHeight={canvasSize.height}
        onConfirm={handleCanvasSizeConfirm}
        tabCount={tabs.length}
      />

      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        imageData={pendingImportData}
        onContinue={handleImportContinue}
        onCancel={handleImportDialogCancel}
        onImportSpritesheet={handleOpenSpritesheetDialog}
      />

      <ImportSpritesheetDialog
        open={showSpritesheetDialog}
        onOpenChange={setShowSpritesheetDialog}
        imageData={pendingImportData}
        onConfirm={handleSpritesheetConfirm}
        onCancel={handleSpritesheetCancel}
      />

      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onExport={handleExport}
      />
    </div>
  );
}
