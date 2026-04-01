import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Eye,
  EyeOff,
  Folder,
  Lock,
  Plus,
  Trash2,
  Unlock,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import React from "react";
import type { LayerManager, LayerNode } from "../../engine/LayerManager";
import ColorPanel from "../properties/ColorPanel";
import LayerPropertiesPanel from "../properties/LayerPropertiesPanel";
import ToolProperties from "../properties/ToolProperties";

interface RightSidebarProps {
  layerManager: LayerManager | null;
  activeLayerIndex: number;
  activeLayerId: string | null;
  onLayersChange: () => void;
  onSelectLayer: (index: number | null) => void;
}

interface Trait {
  id: string;
  name: string;
  enabled: boolean;
  weight: number;
}

interface TraitGroup {
  id: string;
  name: string;
  traits: Trait[];
}

// Helper function to pick weighted trait
function pickWeightedTrait(traits: Trait[]) {
  const enabled = traits.filter((t) => t.enabled);
  if (enabled.length === 0) return null;
  const weightSum = enabled.reduce((sum, t) => sum + t.weight, 0);
  const rnd = Math.random() * weightSum;
  let cumulative = 0;
  for (const trait of enabled) {
    cumulative += trait.weight;
    if (rnd <= cumulative) return trait;
  }
  return enabled[enabled.length - 1];
}

// Sanitize filename helper - make file-safe names
const sanitize = (name: string) =>
  name.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();

// Simple ZIP file creator using browser APIs
class SimpleZipCreator {
  private files: Array<{ path: string; data: Uint8Array }> = [];

  addFile(path: string, data: Uint8Array | string) {
    const uint8Data =
      typeof data === "string" ? new TextEncoder().encode(data) : data;
    this.files.push({ path, data: uint8Data });
  }

  async generateAsync(options: { type: string; compression?: string }): Promise<
    Uint8Array | Blob
  > {
    // Generate uncompressed ZIP for maximum compatibility
    const chunks: Uint8Array[] = [];
    const centralDirectory: Uint8Array[] = [];
    let offset = 0;

    for (const file of this.files) {
      // Create local file header (uncompressed)
      const header = this.createLocalFileHeader(
        file.path,
        file.data,
        file.data.length,
        false,
      );
      chunks.push(header);
      chunks.push(file.data);

      // Create central directory entry
      const cdEntry = this.createCentralDirectoryEntry(
        file.path,
        file.data,
        file.data.length,
        offset,
        false,
      );
      centralDirectory.push(cdEntry);

      offset += header.length + file.data.length;
    }

    // Add central directory
    for (const entry of centralDirectory) {
      chunks.push(entry);
    }

    // Add end of central directory record
    const eocd = this.createEndOfCentralDirectory(centralDirectory, offset);
    chunks.push(eocd);

    // Combine all chunks into single Uint8Array
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let position = 0;
    for (const chunk of chunks) {
      result.set(chunk, position);
      position += chunk.length;
    }

    if (options.type === "uint8array") {
      return result;
    }
    if (options.type === "blob") {
      return new Blob([result], { type: "application/zip" });
    }

    return result;
  }

  private createLocalFileHeader(
    filename: string,
    compressedData: Uint8Array,
    uncompressedSize: number,
    compressed = true,
  ): Uint8Array {
    const filenameBytes = new TextEncoder().encode(filename);
    const header = new Uint8Array(30 + filenameBytes.length);
    const view = new DataView(header.buffer);

    view.setUint32(0, 0x04034b50, true); // Local file header signature
    view.setUint16(4, 20, true); // Version needed to extract
    view.setUint16(6, 0, true); // General purpose bit flag
    view.setUint16(8, compressed ? 8 : 0, true); // Compression method (8 = deflate, 0 = none)
    view.setUint16(10, 0, true); // File last modification time
    view.setUint16(12, 0, true); // File last modification date
    view.setUint32(14, this.crc32(compressedData), true); // CRC-32
    view.setUint32(18, compressedData.length, true); // Compressed size
    view.setUint32(22, uncompressedSize, true); // Uncompressed size
    view.setUint16(26, filenameBytes.length, true); // File name length
    view.setUint16(28, 0, true); // Extra field length

    header.set(filenameBytes, 30);
    return header;
  }

  private createCentralDirectoryEntry(
    filename: string,
    compressedData: Uint8Array,
    uncompressedSize: number,
    offset: number,
    compressed = true,
  ): Uint8Array {
    const filenameBytes = new TextEncoder().encode(filename);
    const entry = new Uint8Array(46 + filenameBytes.length);
    const view = new DataView(entry.buffer);

    view.setUint32(0, 0x02014b50, true); // Central directory file header signature
    view.setUint16(4, 20, true); // Version made by
    view.setUint16(6, 20, true); // Version needed to extract
    view.setUint16(8, 0, true); // General purpose bit flag
    view.setUint16(10, compressed ? 8 : 0, true); // Compression method
    view.setUint16(12, 0, true); // File last modification time
    view.setUint16(14, 0, true); // File last modification date
    view.setUint32(16, this.crc32(compressedData), true); // CRC-32
    view.setUint32(20, compressedData.length, true); // Compressed size
    view.setUint32(24, uncompressedSize, true); // Uncompressed size
    view.setUint16(28, filenameBytes.length, true); // File name length
    view.setUint16(30, 0, true); // Extra field length
    view.setUint16(32, 0, true); // File comment length
    view.setUint16(34, 0, true); // Disk number start
    view.setUint16(36, 0, true); // Internal file attributes
    view.setUint32(38, 0, true); // External file attributes
    view.setUint32(42, offset, true); // Relative offset of local header

    entry.set(filenameBytes, 46);
    return entry;
  }

  private createEndOfCentralDirectory(
    centralDirectory: Uint8Array[],
    centralDirOffset: number,
  ): Uint8Array {
    const cdSize = centralDirectory.reduce(
      (sum, entry) => sum + entry.length,
      0,
    );
    const eocd = new Uint8Array(22);
    const view = new DataView(eocd.buffer);

    view.setUint32(0, 0x06054b50, true); // End of central directory signature
    view.setUint16(4, 0, true); // Number of this disk
    view.setUint16(6, 0, true); // Disk where central directory starts
    view.setUint16(8, this.files.length, true); // Number of central directory records on this disk
    view.setUint16(10, this.files.length, true); // Total number of central directory records
    view.setUint32(12, cdSize, true); // Size of central directory
    view.setUint32(16, centralDirOffset, true); // Offset of start of central directory
    view.setUint16(20, 0, true); // Comment length

    return eocd;
  }

  private crc32(data: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ this.crc32Table[(crc ^ data[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  private crc32Table = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c;
    }
    return table;
  })();
}

// saveAs helper function for downloading files
function saveAs(blob: Blob, filename: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

// Export NFT package as ZIP function
async function exportNftZip(
  layerManager: LayerManager | null,
  previewUrl: string | null,
) {
  if (!layerManager) return;

  try {
    const { width, height } = layerManager.getSize();

    // Get nftConfig from window.editor
    const nftConfig = (window as any).editor?.nftConfig;
    if (!nftConfig || !nftConfig.groups) {
      alert("No trait groups found. Please create layer groups first.");
      return;
    }

    // Create new ZIP instance
    const zip = new SimpleZipCreator();

    // Build metadata for each trait
    const traitsMetadata: any[] = [];

    for (const group of nftConfig.groups) {
      const groupTraits: any[] = [];
      const sanitizedGroupName = sanitize(group.name);

      for (const trait of group.traits) {
        // Get the layer node by ID
        const node = layerManager.getItem(trait.id);
        if (!node || node.type !== "layer" || !node.layer) continue;

        // Get the layer's image data
        const imageData = node.layer.toImageData();

        // Create a canvas to convert ImageData to PNG
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        ctx.imageSmoothingEnabled = false;
        ctx.putImageData(imageData, 0, 0);

        // Convert canvas to blob
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((blob) => resolve(blob), "image/png");
        });

        if (!blob) continue;

        // Convert blob to Uint8Array
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Add to ZIP with organized path
        const sanitizedTraitName = sanitize(trait.name);
        const traitFileName = `${sanitizedTraitName}.png`;
        const traitPath = `traits/${sanitizedGroupName}/${traitFileName}`;
        zip.addFile(traitPath, uint8Array);

        // Add to metadata
        groupTraits.push({
          id: trait.id,
          name: trait.name,
          fileName: traitFileName,
          path: traitPath,
          enabled: trait.enabled,
          weight: trait.weight,
        });
      }

      traitsMetadata.push({
        id: group.id,
        name: group.name,
        traits: groupTraits,
      });
    }

    // Build metadata object
    const metadata = {
      traits: traitsMetadata,
      preview: previewUrl ? "preview.png" : null,
      width,
      height,
      groups: nftConfig.groups,
    };

    // Add metadata.json to ZIP
    zip.addFile("metadata.json", JSON.stringify(metadata, null, 2));

    // Build config object
    const config = {
      groups: nftConfig.groups,
      width,
      height,
    };

    // Add config.json to ZIP
    zip.addFile("config.json", JSON.stringify(config, null, 2));

    // Add preview if available
    if (previewUrl) {
      // Convert data URL to blob
      const response = await fetch(previewUrl);
      const previewBlob = await response.blob();
      const arrayBuffer = await previewBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      zip.addFile("preview.png", uint8Array);
    }

    // Show confirmation dialog
    const _fileCount =
      traitsMetadata.reduce((sum, g) => sum + g.traits.length, 0) +
      2 +
      (previewUrl ? 1 : 0);
    const confirmed = window.confirm(
      `Export NFT Package\n\nThis will create a ZIP archive containing:\n• ${traitsMetadata.reduce((sum, g) => sum + g.traits.length, 0)} trait images\n• metadata.json\n• config.json\n${previewUrl ? "• preview.png\n" : ""}\nTraits will be organized as traits/<group>/<trait>.png\n\nContinue?`,
    );

    if (!confirmed) {
      return;
    }

    // Generate ZIP bytes and trigger single download
    const zipData = await zip.generateAsync({
      type: "uint8array",
      compression: "STORE", // no compression for maximum compatibility
    });

    const zipBlob = new Blob([new Uint8Array(zipData as Uint8Array)], {
      type: "application/zip",
    });

    saveAs(zipBlob, "icpixel-nft-package.zip");
  } catch (error) {
    console.error("Error exporting NFT package:", error);
    alert("Failed to export NFT package. Please try again.");
  }
}

export default function RightSidebar({
  layerManager,
  activeLayerIndex: _activeLayerIndex,
  activeLayerId,
  onLayersChange,
  onSelectLayer,
}: RightSidebarProps) {
  const [activeGroupId, setActiveGroupId] = React.useState<string | null>(null);
  const [isAdjustingOpacity, setIsAdjustingOpacity] = React.useState(false);
  const [renameId, setRenameId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");

  // Drag-and-drop state with refs for drop zone tracking
  const [dragId, setDragId] = React.useState<string | null>(null);
  const dragOverId = React.useRef<string | null>(null);
  const dropPosition = React.useRef<"before" | "inside" | "after" | null>(null);

  // Auto-expand timer management
  const autoExpandTimers = React.useRef<Map<string, any>>(new Map());

  // NFT Builder collapsible states
  const [traitGroupsOpen, setTraitGroupsOpen] = React.useState(true);
  const [_previewGenOpen, _setPreviewGenOpen] = React.useState(true);
  const [exportNftOpen, setExportNftOpen] = React.useState(true);

  // NFT Trait Groups state
  const [traitGroups, setTraitGroups] = React.useState<TraitGroup[]>([]);

  // NFT Preview Generator state
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [rarityScore, setRarityScore] = React.useState<number | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [zoom, setZoom] = React.useState(1);

  // Auto-detect trait groups from layer structure
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  React.useEffect(() => {
    if (!layerManager) return;

    const tree = layerManager.getNodeTree();
    const groups: TraitGroup[] = [];

    // Iterate through top-level nodes to find groups
    for (const node of tree) {
      if (node.type === "group" && node.children && node.children.length > 0) {
        const traits: Trait[] = [];

        // Map child layers to traits (ignore hidden layers)
        for (const child of node.children) {
          if (child.type === "layer" && child.visible) {
            traits.push({
              id: child.id,
              name: child.name,
              enabled: true,
              weight: 50,
            });
          }
        }

        if (traits.length > 0) {
          groups.push({
            id: node.id,
            name: node.name,
            traits,
          });
        }
      }
    }

    setTraitGroups(groups);

    // Store in window.editor.nftConfig
    (window as any).editor = (window as any).editor || {};
    (window as any).editor.nftConfig = { groups };
  }, [layerManager, onLayersChange]);

  // Update trait enabled state
  const handleTraitEnabledChange = (
    groupId: string,
    traitId: string,
    enabled: boolean,
  ) => {
    setTraitGroups((prev) => {
      const updated = prev.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            traits: group.traits.map((trait) =>
              trait.id === traitId ? { ...trait, enabled } : trait,
            ),
          };
        }
        return group;
      });

      // Update window.editor.nftConfig
      (window as any).editor = (window as any).editor || {};
      (window as any).editor.nftConfig = { groups: updated };

      return updated;
    });
  };

  // Update trait weight (rarity)
  const handleTraitWeightChange = (
    groupId: string,
    traitId: string,
    weight: number,
  ) => {
    setTraitGroups((prev) => {
      const updated = prev.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            traits: group.traits.map((trait) =>
              trait.id === traitId ? { ...trait, weight } : trait,
            ),
          };
        }
        return group;
      });

      // Update window.editor.nftConfig
      (window as any).editor = (window as any).editor || {};
      (window as any).editor.nftConfig = { groups: updated };

      return updated;
    });
  };

  // Generate preview function with proper layer compositing and rarity calculation
  async function generatePreview() {
    if (!layerManager) return;

    setIsGenerating(true);

    try {
      const { width, height } = layerManager.getSize();
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        setIsGenerating(false);
        return;
      }

      // Disable smoothing for pixel-perfect rendering
      ctx.imageSmoothingEnabled = false;

      // Get nftConfig from window.editor
      const nftConfig = (window as any).editor?.nftConfig;
      if (!nftConfig || !nftConfig.groups) {
        setIsGenerating(false);
        return;
      }

      // Track selected traits for rarity calculation
      const selectedTraits: { trait: Trait; group: TraitGroup }[] = [];

      // For each trait group, pick a weighted random trait and composite it
      for (const group of nftConfig.groups) {
        const selectedTrait = pickWeightedTrait(group.traits);
        if (!selectedTrait) continue;

        // Store for rarity calculation
        selectedTraits.push({ trait: selectedTrait, group });

        // Get the layer node by ID
        const node = layerManager.getItem(selectedTrait.id);
        if (!node || node.type !== "layer" || !node.layer) continue;

        // Get the layer's image data
        const imageData = node.layer.toImageData();

        // Create a temporary canvas for this layer
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext("2d");

        if (!tempCtx) continue;

        tempCtx.imageSmoothingEnabled = false;
        tempCtx.putImageData(imageData, 0, 0);

        // Composite the layer onto the main canvas
        ctx.drawImage(tempCanvas, 0, 0);
      }

      // Calculate average rarity percentage based on weighted traits
      let totalRarity = 0;
      let traitCount = 0;

      for (const { trait, group } of selectedTraits) {
        const enabledTraits = group.traits.filter((t) => t.enabled);
        const totalWeight = enabledTraits.reduce((sum, t) => sum + t.weight, 0);

        if (totalWeight > 0) {
          // Calculate rarity as percentage (lower weight = higher rarity)
          const rarityPercent = (trait.weight / totalWeight) * 100;
          totalRarity += rarityPercent;
          traitCount++;
        }
      }

      const averageRarity = traitCount > 0 ? totalRarity / traitCount : 0;

      // Set rarity score state
      setRarityScore(traitCount > 0 ? averageRarity : null);

      // Generate PNG data URL
      const dataUrl = canvas.toDataURL("image/png");
      setPreviewUrl(dataUrl);
    } catch (error) {
      console.error("Error generating preview:", error);
    } finally {
      setIsGenerating(false);
    }
  }

  // Download preview function
  function downloadPreview() {
    if (!previewUrl) return;

    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = "nft-preview.png";
    link.click();
  }

  if (!layerManager) {
    return (
      <aside
        className="flex h-full w-96 flex-col border-l bg-background"
        data-editor-ui="true"
      >
        <Tabs
          defaultValue="properties"
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid grid-cols-3 w-full shrink-0">
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="layers">Layers</TabsTrigger>
            <TabsTrigger value="nft">NFT</TabsTrigger>
          </TabsList>
          <TabsContent value="properties" className="flex-1 overflow-auto p-3">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </TabsContent>
          <TabsContent value="layers" className="flex-1 overflow-auto p-3">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </TabsContent>
          <TabsContent value="nft" className="flex-1 overflow-auto p-3">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </TabsContent>
        </Tabs>
      </aside>
    );
  }

  // Get hierarchical tree structure instead of flat layers
  const tree = layerManager.getNodeTree();
  const activeLayerIdFromManager = layerManager.getActiveLayerId();

  const handleAddLayer = () => {
    const layerCount = layerManager.getLayerCount();
    layerManager.createLayer(`Layer ${layerCount + 1}`);
    onLayersChange();
  };

  const handleAddGroup = () => {
    const _groupId = layerManager.createGroup(`Group ${tree.length + 1}`);
    onLayersChange();
  };

  const handleSelectGroup = (id: string) => {
    setActiveGroupId(id);
    onSelectLayer(null);
  };

  const handleSelectLayer = (id: string) => {
    const node = layerManager.getItem(id);
    if (node?.locked) return;

    setActiveGroupId(null);
    layerManager.setActiveLayer(id);
    onLayersChange();
  };

  const startRename = (id: string, currentName: string) => {
    setRenameId(id);
    setRenameValue(currentName);
  };

  const confirmRename = (id: string) => {
    if (renameValue.trim()) {
      layerManager.renameById(id, renameValue.trim());
      onLayersChange();
    }
    setRenameId(null);
    setRenameValue("");
  };

  const cancelRename = () => {
    setRenameId(null);
    setRenameValue("");
  };

  const handleDuplicate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = layerManager.duplicateById(id);
    if (newId) {
      onLayersChange();
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const node = layerManager.getItem(id);
    if (!node) return;

    // Safe group deletion with confirmation
    if (node.type === "group") {
      const confirmed = window.confirm(
        "Delete this group and ALL of its contents?",
      );
      if (!confirmed) {
        return;
      }
    }

    // Don't delete if it's the last layer
    if (node.type === "layer") {
      const layerCount = layerManager.getLayerCount();
      if (layerCount <= 1) {
        return;
      }
    }

    layerManager.deleteById(id);

    // Clear active group if deleting active group
    if (activeGroupId === id) {
      setActiveGroupId(null);
    }

    onLayersChange();
  };

  // Clear all auto-expand timers
  const clearAllTimers = () => {
    for (const timer of autoExpandTimers.current.values()) {
      clearTimeout(timer);
    }
    autoExpandTimers.current.clear();
  };

  // Enhanced drag-and-drop handlers
  const handleDragStart = (id: string) => {
    setDragId(id);
    dragOverId.current = null;
    dropPosition.current = null;
  };

  const handleDragOver = (id: string, e: React.DragEvent) => {
    e.preventDefault();

    if (!dragId || dragId === id) return;

    dragOverId.current = id;

    // Calculate drop position based on mouse Y position
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const height = rect.height;
    const third = height / 3;

    const node = layerManager.getItem(id);

    if (mouseY < third) {
      dropPosition.current = "before";
    } else if (mouseY > height - third) {
      dropPosition.current = "after";
    } else {
      // Middle third - "inside" for groups, "before" for layers
      dropPosition.current = node?.type === "group" ? "inside" : "before";
    }

    // Auto-expand collapsed groups on hover
    if (node && node.type === "group" && node.collapsed) {
      // Clear existing timer for this node
      if (autoExpandTimers.current.has(id)) {
        clearTimeout(autoExpandTimers.current.get(id));
      }

      // Set new timer
      const timer = setTimeout(() => {
        layerManager.toggleGroupCollapsed(id);
        onLayersChange();
        autoExpandTimers.current.delete(id);
      }, 300);

      autoExpandTimers.current.set(id, timer);
    }
  };

  const handleDragLeave = (id: string) => {
    // Clear timer for this node
    if (autoExpandTimers.current.has(id)) {
      clearTimeout(autoExpandTimers.current.get(id));
      autoExpandTimers.current.delete(id);
    }
  };

  const handleDrop = (targetId: string) => {
    if (!dragId || !targetId || dragId === targetId) {
      setDragId(null);
      dragOverId.current = null;
      dropPosition.current = null;
      clearAllTimers();
      return;
    }

    const position = dropPosition.current || "before";

    // Perform the move with safety validation
    const success = layerManager.moveLayerOrGroup(dragId, targetId, position);

    if (success) {
      onLayersChange();
    }

    setDragId(null);
    dragOverId.current = null;
    dropPosition.current = null;
    clearAllTimers();
  };

  const handleDragEnd = () => {
    setDragId(null);
    dragOverId.current = null;
    dropPosition.current = null;
    clearAllTimers();
  };

  // Recursive function to render each node
  const renderNode = (node: LayerNode, depth: number): React.ReactNode => {
    const isActive =
      node.type === "layer" &&
      activeGroupId === null &&
      node.id === activeLayerIdFromManager;
    const isActiveGroup = node.type === "group" && activeGroupId === node.id;
    const isDragging = dragId === node.id;
    const isDropTarget = dragOverId.current === node.id;
    const indentStyle = { paddingLeft: `${depth * 14}px` };

    // Calculate drop zone visibility
    const showDropBefore = isDropTarget && dropPosition.current === "before";
    const showDropInside =
      isDropTarget &&
      dropPosition.current === "inside" &&
      node.type === "group";
    const showDropAfter = isDropTarget && dropPosition.current === "after";

    if (node.type === "group") {
      return (
        <div key={node.id}>
          {/* Drop zone indicator - before */}
          {showDropBefore && <div className="h-1 bg-primary rounded my-1" />}

          <div
            draggable
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") && handleSelectGroup(node.id)
            }
            onDragStart={() => handleDragStart(node.id)}
            onDragOver={(e) => handleDragOver(node.id, e)}
            onDragLeave={() => handleDragLeave(node.id)}
            onDrop={() => handleDrop(node.id)}
            onDragEnd={handleDragEnd}
            className={`
              rounded-md mb-1 border transition-colors cursor-pointer
              ${
                isActiveGroup
                  ? "bg-primary/20 border-primary/40"
                  : "bg-card/80 border-border/60 hover:bg-accent/50"
              }
              ${isDragging ? "opacity-40 border-dashed" : ""}
              ${isDropTarget ? "ring-2 ring-primary/60" : ""}
            `}
            onClick={() => handleSelectGroup(node.id)}
          >
            <div className="flex items-center gap-1 p-2" style={indentStyle}>
              {/* Expand/Collapse Chevron */}
              <button
                type="button"
                className="shrink-0 p-0.5 hover:bg-accent rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  layerManager.toggleGroupCollapsed(node.id);
                  onLayersChange();
                }}
                title={node.collapsed ? "Expand Group" : "Collapse Group"}
              >
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${node.collapsed ? "-rotate-90" : ""}`}
                />
              </button>

              {/* Folder Icon */}
              <Folder className="h-4 w-4 text-muted-foreground shrink-0" />

              {/* Group Name */}
              <div className="flex-1 min-w-0">
                {renameId === node.id ? (
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        confirmRename(node.id);
                      } else if (e.key === "Escape") {
                        cancelRename();
                      }
                    }}
                    onBlur={() => cancelRename()}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-sm bg-background border border-border rounded px-1 py-0.5"
                  />
                ) : (
                  <div
                    className="text-sm truncate font-medium"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startRename(node.id, node.name);
                    }}
                  >
                    {node.name}
                  </div>
                )}
              </div>

              {/* Duplicate Group Button */}
              <button
                type="button"
                className="shrink-0 p-1 hover:bg-accent rounded"
                onClick={(e) => handleDuplicate(node.id, e)}
                title="Duplicate Group"
              >
                <Copy className="h-4 w-4 text-muted-foreground" />
              </button>

              {/* Delete Group Button */}
              <button
                type="button"
                className="shrink-0 p-1 hover:bg-destructive/20 rounded"
                onClick={(e) => handleDelete(node.id, e)}
                title="Delete Group"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Drop zone indicator - inside (above children) */}
            {showDropInside && (
              <div className="h-1 bg-primary/60 rounded my-1 ml-4" />
            )}
          </div>

          {/* Drop zone indicator - after */}
          {showDropAfter && <div className="h-1 bg-primary rounded my-1" />}

          {/* Render children if not collapsed */}
          {!node.collapsed && node.children && node.children.length > 0 && (
            <div className="ml-6">
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }
    // Layer node
    const sliderIndentStyle = {
      paddingLeft: `${(depth === 0 ? 1 : depth) * 14}px`,
    };
    const blendIndentStyle = {
      paddingLeft: `${(depth === 0 ? 1 : depth) * 14}px`,
    };

    return (
      <div key={node.id}>
        {/* Drop zone indicator - before */}
        {showDropBefore && <div className="h-1 bg-primary rounded my-1" />}

        <div
          draggable={!node.locked && !isAdjustingOpacity}
          onDragStart={() => handleDragStart(node.id)}
          onDragOver={(e) => handleDragOver(node.id, e)}
          onDragLeave={() => handleDragLeave(node.id)}
          onDrop={() => handleDrop(node.id)}
          onDragEnd={handleDragEnd}
          className={`
              rounded-md mb-1
              transition-colors
              ${
                isActive
                  ? "bg-primary/20 border border-primary/40"
                  : "bg-card hover:bg-accent/50 border border-transparent"
              }
              ${isDragging ? "opacity-40 border-dashed" : ""}
              ${isDropTarget ? "ring-2 ring-primary/60" : ""}
            `}
        >
          <div
            className="flex items-center gap-2 p-2 cursor-pointer"
            style={indentStyle}
            onClick={() => handleSelectLayer(node.id)}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") && handleSelectLayer(node.id)
            }
          >
            {/* Visibility Toggle */}
            <button
              type="button"
              className="shrink-0 p-1 hover:bg-accent rounded"
              onClick={(e) => {
                e.stopPropagation();
                layerManager.toggleVisibilityById(node.id);
                onLayersChange();
              }}
              title={node.visible ? "Hide Layer" : "Show Layer"}
            >
              {node.visible ? (
                <Eye className="h-4 w-4 text-muted-foreground" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground/50" />
              )}
            </button>

            {/* Layer Name */}
            <div className="flex-1 min-w-0">
              {renameId === node.id ? (
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      confirmRename(node.id);
                    } else if (e.key === "Escape") {
                      cancelRename();
                    }
                  }}
                  onBlur={() => cancelRename()}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full text-sm bg-background border border-border rounded px-1 py-0.5"
                />
              ) : (
                <div
                  className="text-sm truncate"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startRename(node.id, node.name);
                  }}
                >
                  {node.name}
                </div>
              )}
            </div>

            {/* Lock Toggle */}
            <button
              type="button"
              className="shrink-0 p-1 hover:bg-accent rounded"
              onClick={(e) => {
                e.stopPropagation();
                layerManager.toggleLockedById(node.id);
                onLayersChange();
              }}
              title={node.locked ? "Unlock Layer" : "Lock Layer"}
            >
              {node.locked ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Unlock className="h-4 w-4 text-muted-foreground/50" />
              )}
            </button>

            {/* Duplicate Layer Button */}
            <button
              type="button"
              className="shrink-0 p-1 hover:bg-accent rounded"
              onClick={(e) => handleDuplicate(node.id, e)}
              title="Duplicate Layer"
            >
              <Copy className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Delete Button */}
            <button
              type="button"
              className={`
                  shrink-0 p-1 hover:bg-destructive/20 rounded
                  ${layerManager.getLayerCount() <= 1 ? "opacity-30 cursor-not-allowed" : ""}
                `}
              onClick={(e) => handleDelete(node.id, e)}
              disabled={layerManager.getLayerCount() <= 1}
              title={
                layerManager.getLayerCount() <= 1
                  ? "Cannot delete last layer"
                  : "Delete Layer"
              }
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Opacity Slider - visible only when active */}
          {isActive && (
            <div className="px-2 pb-1 mt-1 space-y-2" style={sliderIndentStyle}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Opacity</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {Math.round(node.opacity * 100)}%
                </span>
              </div>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[Math.round(node.opacity * 100)]}
                onValueChange={(value) => {
                  layerManager.setOpacityById(node.id, value[0] / 100);
                  onLayersChange();
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setIsAdjustingOpacity(true);
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  setIsAdjustingOpacity(false);
                }}
                className="w-full"
              />
            </div>
          )}

          {/* Blend Mode Dropdown - visible only when active */}
          {isActive && (
            <div className="px-2 pb-2" style={blendIndentStyle}>
              <select
                value={node.blendMode}
                onChange={(e) => {
                  layerManager.setBlendModeById(node.id, e.target.value as any);
                  onLayersChange();
                }}
                className="text-xs bg-background border border-border/60 rounded px-1 py-0.5"
              >
                <option value="normal">Normal</option>
                <option value="multiply">Multiply</option>
                <option value="add">Add</option>
              </select>
            </div>
          )}
        </div>

        {/* Drop zone indicator - after */}
        {showDropAfter && <div className="h-1 bg-primary rounded my-1" />}
      </div>
    );
  };

  return (
    <aside
      className="flex h-full w-96 flex-col border-l bg-background"
      data-editor-ui="true"
    >
      <Tabs
        defaultValue="properties"
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="grid grid-cols-3 w-full shrink-0">
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="layers">Layers</TabsTrigger>
          <TabsTrigger value="nft">NFT</TabsTrigger>
        </TabsList>

        <TabsContent value="properties" className="flex-1 overflow-auto p-3">
          <div className="space-y-3">
            {/* COLOR Section Header */}
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Color
            </div>

            <ColorPanel />

            {/* Visual separator between Color and Tool Properties */}
            <div className="border-t pt-3 mt-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Tool Properties
              </div>
              <ToolProperties />
            </div>

            {/* Layer Properties Section */}
            <div className="border-t pt-3 mt-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Layer Properties
              </div>
              <LayerPropertiesPanel
                layerManager={layerManager}
                activeLayerId={activeLayerId}
                onLayersChange={onLayersChange}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="layers" className="flex-1 overflow-auto p-3">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="pb-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold">Layers</h2>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleAddLayer}
                  title="Add Layer"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleAddGroup}
                  title="Add Group"
                >
                  <Folder className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Layer List */}
            <div className="flex-1 overflow-auto py-2">
              <div className="space-y-1">
                {tree.length === 0 ? (
                  <div className="p-4 text-center">
                    <div className="text-sm text-muted-foreground">
                      No layers
                    </div>
                    <div className="text-xs text-muted-foreground/70 mt-1">
                      Click + to add a layer
                    </div>
                  </div>
                ) : (
                  tree.map((node) => renderNode(node, 0))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-border/50">
              <div className="text-xs text-muted-foreground/50 text-center">
                {layerManager.getLayerCount()}{" "}
                {layerManager.getLayerCount() === 1 ? "layer" : "layers"}
                {tree.filter((n) => n.type === "group").length > 0 &&
                  ` • ${tree.filter((n) => n.type === "group").length} ${tree.filter((n) => n.type === "group").length === 1 ? "group" : "groups"}`}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="nft" className="flex-1 overflow-auto p-3">
          <div className="space-y-3">
            {/* Trait Groups Collapsible */}
            <Collapsible
              open={traitGroupsOpen}
              onOpenChange={setTraitGroupsOpen}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded hover:bg-accent/50 transition-colors">
                <span className="text-sm font-medium">Trait Groups</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${traitGroupsOpen ? "" : "-rotate-90"}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 px-2">
                {traitGroups.length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    No trait groups detected. Create layer groups to define
                    traits.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {traitGroups.map((group) => (
                      <div
                        key={group.id}
                        className="border rounded p-2 bg-card/30"
                      >
                        <div className="text-xs font-semibold mb-2">
                          {group.name}
                        </div>
                        <div className="space-y-1">
                          {group.traits.map((trait) => (
                            <div
                              key={trait.id}
                              className="flex items-center gap-2"
                            >
                              <Checkbox
                                checked={trait.enabled}
                                onCheckedChange={(checked) =>
                                  handleTraitEnabledChange(
                                    group.id,
                                    trait.id,
                                    checked === true,
                                  )
                                }
                              />
                              <span className="text-xs flex-1 min-w-0 truncate">
                                {trait.name}
                              </span>
                              <Slider
                                min={0}
                                max={100}
                                step={1}
                                value={[trait.weight]}
                                onValueChange={(value) =>
                                  handleTraitWeightChange(
                                    group.id,
                                    trait.id,
                                    value[0],
                                  )
                                }
                                className="w-16"
                              />
                              <span className="text-xs text-muted-foreground font-mono w-8 text-right">
                                {trait.weight}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Preview Generator Section */}
            <div className="border rounded bg-muted p-3 space-y-3">
              <h3 className="text-sm font-medium">Preview</h3>

              {/* Preview Display */}
              <div className="border border-border rounded bg-background p-2 min-h-[120px] flex items-center justify-center overflow-auto relative">
                {previewUrl ? (
                  <>
                    <img
                      src={previewUrl}
                      alt="NFT Preview"
                      style={{
                        width: `${200 * zoom}px`,
                        height: "auto",
                        imageRendering: "pixelated",
                      }}
                    />
                    {rarityScore !== null && (
                      <div className="absolute left-2 top-2 rounded-md bg-background/90 px-2 py-0.5 text-[11px] font-medium text-foreground shadow-sm border border-border/60">
                        {rarityScore.toFixed(1)}%
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    No preview generated yet
                  </div>
                )}
              </div>

              {/* Zoom Controls */}
              {previewUrl && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.5))}
                    disabled={zoom <= 0.5}
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                  <span className="text-xs font-mono text-muted-foreground min-w-[3rem] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setZoom(Math.min(4, zoom + 0.5))}
                    disabled={zoom >= 4}
                    title="Zoom In"
                  >
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generatePreview}
                  disabled={isGenerating || traitGroups.length === 0}
                  className="flex-1 text-xs hover:bg-accent"
                >
                  {isGenerating ? "Generating…" : "Generate"}
                </Button>

                {previewUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadPreview}
                    className="flex items-center gap-1 text-xs hover:bg-accent"
                  >
                    <Download className="h-3 w-3" />
                    Download PNG
                  </Button>
                )}
              </div>
            </div>

            {/* Export NFT Package Collapsible */}
            <Collapsible open={exportNftOpen} onOpenChange={setExportNftOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded hover:bg-accent/50 transition-colors">
                <span className="text-sm font-medium">Export NFT Package</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${exportNftOpen ? "" : "-rotate-90"}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 px-2">
                <div className="text-xs text-muted-foreground mb-2">
                  Export all trait layers, metadata, config, and optional
                  preview into a single
                  <span className="font-mono"> icpixel-nft-package.zip</span>{" "}
                  archive. Inside the ZIP, traits are organized as
                  <span className="font-mono">
                    {" "}
                    traits/&lt;group&gt;/&lt;trait&gt;.png
                  </span>
                  .
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportNftZip(layerManager, previewUrl)}
                  className="mt-2 text-xs"
                >
                  Export Package
                </Button>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
