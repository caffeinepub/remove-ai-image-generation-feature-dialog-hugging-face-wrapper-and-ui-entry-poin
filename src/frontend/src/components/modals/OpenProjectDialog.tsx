import type { ProjectMetadata } from "@/backend";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useDeleteProject,
  useGetProject,
  useListProjects,
} from "@/hooks/useQueries";
import { FileImage, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface OpenProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectLoaded: (projectId: string, data: Uint8Array) => void;
}

export default function OpenProjectDialog({
  open,
  onOpenChange,
  onProjectLoaded,
}: OpenProjectDialogProps) {
  const { data: projects, isLoading } = useListProjects();
  const getProject = useGetProject();
  const deleteProject = useDeleteProject();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpen = async (projectId: string) => {
    try {
      const project = await getProject.mutateAsync(projectId);

      if (project?.data) {
        onProjectLoaded(projectId, project.data);
        onOpenChange(false);
      } else {
        toast.error("Project not found");
      }
    } catch (error: any) {
      console.error("Failed to open project:", error);
      toast.error(error.message || "Failed to open project");
    }
  };

  const handleDelete = async (projectId: string, projectName: string) => {
    if (!confirm(`Delete project "${projectName}"? This cannot be undone.`)) {
      return;
    }

    setDeletingId(projectId);
    try {
      await deleteProject.mutateAsync(projectId);
      toast.success(`Project "${projectName}" deleted successfully`);
    } catch (error: any) {
      console.error("Failed to delete project:", error);
      toast.error(error.message || "Failed to delete project");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  const formatSize = (bytes: bigint) => {
    const kb = Number(bytes) / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal container={document.getElementById("dialog-root")}>
        <DialogContent className="max-w-2xl font-['Inter'] z-[1000]">
          <DialogHeader>
            <DialogTitle className="text-base">Open Project</DialogTitle>
            <DialogDescription className="text-xs">
              Select a project to open from your saved projects
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !projects || projects.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <FileImage className="w-8 h-8 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    No saved projects
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Create and save your first project to see it here
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map(
                  ([projectId, metadata]: [string, ProjectMetadata]) => (
                    <div
                      key={projectId}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
                        <FileImage className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-medium truncate">
                          {metadata.name}
                        </h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Modified: {formatDate(metadata.modified)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Size: {formatSize(metadata.size)} • Version:{" "}
                          {metadata.version.toString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleDelete(projectId, metadata.name)}
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === projectId}
                          className="text-[10px] h-8"
                        >
                          {deletingId === projectId ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          onClick={() => handleOpen(projectId)}
                          size="sm"
                          disabled={getProject.isPending}
                          className="text-[10px] h-8"
                        >
                          Open
                        </Button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
