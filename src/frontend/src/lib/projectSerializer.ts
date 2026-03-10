import type { FrameManager } from "@/engine/FrameManager";
import type { LayerNode } from "@/engine/LayerManager";

// Recursive serialized node format supporting both group and layer nodes
export interface SerializedLayerNode {
  id: string;
  type: "layer" | "group";
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: string;
  // Only for layer nodes
  pixels?: number[];
  isReference?: boolean;
  // Only for group nodes
  children?: SerializedLayerNode[];
  collapsed?: boolean;
}

export interface SerializedProject {
  version: number;
  canvasWidth: number;
  canvasHeight: number;
  frames: Array<{
    duration: number;
    layerTree: SerializedLayerNode[]; // Changed from flat layers to hierarchical tree
  }>;
}

/**
 * Recursively serialize a layer node (group or layer)
 */
function serializeNode(node: LayerNode): SerializedLayerNode {
  if (node.type === "group") {
    // Group node: serialize with children
    return {
      id: node.id,
      type: "group",
      name: node.name,
      visible: node.visible,
      locked: node.locked,
      opacity: node.opacity,
      blendMode: node.blendMode,
      collapsed: node.collapsed || false,
      children: node.children
        ? node.children.map((child) => serializeNode(child))
        : [],
    };
  }
  // Layer node: serialize with pixel data
  return {
    id: node.id,
    type: "layer",
    name: node.name,
    visible: node.visible,
    locked: node.locked,
    opacity: node.opacity,
    blendMode: node.blendMode,
    pixels: node.layer ? Array.from(node.layer.pixels) : [],
    isReference: node.isReference || false,
  };
}

/**
 * Serialize the complete project including hierarchical layer tree
 */
export function serializeProject(frameManager: FrameManager): Uint8Array {
  const frames = frameManager.getFrames();
  const width = frameManager.width;
  const height = frameManager.height;

  const serialized: SerializedProject = {
    version: 2, // Increment version to indicate hierarchical format
    canvasWidth: width,
    canvasHeight: height,
    frames: frames.map((frame) => {
      // Get the hierarchical tree from LayerManager
      const tree = frame.layerManager.getTree();

      return {
        duration: frame.duration,
        layerTree: tree.map((node) => serializeNode(node)),
      };
    }),
  };

  const json = JSON.stringify(serialized);
  const encoder = new TextEncoder();
  return encoder.encode(json);
}

/**
 * Compress project data using gzip compression
 * @param data - Uncompressed project data
 * @returns Compressed data as Uint8Array
 */
export async function compressProjectData(
  data: Uint8Array,
): Promise<Uint8Array> {
  // Use browser's native CompressionStream API
  // Convert to Array and back to Uint8Array to ensure ArrayBuffer type
  const dataArray = Uint8Array.from(data);
  const stream = new Blob([dataArray]).stream();
  const compressedStream = stream.pipeThrough(new CompressionStream("gzip"));

  const compressedBlob = await new Response(compressedStream).blob();
  const arrayBuffer = await compressedBlob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Decompress project data using gzip decompression
 * @param compressedData - Compressed project data
 * @returns Decompressed data as Uint8Array
 */
export async function decompressProjectData(
  compressedData: Uint8Array,
): Promise<Uint8Array> {
  // Use browser's native DecompressionStream API
  // Convert to Array and back to Uint8Array to ensure ArrayBuffer type
  const dataArray = Uint8Array.from(compressedData);
  const stream = new Blob([dataArray]).stream();
  const decompressedStream = stream.pipeThrough(
    new DecompressionStream("gzip"),
  );

  const decompressedBlob = await new Response(decompressedStream).blob();
  const arrayBuffer = await decompressedBlob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Helper function to reconstruct pixel data from serialized array
 */
function reconstructPixelData(pixels: number[]): Uint8ClampedArray {
  return new Uint8ClampedArray(pixels);
}

/**
 * Recursively deserialize and rebuild a layer node
 * @param nodeData - Serialized node data
 * @param layerManager - LayerManager instance to create nodes in
 * @param parentId - Parent group ID (null for root level)
 */
function deserializeNode(
  nodeData: SerializedLayerNode,
  layerManager: any,
  parentId: string | null,
): void {
  if (nodeData.type === "group") {
    // Create group node first
    const groupId = layerManager.createGroup(nodeData.name);
    const groupNode = layerManager.getItem(groupId);

    if (groupNode) {
      // Set group properties
      groupNode.visible = nodeData.visible;
      groupNode.locked = nodeData.locked;
      groupNode.opacity = nodeData.opacity;
      groupNode.blendMode = nodeData.blendMode;
      groupNode.collapsed = nodeData.collapsed || false;

      // Move group to correct parent if not at root
      if (parentId !== null) {
        layerManager.moveLayerOrGroup(groupId, parentId, "inside");
      }

      // Recursively deserialize children
      if (nodeData.children) {
        for (const childData of nodeData.children) {
          deserializeNode(childData, layerManager, groupId);
        }
      }
    }
  } else {
    // Create layer node
    const layer = layerManager.createLayer(nodeData.name);
    const layerId = layerManager.getActiveLayerId();

    if (layer && layerId) {
      // Set layer properties
      layer.visible = nodeData.visible;
      layer.locked = nodeData.locked;
      layer.opacity = nodeData.opacity;
      layer.blendMode = nodeData.blendMode;

      // Restore pixel data
      if (nodeData.pixels) {
        layer.pixels = reconstructPixelData(nodeData.pixels);
      }

      // Get the layer node and set isReference flag
      const layerNode = layerManager.getItem(layerId);
      if (layerNode) {
        layerNode.isReference = nodeData.isReference || false;
      }

      // Move layer to correct parent if not at root
      if (parentId !== null) {
        layerManager.moveLayerOrGroup(layerId, parentId, "inside");
      }
    }
  }
}

/**
 * Deserialize project data and validate structure
 */
export function deserializeProject(data: Uint8Array): SerializedProject {
  const decoder = new TextDecoder();
  const json = decoder.decode(data);
  const parsed = JSON.parse(json);

  // Validate the structure
  if (
    !parsed.version ||
    !parsed.canvasWidth ||
    !parsed.canvasHeight ||
    !Array.isArray(parsed.frames)
  ) {
    throw new Error("Invalid project file format");
  }

  // Handle legacy flat layer format (version 1)
  if (parsed.version === 1 && parsed.frames.length > 0) {
    // Convert flat layers to hierarchical format
    parsed.version = 2;
    parsed.frames = parsed.frames.map((frame: any) => {
      if (frame.layers && !frame.layerTree) {
        // Convert flat layers array to hierarchical tree at root level
        return {
          duration: frame.duration,
          layerTree: frame.layers.map((layer: any) => ({
            id: layer.id,
            type: "layer",
            name: layer.name,
            visible: layer.visible,
            locked: layer.locked,
            opacity: layer.opacity,
            blendMode: layer.blendMode,
            pixels: layer.pixels,
            isReference: false,
          })),
        };
      }
      return frame;
    });
  }

  return parsed;
}

/**
 * Rebuild the hierarchical layer tree in a LayerManager from serialized data
 * @param layerManager - LayerManager instance to rebuild tree in
 * @param layerTree - Serialized layer tree data
 */
export function rebuildLayerTree(
  layerManager: any,
  layerTree: SerializedLayerNode[],
): void {
  // Clear any existing layers
  const existingNodes = layerManager.flatten();
  for (const node of existingNodes) {
    layerManager.deleteById((node as any).id);
  }

  // Recursively rebuild the tree from root level
  for (const nodeData of layerTree) {
    deserializeNode(nodeData, layerManager, null);
  }
}
