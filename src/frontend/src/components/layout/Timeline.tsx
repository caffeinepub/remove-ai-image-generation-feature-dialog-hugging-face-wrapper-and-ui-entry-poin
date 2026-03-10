import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Copy,
  Pause,
  Play,
  Plus,
  Repeat,
  Square,
  Trash2,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { FrameManager } from "../../engine/FrameManager";
import { renderFrameThumbnail } from "../timeline/FramePreviewRenderer";

interface TimelineProps {
  frameManager: FrameManager | null;
  activeFrameIndex: number;
  onFrameChange: (index: number) => void;
  onAddFrame: () => void;
  onDeleteFrame: (index: number) => void;
  onDuplicateFrame: (index: number) => void;
  onFramesChange?: () => void;
  isPlaying: boolean;
  loop: boolean;
  onPlay: () => void;
  onStop: () => void;
  onToggleLoop: () => void;
  onionPrev: boolean;
  onionNext: boolean;
  onionStrength: number;
  onTogglePrev: () => void;
  onToggleNext: () => void;
  onStrengthChange: (value: number) => void;
}

interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  frameIndex: number;
}

export default function Timeline({
  frameManager,
  activeFrameIndex,
  onFrameChange,
  onAddFrame,
  onDeleteFrame,
  onDuplicateFrame,
  onFramesChange,
  isPlaying,
  loop,
  onPlay,
  onStop,
  onToggleLoop,
  onionPrev,
  onionNext,
  onTogglePrev,
  onToggleNext,
}: TimelineProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    show: false,
    x: 0,
    y: 0,
    frameIndex: -1,
  });
  const [draggingFrameId, setDraggingFrameId] = useState<string | null>(null);
  const [dragOverFrameId, setDragOverFrameId] = useState<string | null>(null);
  const [editingDurationIndex, setEditingDurationIndex] = useState<
    number | null
  >(null);
  const [framePreviewURLs, setFramePreviewURLs] = useState<string[]>([]);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Generate frame preview thumbnails
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (!frameManager) {
      setFramePreviewURLs([]);
      return;
    }

    const frames = frameManager.getFrames();
    const urls: string[] = [];

    for (const frame of frames) {
      const canvas = renderFrameThumbnail(frame.layerManager, 48);
      const dataURL = canvas.toDataURL();
      urls.push(dataURL);
    }

    setFramePreviewURLs(urls);
  }, [frameManager, frameManager?.getFrames().length, onFramesChange]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu({ show: false, x: 0, y: 0, frameIndex: -1 });
      }
    };

    if (contextMenu.show) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [contextMenu.show]);

  if (!frameManager) {
    return (
      <div className="h-[160px] min-h-[160px] w-full border-t border-border flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Loading…</span>
      </div>
    );
  }

  const frames = frameManager.getFrames();
  const frameCount = frames.length;

  const handleContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    // Calculate position, adjusting for viewport boundaries
    const menuWidth = 150;
    const menuHeight = 80;
    let x = e.clientX;
    let y = e.clientY;

    // Adjust if menu would go off right edge
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }

    // Adjust if menu would go off bottom edge
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    setContextMenu({
      show: true,
      x,
      y,
      frameIndex: index,
    });
  };

  const handleDuplicate = () => {
    onDuplicateFrame(contextMenu.frameIndex);
    setContextMenu({ show: false, x: 0, y: 0, frameIndex: -1 });
  };

  const handleDelete = () => {
    onDeleteFrame(contextMenu.frameIndex);
    setContextMenu({ show: false, x: 0, y: 0, frameIndex: -1 });
  };

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent, frameId: string) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggingFrameId(frameId);
  };

  const handleDragOver = (e: React.DragEvent, frameId: string) => {
    e.preventDefault();
    if (draggingFrameId && draggingFrameId !== frameId) {
      setDragOverFrameId(frameId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetFrameId: string) => {
    e.preventDefault();

    if (draggingFrameId && draggingFrameId !== targetFrameId && frameManager) {
      // Move the frame
      frameManager.moveFrame(draggingFrameId, targetFrameId);

      // Trigger UI update
      if (onFramesChange) {
        onFramesChange();
      }
    }

    // Clear drag state
    setDraggingFrameId(null);
    setDragOverFrameId(null);
  };

  const handleDragEnd = () => {
    setDraggingFrameId(null);
    setDragOverFrameId(null);
  };

  // Button handlers
  const handleAddClick = () => {
    onAddFrame();
  };

  const handleDuplicateClick = () => {
    onDuplicateFrame(activeFrameIndex);
  };

  const handleDeleteClick = () => {
    onDeleteFrame(activeFrameIndex);
  };

  // Playback handlers
  const handlePlayPause = () => {
    if (isPlaying) {
      onStop();
    } else {
      onPlay();
    }
  };

  // Duration editing handlers
  const setDuration = (index: number, value: number) => {
    frameManager.setFrameDuration(index, value);
    if (onFramesChange) {
      onFramesChange();
    }
  };

  const handleDurationClick = (e: React.MouseEvent, index: number) => {
    // Only allow editing for active frame
    if (index === activeFrameIndex) {
      e.stopPropagation();
      setEditingDurationIndex(index);
    }
  };

  const handleDurationChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const value = Number.parseInt(e.target.value, 10);
    if (!Number.isNaN(value)) {
      setDuration(index, value);
    }
  };

  const handleDurationBlur = () => {
    setEditingDurationIndex(null);
  };

  const handleDurationKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    _index: number,
  ) => {
    if (e.key === "Enter") {
      setEditingDurationIndex(null);
    } else if (e.key === "Escape") {
      setEditingDurationIndex(null);
    }
  };

  // Frame selection handler with proper rewiring
  const handleFrameSelect = (index: number) => {
    onFrameChange(index);
  };

  return (
    <div className="h-[160px] min-h-[160px] w-full border-t border-border flex flex-col">
      {/* Top control bar with playback, frame management, and onion skin buttons */}
      <div className="p-2 border-b border-border flex items-center gap-2">
        {/* Playback controls */}
        <Button
          variant={isPlaying ? "default" : "outline"}
          size="icon"
          onClick={handlePlayPause}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onStop}
          disabled={!isPlaying}
          title="Stop"
        >
          <Square className="w-4 h-4" />
        </Button>
        <Button
          variant={loop ? "default" : "outline"}
          size="sm"
          onClick={onToggleLoop}
          title={loop ? "Loop ON" : "No Loop"}
          className="gap-1"
        >
          {loop ? (
            <>
              <Repeat className="w-4 h-4" />
              <span className="text-xs">Loop</span>
            </>
          ) : (
            <>
              <ArrowRight className="w-4 h-4" />
              <span className="text-xs">Once</span>
            </>
          )}
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Frame management controls */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleAddClick}
          title="Add Frame"
        >
          <Plus className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleDuplicateClick}
          disabled={frameCount <= 1}
          title={
            frameCount <= 1
              ? "Need at least one frame"
              : "Duplicate Active Frame"
          }
        >
          <Copy className="w-4 h-4" />
        </Button>
        <Button
          variant="destructive"
          size="icon"
          onClick={handleDeleteClick}
          disabled={frameCount <= 1}
          title={
            frameCount <= 1
              ? "Cannot delete the only frame"
              : "Delete Active Frame"
          }
        >
          <Trash2 className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Onion skin controls */}
        <Button
          variant={onionPrev ? "default" : "outline"}
          size="sm"
          onClick={onTogglePrev}
          disabled={isPlaying}
          title="Toggle Previous Frame Ghost"
          className="gap-1"
        >
          <span className="text-red-500">🔴</span>
          <span className="text-xs">Prev</span>
        </Button>
        <Button
          variant={onionNext ? "default" : "outline"}
          size="sm"
          onClick={onToggleNext}
          disabled={isPlaying}
          title="Toggle Next Frame Ghost"
          className="gap-1"
        >
          <span className="text-blue-500">🟢</span>
          <span className="text-xs">Next</span>
        </Button>
      </div>

      {/* Frame bar */}
      <div className="flex items-center gap-2 px-3 py-3 overflow-x-auto flex-1">
        {frames.map((frame, index) => {
          const duration = frameManager.getFrameDuration(index);
          const isActive = index === activeFrameIndex;
          const isEditing = editingDurationIndex === index;

          return (
            <div
              key={frame.id}
              draggable
              onDragStart={(e) => handleDragStart(e, frame.id)}
              onDragOver={(e) => handleDragOver(e, frame.id)}
              onDrop={(e) => handleDrop(e, frame.id)}
              onDragEnd={handleDragEnd}
              className={`
                p-1 rounded transition-all
                ${dragOverFrameId === frame.id ? "bg-primary/30 scale-105 ring-2 ring-primary" : ""}
              `}
            >
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleFrameSelect(index)}
                  onContextMenu={(e) => handleContextMenu(e, index)}
                  className={`
                    relative px-4 py-2 rounded border transition-colors
                    ${
                      isActive
                        ? "border-primary bg-primary/20"
                        : "border-border hover:bg-accent/40"
                    }
                  `}
                  title={`Frame ${index + 1}`}
                >
                  {/* Frame thumbnail preview */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {framePreviewURLs[index] && (
                      <img
                        src={framePreviewURLs[index]}
                        alt={`Frame ${index + 1} preview`}
                        className="w-full h-full object-contain image-render-pixel"
                      />
                    )}
                  </div>

                  {/* Frame number (overlaid on preview) */}
                  <span className="relative z-10">{index + 1}</span>
                </button>

                {/* Duration display/editor */}
                <button
                  type="button"
                  onClick={(e) => handleDurationClick(e, index)}
                  className={`
                    text-xs font-mono px-2 py-0.5 rounded bg-transparent border-0 p-0
                    ${isActive ? "text-foreground cursor-pointer hover:bg-accent/40" : "text-muted-foreground"}
                  `}
                  title={
                    isActive
                      ? "Click to edit duration"
                      : `Duration: ${duration} ms`
                  }
                >
                  {isEditing ? (
                    <input
                      type="number"
                      min={10}
                      max={1000}
                      step={10}
                      value={duration}
                      onChange={(e) => handleDurationChange(e, index)}
                      onBlur={handleDurationBlur}
                      onKeyDown={(e) => handleDurationKeyDown(e, index)}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-16 px-1 py-0 text-xs bg-background border border-primary rounded text-center"
                    />
                  ) : (
                    `${duration} ms`
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenu.show && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-card border border-border rounded-md shadow-lg py-1"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            minWidth: "150px",
          }}
        >
          <button
            type="button"
            onClick={handleDuplicate}
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={frameCount <= 1}
            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
              frameCount <= 1
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-accent"
            }`}
            title={
              frameCount <= 1 ? "Cannot delete the only frame" : "Delete frame"
            }
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
