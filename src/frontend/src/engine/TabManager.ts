import type { EditorRuntime } from "../editor/EditorRuntime";

export interface TabState {
  id: string;
  name: string;
  runtime: EditorRuntime;
  camera: { zoom: number; offsetX: number; offsetY: number };
  canvasSize: { width: number; height: number };
  activeLayerId: string | null;
  isDirty: boolean;
  projectId: string | null;
  projectName: string | null;
}

export function createTab(
  id: string,
  name: string,
  runtime: EditorRuntime,
): TabState {
  return {
    id,
    name,
    runtime,
    camera: { zoom: 1, offsetX: 0, offsetY: 0 },
    canvasSize: { width: runtime.canvasWidth, height: runtime.canvasHeight },
    activeLayerId: null,
    isDirty: false,
    projectId: null,
    projectName: null,
  };
}
