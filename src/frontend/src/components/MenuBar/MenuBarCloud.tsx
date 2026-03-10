import OpenProjectDialog from "@/components/modals/OpenProjectDialog";
import SaveAsDialog from "@/components/modals/SaveAsDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type SaveProjectChunk,
  loadProjectFromChunks,
  prepareProjectForSave,
} from "@/engine/ExportManager";
import { useNewProject, useUpdateProject } from "@/hooks/useQueries";
import { deserializeProject, serializeProject } from "@/lib/projectSerializer";
import { useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Helper function to get the first layer name from hierarchical layer tree
 */
function getFirstLayerName(layerTree: any[]): string | null {
  if (!layerTree || layerTree.length === 0) return null;

  for (const node of layerTree) {
    if (node.type === "layer") {
      return node.name;
    }
    if (node.type === "group" && node.children) {
      const childName = getFirstLayerName(node.children);
      if (childName) return childName;
    }
  }

  return null;
}

/**
 * MenuBarCloud: Backend-dependent menu bar component containing all cloud-related logic
 * (save, save as, upload, open project from backend) with compression, chunking, and progress tracking.
 */
export default function MenuBarCloud() {
  const projectUploadRef = useRef<HTMLInputElement>(null);

  const [openProjectDialog, setOpenProjectDialog] = useState(false);
  const [saveAsDialog, setSaveAsDialog] = useState(false);
  const [projectLimitDialog, setProjectLimitDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Backend hooks
  const updateProject = useUpdateProject();
  const newProject = useNewProject();

  // File Menu Handlers (Cloud only)
  const handleOpen = () => {
    setOpenProjectDialog(true);
  };

  const handleProjectLoaded = async (projectId: string, data: Uint8Array) => {
    try {
      // Check if data is compressed (try to decompress)
      let projectData: Uint8Array = data;
      try {
        // Attempt to load as chunked/compressed data
        const chunks: SaveProjectChunk[] = [
          {
            index: 0,
            total: 1,
            data: data,
          },
        ];
        const decompressed = await loadProjectFromChunks(chunks);
        projectData = decompressed;
      } catch {
        // If decompression fails, assume it's uncompressed legacy format
        projectData = data;
      }

      const project = deserializeProject(projectData);

      // Use resetEditorFromProject to load the project
      if ((window as any).editor?.resetEditorFromProject) {
        (window as any).editor.resetEditorFromProject(project);

        // Update project tracking
        if ((window as any).editor?.setCurrentProjectId) {
          (window as any).editor.setCurrentProjectId(projectId);
        }
        if ((window as any).editor?.setCurrentProjectName) {
          const firstName = getFirstLayerName(
            project.frames[0]?.layerTree || [],
          );
          (window as any).editor.setCurrentProjectName(firstName || "Untitled");
        }

        toast.success("Project loaded successfully");
      } else {
        toast.error("Editor not initialized");
      }
    } catch (error) {
      console.error("Failed to load project:", error);
      toast.error("Failed to load project");
    }
  };

  const handleSave = async () => {
    if (!window.editor?.frameManager) {
      toast.error("Editor not initialized");
      return;
    }

    const currentProjectId = (window as any).editor?.currentProjectId;

    if (!currentProjectId) {
      // No current project, trigger Save As
      setSaveAsDialog(true);
      return;
    }

    setIsSaving(true);
    try {
      const serialized = serializeProject(window.editor.frameManager);

      // Prepare project with compression and chunking
      const chunks = await prepareProjectForSave(serialized);

      if (chunks.length > 1) {
        toast.info(`Saving large project in ${chunks.length} chunks...`);
      }

      // For now, we save only the first chunk (single-chunk approach)
      // Backend doesn't support multi-chunk yet, but compression helps
      const data = chunks[0].data;

      await updateProject.mutateAsync({
        projectId: currentProjectId,
        data,
      });

      toast.success("Project saved successfully");
    } catch (error: any) {
      console.error("Failed to save project:", error);
      toast.error(error.message || "Failed to save project");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAs = () => {
    setSaveAsDialog(true);
  };

  const handleSaveAsConfirm = async (name: string) => {
    if (!window.editor?.frameManager) {
      toast.error("Editor not initialized");
      return;
    }

    setIsSaving(true);
    try {
      const serialized = serializeProject(window.editor.frameManager);

      // Prepare project with compression and chunking
      const chunks = await prepareProjectForSave(serialized);

      if (chunks.length > 1) {
        toast.info(`Saving large project in ${chunks.length} chunks...`);
      }

      // For now, we save only the first chunk (single-chunk approach)
      // Backend doesn't support multi-chunk yet, but compression helps
      const data = chunks[0].data;

      const result = await newProject.mutateAsync({ name, data });

      if (result.__kind__ === "ok") {
        // Update project tracking
        if ((window as any).editor?.setCurrentProjectId) {
          (window as any).editor.setCurrentProjectId(result.ok);
        }
        if ((window as any).editor?.setCurrentProjectName) {
          (window as any).editor.setCurrentProjectName(name);
        }

        toast.success("Project saved successfully");
        setSaveAsDialog(false);
      } else if (result.__kind__ === "err") {
        // Check if the error is the project limit error
        if (result.err === "Maximum number of saved projects reached") {
          setProjectLimitDialog(true);
        } else {
          toast.error(result.err);
        }
      }
    } catch (error: any) {
      console.error("Failed to save project:", error);

      // Check if the error message contains the project limit text
      const errorMessage = error.message || "Failed to save project";
      if (errorMessage.includes("Maximum number of saved projects reached")) {
        setProjectLimitDialog(true);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpload = () => {
    projectUploadRef.current?.click();
  };

  const handleProjectUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      // Validate it's a valid project file
      let projectData: Uint8Array = data;
      try {
        // Try to load as compressed/chunked
        const chunks: SaveProjectChunk[] = [
          {
            index: 0,
            total: 1,
            data: data,
          },
        ];
        const decompressed = await loadProjectFromChunks(chunks);
        projectData = decompressed;
      } catch {
        // If decompression fails, assume uncompressed
        projectData = data;
      }

      try {
        const project = deserializeProject(projectData);

        // Use resetEditorFromProject to load the uploaded project
        if ((window as any).editor?.resetEditorFromProject) {
          (window as any).editor.resetEditorFromProject(project);
        }
      } catch {
        toast.error("Invalid project file");
        return;
      }

      // Re-serialize and compress for upload
      const serialized = serializeProject(window.editor!.frameManager);
      const chunks = await prepareProjectForSave(serialized);
      const compressedData = chunks[0].data;

      const name = file.name.replace(/\.(json|icpixel)$/, "");
      const result = await newProject.mutateAsync({
        name,
        data: compressedData,
      });

      if (result.__kind__ === "ok") {
        toast.success("Project uploaded successfully");
      } else if (result.__kind__ === "err") {
        // Check if the error is the project limit error
        if (result.err === "Maximum number of saved projects reached") {
          setProjectLimitDialog(true);
        } else {
          toast.error(result.err);
        }
      }
    } catch (error: any) {
      console.error("Failed to upload project:", error);

      // Check if the error message contains the project limit text
      const errorMessage = error.message || "Failed to upload project";
      if (errorMessage.includes("Maximum number of saved projects reached")) {
        setProjectLimitDialog(true);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSaving(false);
      if (projectUploadRef.current) {
        projectUploadRef.current.value = "";
      }
    }
  };

  return (
    <>
      <div
        className="flex items-center gap-1 menu-bar-cloud"
        data-editor-ui="true"
      >
        {/* Cloud Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="px-3 py-1.5 text-sm hover:bg-accent rounded-sm transition-colors outline-none font-['Inter']"
            disabled={isSaving}
          >
            Cloud
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="dropdown-content absolute z-[900] w-48 font-['Inter']"
            data-editor-ui="true"
          >
            <DropdownMenuItem
              onSelect={handleOpen}
              disabled={isSaving}
              className="text-xs"
            >
              Open…
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={handleSave}
              disabled={isSaving}
              className="text-xs"
            >
              {isSaving ? "Saving…" : "Save"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={handleSaveAs}
              disabled={isSaving}
              className="text-xs"
            >
              Save As…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handleUpload}
              disabled={isSaving}
              className="text-xs"
            >
              Upload Project…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={projectUploadRef}
        type="file"
        accept=".icpixel,.json"
        onChange={handleProjectUpload}
        style={{ display: "none" }}
        disabled={isSaving}
      />

      {/* Dialogs */}
      <OpenProjectDialog
        open={openProjectDialog}
        onOpenChange={setOpenProjectDialog}
        onProjectLoaded={handleProjectLoaded}
      />
      <SaveAsDialog
        open={saveAsDialog}
        onOpenChange={setSaveAsDialog}
        onSave={handleSaveAsConfirm}
        defaultName={
          (window as any).editor?.currentProjectName || "Untitled Project"
        }
        isSaving={isSaving}
      />

      {/* Project Limit Dialog */}
      <Dialog open={projectLimitDialog} onOpenChange={setProjectLimitDialog}>
        <DialogContent className="sm:max-w-md font-['Inter']">
          <DialogHeader>
            <DialogTitle className="text-base">
              Project Limit Reached
            </DialogTitle>
            <DialogDescription className="text-sm">
              You have reached the maximum limit of 2 saved projects.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="default"
              onClick={() => setProjectLimitDialog(false)}
              className="text-sm"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
