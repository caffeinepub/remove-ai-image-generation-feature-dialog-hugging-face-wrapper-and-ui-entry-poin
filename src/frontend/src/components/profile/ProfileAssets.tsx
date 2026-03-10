import type { ProjectMetadata } from "@/backend";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDeleteProject, useListProjects } from "@/hooks/useQueries";
import { FileImage, FolderOpen, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ProfileAssets() {
  const { data: projects, isLoading } = useListProjects();
  const deleteProject = useDeleteProject();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    return date.toLocaleDateString();
  };

  const formatSize = (bytes: bigint) => {
    const kb = Number(bytes) / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <Card className="font-['Inter'] rounded-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FolderOpen className="w-4 h-4" />
          Saved Projects
        </CardTitle>
        <CardDescription className="text-[10px]">
          Your pixel art creations stored in your personal canister
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <FileImage className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                No saved projects yet
              </p>
              <p className="text-[10px] text-muted-foreground leading-relaxed max-w-md mx-auto">
                Create your first pixel art masterpiece in the editor. Use File
                → Save to store projects in your personal canister.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map(
              ([projectId, metadata]: [string, ProjectMetadata]) => (
                <div
                  key={projectId}
                  className="flex items-center gap-3 p-3 rounded-sm border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-sm bg-muted flex items-center justify-center shrink-0">
                    <FileImage className="w-5 h-5 text-muted-foreground" />
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
                  <Button
                    onClick={() => handleDelete(projectId, metadata.name)}
                    variant="ghost"
                    size="sm"
                    disabled={deletingId === projectId}
                    className="text-[10px] h-7"
                  >
                    {deletingId === projectId ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              ),
            )}
          </div>
        )}

        {/* Project Limit Note */}
        <div className="mt-3 pt-3 border-t">
          <p className="text-[10px] text-muted-foreground text-center">
            Users can only save 2 projects for now.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
