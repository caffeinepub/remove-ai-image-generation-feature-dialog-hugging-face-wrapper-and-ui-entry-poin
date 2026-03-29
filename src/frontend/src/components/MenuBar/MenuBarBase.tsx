import RoadmapDialog from "@/components/modals/RoadmapDialog";
import ShortcutsDialog from "@/components/modals/ShortcutsDialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getEditorRuntime } from "@/editor/EditorRuntime";
import {
  type SaveProjectChunk,
  loadProjectFromChunks,
  prepareProjectForSave,
} from "@/engine/ExportManager";
import {
  decompressProjectData,
  deserializeProject,
  serializeProject,
} from "@/lib/projectSerializer";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Helper function to trigger client-side download of a blob
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * MenuBarBase: Backend-agnostic menu bar component containing all editor-only logic
 * (undo/redo, layer operations, export/import, canvas tools).
 * This component does NOT import any backend-related hooks or ActorContext.
 */
export default function MenuBarBase() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  const [roadmapDialog, setRoadmapDialog] = useState(false);
  const [shortcutsDialog, setShortcutsDialog] = useState(false);

  // Get runtime for state evaluation
  const runtime = getEditorRuntime();

  // Reactive undo/redo state
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // HUD visibility state
  const [hudVisibility, setHudVisibility] = useState({
    generalInfo: true,
    notes: true,
    shortcuts: true,
    colorQuickDockExpanded: true,
  });

  // Subscribe to undo/redo manager changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: runtime is stable
  useEffect(() => {
    const undoManager = runtime.getCurrentUndoRedoManager();
    if (!undoManager) return;

    const update = () => {
      setCanUndo(undoManager.canUndo());
      setCanRedo(undoManager.canRedo());
    };

    undoManager.onChange(update);
    update(); // Initial update

    return () => undoManager.offChange(update);
  }, []);

  // Sync HUD visibility state with EditorRuntime
  useEffect(() => {
    const syncVisibility = () => {
      const visibility = runtime.getHudVisibility();
      setHudVisibility(visibility);
    };

    // Initial sync
    syncVisibility();

    // Poll for updates (simple approach for synchronization)
    const interval = setInterval(syncVisibility, 100);

    return () => clearInterval(interval);
  }, [runtime]);

  // Selection-based commands — reactive polling so menu items enable/disable correctly
  const [hasSelection, setHasSelection] = useState(false);
  useEffect(() => {
    const poll = () => {
      const activeRuntime =
        (window as any).editor?.getActiveRuntime?.() ?? getEditorRuntime();
      setHasSelection(activeRuntime.toolController.hasSelection());
    };
    poll();
    const interval = setInterval(poll, 100);
    return () => clearInterval(interval);
  }, []);

  // Clipboard commands depend on clipboard data — reactive polling so Paste enables after Cut
  const [hasClipboardData, setHasClipboardData] = useState(false);
  useEffect(() => {
    const poll = () => {
      setHasClipboardData(
        (window as any).editor?.clipboard?.hasData?.() || false,
      );
    };
    poll();
    const interval = setInterval(poll, 100);
    return () => clearInterval(interval);
  }, []);

  // File Menu Handlers (Local only)
  const handleNew = () => {
    if (confirm("Create a new project? Unsaved changes will be lost.")) {
      // Use resetEditorFromProject with null for new project
      if ((window as any).editor?.resetEditorFromProject) {
        (window as any).editor.resetEditorFromProject(null);
        toast.success("New project created");
      }
    }
  };

  const handleImportProject = () => {
    projectInputRef.current?.click();
  };

  const handleProjectFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      let data = new Uint8Array(arrayBuffer);

      // Try to decompress if needed (legacy single-tab compressed files)
      let projectData: Uint8Array<ArrayBuffer> =
        data as Uint8Array<ArrayBuffer>;
      try {
        const chunks: SaveProjectChunk[] = [{ index: 0, total: 1, data }];
        projectData = (await loadProjectFromChunks(
          chunks,
        )) as Uint8Array<ArrayBuffer>;
      } catch {
        projectData = data;
      }

      // Check for multi-tab envelope
      let loadedAsMultiTab = false;
      try {
        const text = new TextDecoder().decode(projectData);
        const envelope = JSON.parse(text);
        if (envelope.__icpixel_multitab__ && Array.isArray(envelope.tabs)) {
          const tabsData = envelope.tabs as Array<{
            name: string;
            data: string;
          }>;
          if (tabsData.length >= 1) {
            const bin0 = atob(tabsData[0].data);
            const bytes0 = new Uint8Array(bin0.length);
            for (let i = 0; i < bin0.length; i++)
              bytes0[i] = bin0.charCodeAt(i);
            const decompressed0 = await decompressProjectData(bytes0);
            const project0 = deserializeProject(decompressed0);
            (window as any).editor?.resetEditorFromProject?.(project0);
            (window as any).editor?.setActiveTabName?.(tabsData[0].name);
            (window as any).editor?.markTabClean?.();
          }
          if (tabsData.length >= 2) {
            const bin1 = atob(tabsData[1].data);
            const bytes1 = new Uint8Array(bin1.length);
            for (let i = 0; i < bin1.length; i++)
              bytes1[i] = bin1.charCodeAt(i);
            const decompressed1 = await decompressProjectData(bytes1);
            const project1 = deserializeProject(decompressed1);
            (window as any).editor?.addTab?.();
            (window as any).editor?.setPendingTabRestore?.(
              project1,
              tabsData[1].name,
            );
          }
          toast.success("Project imported successfully");
          loadedAsMultiTab = true;
        }
      } catch {
        // Not multi-tab envelope
      }

      if (!loadedAsMultiTab) {
        const project = deserializeProject(projectData);
        if ((window as any).editor?.resetEditorFromProject) {
          (window as any).editor.resetEditorFromProject(project);
          toast.success("Project imported successfully");
        }
      }
    } catch (error) {
      console.error("Failed to import project:", error);
      toast.error("Failed to import project");
    }

    if (projectInputRef.current) {
      projectInputRef.current.value = "";
    }
  };

  const handleDownload = async () => {
    if (!window.editor?.frameManager) {
      toast.error("Editor not initialized");
      return;
    }
    try {
      const anyWin = window as any;
      const allTabs = anyWin.editor?.getAllTabsData?.() ?? [
        { name: "Canvas 1", frameManager: window.editor!.frameManager },
      ];
      const tabsData = await Promise.all(
        allTabs.map(async (tab: { name: string; frameManager: any }) => {
          const serialized = serializeProject(tab.frameManager);
          const chunks = await prepareProjectForSave(serialized);
          const bytes = chunks[0].data;
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++)
            binary += String.fromCharCode(bytes[i]);
          return { name: tab.name, data: btoa(binary) };
        }),
      );
      const envelope = JSON.stringify({
        __icpixel_multitab__: true,
        version: 1,
        tabs: tabsData,
      });
      const data = new TextEncoder().encode(envelope);
      const blob = new Blob([data], { type: "application/octet-stream" });
      const currentProjectName = (window as any).editor?.currentProjectName;
      const filename = `${currentProjectName || "project"}.icpixel`;
      downloadBlob(blob, filename);
      toast.success("Project downloaded");
    } catch (error) {
      console.error("Failed to download project:", error);
      toast.error("Failed to download project");
    }
  };

  // Export handlers - open dialog
  const handleExportDialog = () => {
    if (window.editor?.ui?.openExportDialog) {
      window.editor.ui.openExportDialog();
    }
  };

  // Quick export handlers (existing functionality)
  const handleExportPNGCurrent = async () => {
    try {
      if (!window.editor?.export?.pngCurrent) {
        console.error("Export API not available");
        return;
      }
      const blob = await window.editor.export.pngCurrent();
      downloadBlob(blob, "frame.png");
    } catch (error) {
      console.error("Failed to export PNG (current frame):", error);
    }
  };

  const handleExportPNGSequence = async () => {
    try {
      if (!window.editor?.export?.pngSequence) {
        console.error("Export API not available");
        return;
      }
      const list = await window.editor.export.pngSequence();
      for (const item of list) {
        downloadBlob(item.blob, `frame-${item.frameIndex}.png`);
      }
    } catch (error) {
      console.error("Failed to export PNG sequence:", error);
    }
  };

  const handleExportSpritesheetHorizontal = async () => {
    try {
      if (!window.editor?.export?.spriteSheet) {
        console.error("Export API not available");
        return;
      }
      const { blob } = await window.editor.export.spriteSheet("horizontal");
      downloadBlob(blob, "spritesheet-horizontal.png");
    } catch (error) {
      console.error("Failed to export horizontal spritesheet:", error);
    }
  };

  const handleExportSpritesheetVertical = async () => {
    try {
      if (!window.editor?.export?.spriteSheet) {
        console.error("Export API not available");
        return;
      }
      const { blob } = await window.editor.export.spriteSheet("vertical");
      downloadBlob(blob, "spritesheet-vertical.png");
    } catch (error) {
      console.error("Failed to export vertical spritesheet:", error);
    }
  };

  const handleExportSpritesheetGrid = async () => {
    try {
      if (!window.editor?.export?.spriteSheet) {
        console.error("Export API not available");
        return;
      }
      const { blob } = await window.editor.export.spriteSheet("grid");
      downloadBlob(blob, "spritesheet-grid.png");
    } catch (error) {
      console.error("Failed to export grid spritesheet:", error);
    }
  };

  const handleExportWebM = async () => {
    try {
      if (!window.editor?.export?.webm) {
        console.error("Export API not available");
        return;
      }
      const blob = await window.editor.export.webm(12, true);
      downloadBlob(blob, "animation.webm");
    } catch (error) {
      console.error("Failed to export WebM:", error);
    }
  };

  // Import handler
  const handleImportPNG = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (window.editor?.ui?.openImportDialog) {
      window.editor.ui.openImportDialog(file);
    } else {
      console.error("Import dialog API not available");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCanvasSize = () => {
    if (window.editor?.ui?.openCanvasSizeDialog) {
      window.editor.ui.openCanvasSizeDialog();
    }
  };

  const handleFocusMode = () => {
    if (window.editor?.ui?.toggleFocusMode) {
      window.editor.ui.toggleFocusMode();
    }
  };

  // Edit menu handlers
  const handleUndo = () => {
    if (window.editor?.undo) {
      window.editor.undo();
    }
  };

  const handleRedo = () => {
    if (window.editor?.redo) {
      window.editor.redo();
    }
  };

  const handleCut = () => {
    if (window.editor?.clipboard?.cut) {
      window.editor.clipboard.cut();
    }
  };

  const handleCopy = () => {
    if (window.editor?.clipboard?.copy) {
      window.editor.clipboard.copy();
    }
  };

  const handlePaste = () => {
    if (window.editor?.clipboard?.paste) {
      window.editor.clipboard.paste();
    }
  };

  const handleDelete = () => {
    if ((window as any).editor?.selection?.deleteSelection) {
      (window as any).editor.selection.deleteSelection();
    }
  };

  const handleDuplicate = () => {
    if ((window as any).editor?.selection?.handleDuplicateSelection) {
      (window as any).editor.selection.handleDuplicateSelection();
    }
  };

  // View menu handlers
  const handleToggleGeneralInfo = () => {
    runtime.toggleHudVisibility("generalInfo");
  };

  const handleToggleNotes = () => {
    runtime.toggleHudVisibility("notes");
  };

  const handleToggleShortcuts = () => {
    runtime.toggleHudVisibility("shortcuts");
  };

  const handleToggleColorQuickDock = () => {
    runtime.toggleHudVisibility("colorQuickDockExpanded");
  };

  // Layer menu handlers
  const handleTransform = () => {
    const layerManager = runtime.getCurrentLayerManager();
    const toolController = runtime.toolController;
    const undoManager = runtime.getCurrentUndoRedoManager();

    if (!layerManager || !toolController) return;

    const activeLayer = layerManager.getActiveLayer();
    if (!activeLayer) {
      toast.error("No active layer to transform");
      return;
    }

    // Find bounding box of all non-transparent pixels in the active layer
    let minX = activeLayer.width;
    let maxX = -1;
    let minY = activeLayer.height;
    let maxY = -1;

    for (let y = 0; y < activeLayer.height; y++) {
      for (let x = 0; x < activeLayer.width; x++) {
        const pixel = activeLayer.getPixel(x, y);
        if (pixel && pixel[3] > 0) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    // If no content found, show error
    if (minX > maxX || minY > maxY) {
      toast.error("Active layer is empty");
      return;
    }

    // Begin undo transaction
    if (undoManager) {
      undoManager.beginTransaction();
    }

    // Create selection using SelectionManager
    const selectionManager = (toolController as any).selectionManager;
    if (!selectionManager) return;

    // Cancel any existing selection
    selectionManager.cancelSelection();

    // Create selection rectangle covering the entire layer content
    selectionManager.beginSelection(minX, minY);
    (selectionManager as any).createCurrent = { x: maxX, y: maxY };
    selectionManager.commitSelection();

    // Extract floating pixels and begin transform
    selectionManager.beginTransform(
      "move",
      minX + (maxX - minX) / 2,
      minY + (maxY - minY) / 2,
    );

    // Update tool controller state
    (toolController as any).selectionPhase = "transforming";
    (toolController as any).selectionSourceTool = "select";
    (toolController as any).currentTool = "select";

    // Update preview
    (toolController as any).updateSelectionPreview();

    // CRITICAL FIX: Update React state via window.editor.setTool to synchronize HUD
    if ((window as any).editor?.setTool) {
      (window as any).editor.setTool("select");
    }

    // Trigger UI refresh
    if ((window as any).editor?.refresh) {
      (window as any).editor.refresh();
    }

    toast.success("Transform mode activated");
  };

  const handleInvert = () => {
    const layerManager = runtime.getCurrentLayerManager();
    if (layerManager) {
      layerManager.invertActiveLayer();
    }
  };

  const handleFlipHorizontal = () => {
    const layerManager = runtime.getCurrentLayerManager();
    if (layerManager) {
      layerManager.flipActiveLayerHorizontal();
    }
  };

  const handleFlipVertical = () => {
    const layerManager = runtime.getCurrentLayerManager();
    if (layerManager) {
      layerManager.flipActiveLayerVertical();
    }
  };

  // Help menu handlers
  const handleRoadmap = () => {
    setRoadmapDialog(true);
  };

  const handleShortcuts = () => {
    setShortcutsDialog(true);
  };

  const handleConnectToX = () => {
    window.open("https://x.com/icpixeleditor", "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div className="flex items-center gap-1 menu-bar" data-editor-ui="true">
        {/* File Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="px-3 py-1.5 text-sm hover:bg-accent rounded-sm transition-colors outline-none font-['Inter']">
            File
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="dropdown-content absolute z-[900] w-48 font-['Inter']"
            data-editor-ui="true"
          >
            <DropdownMenuItem onSelect={handleNew} className="text-xs">
              New
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handleImportProject}
              className="text-xs"
            >
              Import Project
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleDownload} className="text-xs">
              Download Project
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleExportDialog} className="text-xs">
              Export…
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="text-xs">
                Quick Export
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent
                className="dropdown-content absolute z-[900] font-['Inter']"
                data-editor-ui="true"
              >
                <DropdownMenuItem
                  onSelect={handleExportPNGCurrent}
                  className="text-xs"
                >
                  PNG (current frame)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={handleExportPNGSequence}
                  className="text-xs"
                >
                  PNG Sequence
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-xs">
                    Spritesheet
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent
                    className="dropdown-content absolute z-[900] font-['Inter']"
                    data-editor-ui="true"
                  >
                    <DropdownMenuItem
                      onSelect={handleExportSpritesheetHorizontal}
                      className="text-xs"
                    >
                      Horizontal
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={handleExportSpritesheetVertical}
                      className="text-xs"
                    >
                      Vertical
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={handleExportSpritesheetGrid}
                      className="text-xs"
                    >
                      Grid
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem
                  onSelect={handleExportWebM}
                  className="text-xs"
                >
                  WebM
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onSelect={handleImportPNG} className="text-xs">
              Import PNG…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Edit Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="px-3 py-1.5 text-sm hover:bg-accent rounded-sm transition-colors outline-none font-['Inter']">
            Edit
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="dropdown-content absolute z-[900] w-56 font-['Inter']"
            data-editor-ui="true"
          >
            <DropdownMenuItem
              onSelect={canUndo ? handleUndo : undefined}
              disabled={!canUndo}
              className="text-xs flex justify-between"
              style={{
                color: canUndo ? "inherit" : "var(--muted-foreground)",
                cursor: canUndo ? "default" : "default",
                pointerEvents: canUndo ? "auto" : "none",
              }}
            >
              <span>Undo</span>
              <span
                style={{
                  color: canUndo ? "var(--muted-foreground)" : "inherit",
                }}
              >
                Ctrl+Z
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={canRedo ? handleRedo : undefined}
              disabled={!canRedo}
              className="text-xs flex justify-between"
              style={{
                color: canRedo ? "inherit" : "var(--muted-foreground)",
                cursor: canRedo ? "default" : "default",
                pointerEvents: canRedo ? "auto" : "none",
              }}
            >
              <span>Redo</span>
              <span
                style={{
                  color: canRedo ? "var(--muted-foreground)" : "inherit",
                }}
              >
                Ctrl+Shift+Z
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={hasSelection ? handleCut : undefined}
              disabled={!hasSelection}
              className="text-xs flex justify-between"
              style={{
                color: hasSelection ? "inherit" : "var(--muted-foreground)",
                cursor: hasSelection ? "default" : "default",
                pointerEvents: hasSelection ? "auto" : "none",
              }}
            >
              <span>Cut</span>
              <span
                style={{
                  color: hasSelection ? "var(--muted-foreground)" : "inherit",
                }}
              >
                Ctrl+X
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={hasSelection ? handleCopy : undefined}
              disabled={!hasSelection}
              className="text-xs flex justify-between"
              style={{
                color: hasSelection ? "inherit" : "var(--muted-foreground)",
                cursor: hasSelection ? "default" : "default",
                pointerEvents: hasSelection ? "auto" : "none",
              }}
            >
              <span>Copy</span>
              <span
                style={{
                  color: hasSelection ? "var(--muted-foreground)" : "inherit",
                }}
              >
                Ctrl+C
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={hasClipboardData ? handlePaste : undefined}
              disabled={!hasClipboardData}
              className="text-xs flex justify-between"
              title="Clipboard is shared across all open tabs"
              style={{
                color: hasClipboardData ? "inherit" : "var(--muted-foreground)",
                cursor: hasClipboardData ? "default" : "default",
                pointerEvents: hasClipboardData ? "auto" : "none",
              }}
            >
              <span>Paste</span>
              <span
                style={{
                  color: hasClipboardData
                    ? "var(--muted-foreground)"
                    : "inherit",
                }}
              >
                Ctrl+V
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={hasSelection ? handleDelete : undefined}
              disabled={!hasSelection}
              className="text-xs flex justify-between"
              style={{
                color: hasSelection ? "inherit" : "var(--muted-foreground)",
                cursor: hasSelection ? "default" : "default",
                pointerEvents: hasSelection ? "auto" : "none",
              }}
            >
              <span>Delete</span>
              <span
                style={{
                  color: hasSelection ? "var(--muted-foreground)" : "inherit",
                }}
              >
                Del
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={hasSelection ? handleDuplicate : undefined}
              disabled={!hasSelection}
              className="text-xs flex justify-between"
              style={{
                color: hasSelection ? "inherit" : "var(--muted-foreground)",
                cursor: hasSelection ? "default" : "default",
                pointerEvents: hasSelection ? "auto" : "none",
              }}
            >
              <span>Duplicate</span>
              <span
                style={{
                  color: hasSelection ? "var(--muted-foreground)" : "inherit",
                }}
              >
                Ctrl+D
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="px-3 py-1.5 text-sm hover:bg-accent rounded-sm transition-colors outline-none font-['Inter']">
            View
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="dropdown-content absolute z-[900] w-56 font-['Inter']"
            data-editor-ui="true"
          >
            <DropdownMenuCheckboxItem
              checked={hudVisibility.generalInfo}
              onCheckedChange={handleToggleGeneralInfo}
              className="text-xs"
            >
              Show General Info HUD
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={hudVisibility.notes}
              onCheckedChange={handleToggleNotes}
              className="text-xs"
            >
              Show Notes HUD
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={hudVisibility.shortcuts}
              onCheckedChange={handleToggleShortcuts}
              className="text-xs"
            >
              Show Shortcuts HUD
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={hudVisibility.colorQuickDockExpanded}
              onCheckedChange={handleToggleColorQuickDock}
              className="text-xs"
            >
              Show Color Quick Dock
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Layer Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="px-3 py-1.5 text-sm hover:bg-accent rounded-sm transition-colors outline-none font-['Inter']">
            Layer
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="dropdown-content absolute z-[900] w-48 font-['Inter']"
            data-editor-ui="true"
          >
            <DropdownMenuItem onSelect={handleTransform} className="text-xs">
              Transform
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleInvert} className="text-xs">
              Invert
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={handleFlipHorizontal}
              className="text-xs"
            >
              Flip Horizontal
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleFlipVertical} className="text-xs">
              Flip Vertical
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Image Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="px-3 py-1.5 text-sm hover:bg-accent rounded-sm transition-colors outline-none font-['Inter']">
            Image
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="dropdown-content absolute z-[900] w-56 font-['Inter']"
            data-editor-ui="true"
          >
            <DropdownMenuItem onSelect={handleCanvasSize} className="text-xs">
              Canvas Size…
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={handleFocusMode}
              className="text-xs flex justify-between"
            >
              <span>Focus Mode</span>
              <span className="text-muted-foreground">F</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Help Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="px-3 py-1.5 text-sm hover:bg-accent rounded-sm transition-colors outline-none font-['Inter']">
            Help
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="dropdown-content absolute z-[900] w-48 font-['Inter']"
            data-editor-ui="true"
          >
            <DropdownMenuItem onSelect={handleRoadmap} className="text-xs">
              Roadmap / Whitepaper
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleShortcuts} className="text-xs">
              Shortcuts
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleConnectToX} className="text-xs">
              Connect to X
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png"
        onChange={handleFileSelected}
        style={{ display: "none" }}
      />
      <input
        ref={projectInputRef}
        type="file"
        accept=".icp,.icpixel"
        onChange={handleProjectFileSelected}
        style={{ display: "none" }}
      />

      {/* Dialogs */}
      <RoadmapDialog open={roadmapDialog} onOpenChange={setRoadmapDialog} />
      <ShortcutsDialog
        open={shortcutsDialog}
        onOpenChange={setShortcutsDialog}
      />
    </>
  );
}
