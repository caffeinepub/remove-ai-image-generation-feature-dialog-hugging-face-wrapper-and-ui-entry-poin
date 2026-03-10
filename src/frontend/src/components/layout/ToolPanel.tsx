import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Circle,
  Droplet,
  Eraser,
  Minus,
  Paintbrush,
  Pencil,
  Pipette,
  Sparkles,
  Square,
  SquareDashed,
} from "lucide-react";
import { useEffect, useState } from "react";

// Simple lasso icon component (polyline loop)
const IconLasso = ({ className }: { className?: string }) => (
  <svg
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 8 L8 4 L16 6 L20 12 L18 18 L12 20 L6 16 Z" />
  </svg>
);

// Text icon component (inline SVG)
const IconText = ({ className }: { className?: string }) => (
  <svg
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="4 7 4 4 20 4 20 7" />
    <line x1="9" y1="20" x2="15" y2="20" />
    <line x1="12" y1="4" x2="12" y2="20" />
  </svg>
);

// Group 1: Pencil, Brush, Eraser, Fill
const toolsGroup1 = [
  { icon: Pencil, label: "Pencil", shortcut: "P", tool: "pencil" },
  { icon: Paintbrush, label: "Brush", shortcut: "B", tool: "brush" },
  { icon: Eraser, label: "Eraser", shortcut: "E", tool: "eraser" },
  { icon: Droplet, label: "Fill", shortcut: "G", tool: "fill" },
];

// Group 2: Magic Tool, Selection Tool, Lasso
const toolsGroup2 = [
  { icon: Sparkles, label: "Magic Select", shortcut: "M", tool: "magic" },
  { icon: Square, label: "Select", shortcut: "S", tool: "select" },
  { icon: IconLasso, label: "Lasso", shortcut: "L", tool: "lasso" },
];

// Group 3: Eyedropper, Outline, Text Tool
const toolsGroup3 = [
  { icon: Pipette, label: "Eyedropper", shortcut: "I", tool: "eyedropper" },
  { icon: SquareDashed, label: "Outline", shortcut: "O", tool: "outline" },
  { icon: IconText, label: "Text", shortcut: "T", tool: "text" },
];

// Group 4: Line, Rectangle, Circle
const toolsGroup4 = [
  { icon: Minus, label: "Line", shortcut: "L", tool: "line" },
  { icon: Square, label: "Rectangle", shortcut: "R", tool: "rectangle" },
  { icon: Circle, label: "Circle", shortcut: "C", tool: "circle" },
];

interface ToolButtonProps {
  icon: any;
  label: string;
  shortcut: string;
  tool: string;
  isActive: boolean;
  onClick: () => void;
}

function ToolButton({
  icon: Icon,
  label,
  shortcut,
  tool,
  isActive,
  onClick,
}: ToolButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Shape tools that should not display shortcuts in tooltips
  const hideShortcut =
    tool === "rectangle" || tool === "circle" || tool === "line";
  const tooltipText = hideShortcut ? label : `${label} (${shortcut})`;

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Button
        variant="ghost"
        size="icon"
        className="w-10 h-10 transition-colors relative"
        onClick={onClick}
      >
        <Icon className="w-5 h-5" />
      </Button>

      {/* Active tool outline with absolute positioning, high z-index, and pointer-events-none */}
      {isActive && (
        <div
          className="absolute inset-0 rounded-md pointer-events-none"
          style={{
            position: "absolute",
            zIndex: 200,
            border: "1px solid rgba(59, 130, 246, 0.4)",
            boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.4)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Tooltip with absolute positioning, high z-index, and pointer-events-none */}
      {showTooltip && (
        <div
          className="absolute left-full ml-2 top-1/2 -translate-y-1/2"
          style={{
            position: "absolute",
            zIndex: 200,
            pointerEvents: "none",
            animation: "fadeIn 0.15s ease-out",
          }}
        >
          <div className="bg-gray-900 text-gray-200 px-2 py-1 rounded text-xs whitespace-nowrap pointer-events-none">
            {tooltipText}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ToolPanel() {
  const [activeTool, setActiveTool] = useState<string>("pencil");

  useEffect(() => {
    // Poll for active tool changes from window.editor
    const interval = setInterval(() => {
      if ((window as any).editor?.tool?.currentTool) {
        const currentTool = (window as any).editor.tool.currentTool;
        if (currentTool !== activeTool) {
          setActiveTool(currentTool);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [activeTool]);

  const handleToolClick = (toolName: string) => {
    if ((window as any).editor?.setTool) {
      (window as any).editor.setTool(toolName);
      setActiveTool(toolName);
    }
  };

  return (
    <aside className="w-14 bg-card border-r border-border flex flex-col items-center py-3 gap-1 shrink-0">
      {/* Group 1: Pencil, Brush, Eraser, Fill */}
      {toolsGroup1.map((tool) => (
        <ToolButton
          key={tool.label}
          icon={tool.icon}
          label={tool.label}
          shortcut={tool.shortcut}
          tool={tool.tool}
          isActive={activeTool === tool.tool}
          onClick={() => handleToolClick(tool.tool)}
        />
      ))}

      <Separator className="my-2 w-8" />

      {/* Group 2: Magic Tool, Selection Tool, Lasso */}
      {toolsGroup2.map((tool) => (
        <ToolButton
          key={tool.label}
          icon={tool.icon}
          label={tool.label}
          shortcut={tool.shortcut}
          tool={tool.tool}
          isActive={activeTool === tool.tool}
          onClick={() => handleToolClick(tool.tool)}
        />
      ))}

      <Separator className="my-2 w-8" />

      {/* Group 3: Eyedropper, Outline, Text Tool */}
      {toolsGroup3.map((tool) => (
        <ToolButton
          key={tool.label}
          icon={tool.icon}
          label={tool.label}
          shortcut={tool.shortcut}
          tool={tool.tool}
          isActive={activeTool === tool.tool}
          onClick={() => handleToolClick(tool.tool)}
        />
      ))}

      <Separator className="my-2 w-8" />

      {/* Group 4: Line, Rectangle, Circle */}
      {toolsGroup4.map((tool) => (
        <ToolButton
          key={tool.label}
          icon={tool.icon}
          label={tool.label}
          shortcut={tool.shortcut}
          tool={tool.tool}
          isActive={activeTool === tool.tool}
          onClick={() => handleToolClick(tool.tool)}
        />
      ))}

      <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
            `}</style>
    </aside>
  );
}
