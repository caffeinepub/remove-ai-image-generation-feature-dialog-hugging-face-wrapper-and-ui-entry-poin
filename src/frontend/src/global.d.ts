interface EditorUI {
  openCanvasSizeDialog: () => void;
  openExportDialog: () => void;
  openImportDialog: (file: File) => void;
  toggleFocusMode: () => void;
}

interface EditorClipboard {
  copy: () => void;
  cut: () => void;
  paste: () => void;
  hasData: () => boolean;
}

interface EditorExport {
  pngCurrent: (scale?: number) => Promise<Blob>;
  pngSequence: (
    scale?: number,
  ) => Promise<Array<{ blob: Blob; frameIndex: number }>>;
  spriteSheet: (
    layout: "horizontal" | "vertical" | "grid",
    scale?: number,
  ) => Promise<{ blob: Blob; width: number; height: number }>;
  webm: (fps?: number, transparency?: boolean, scale?: number) => Promise<Blob>;
  importPNG: (
    file: File,
  ) => Promise<{ width: number; height: number; data: Uint8ClampedArray }>;
}

interface EditorAnimation {
  onionSkinOpacity: number;
}

interface Editor {
  resize: (width: number, height: number) => void;
  camera: { zoom: number; offsetX: number; offsetY: number };
  frameManager: any;
  tool: any;
  animation?: EditorAnimation;
  toggleGrid: () => void;
  setTool: (tool: string) => void;
  setFontSize: (size: number) => void;
  undo: () => void;
  redo: () => void;
  refresh: () => void;
  toggleOnionPrev: () => void;
  toggleOnionNext: () => void;
  setOnionStrength: (value: number) => void;
  setPrimaryColorFromOutside?: (
    r: number,
    g: number,
    b: number,
    a: number,
  ) => void;
  ui: EditorUI;
  clipboard: EditorClipboard;
  export: EditorExport;
}

interface Window {
  editor: Editor;
}
