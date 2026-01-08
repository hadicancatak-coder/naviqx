import { format } from "date-fns";
import { Edit, Trash2, Share2, Globe, GlobeLock, Copy, ExternalLink, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Project, useProjectAssignees } from "@/hooks/useProjects";
import { ProjectRoadmap } from "./ProjectRoadmap";
import { ProjectTasksSection } from "./ProjectTasksSection";
import { useToast } from "@/hooks/use-toast";
import * as LucideIcons from "lucide-react";
import DOMPurify from "dompurify";

interface ProjectPageContentProps {
  project: Project;
  breadcrumbs: Project[];
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  isAdmin?: boolean;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  planning: { label: "Planning", variant: "secondary" },
  active: { label: "Active", variant: "default" },
  "on-hold": { label: "On Hold", variant: "outline" },
  completed: { label: "Completed", variant: "secondary" },
};

export function ProjectPageContent({
  project,
  breadcrumbs,
  onEdit,
  onDelete,
  onShare,
  isAdmin,
}: ProjectPageContentProps) {
  const { toast } = useToast();
  const { assignees } = useProjectAssignees(project.id);

  const iconName = project.icon || "folder-kanban";
  const iconKey = iconName.split("-").map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconKey] || LucideIcons.FolderKanban;

  const statusInfo = statusLabels[project.status] || statusLabels.planning;

  const handleCopyPublicLink = () => {
    if (project.public_token) {
      const url = `${window.location.origin}/projects/public/${project.public_token}`;
      navigator.clipboard.writeText(url);
      toast({ title: "Public link copied to clipboard" });
    }
  };

  return (
    <div className="space-y-lg">
      {/* Breadcrumbs */}
      {breadcrumbs.length > 1 && (
        <nav className="flex items-center gap-1 text-body-sm text-muted-foreground">
          {breadcrumbs.map((crumb, idx) => (
            <span key={crumb.id} className="flex items-center gap-1">
              {idx > 0 && <span>/</span>}
              <span className={idx === breadcrumbs.length - 1 ? "text-foreground font-medium" : ""}>
                {crumb.name}
              </span>
            </span>
          ))}
        </nav>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-md">
        <div className="flex items-start gap-md">
          <div className="p-3 bg-primary/10 rounded-xl">
            <IconComponent className="h-8 w-8 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-sm">
              <h1 className="text-heading-lg font-semibold text-foreground">{project.name}</h1>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              {project.is_public ? (
                <Tooltip>
                  <TooltipTrigger>
                    <Globe className="h-4 w-4 text-success-text" />
                  </TooltipTrigger>
                  <TooltipContent>Public - Anyone with the link can view</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger>
                    <GlobeLock className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>Private - Only team members can view</TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-metadata text-muted-foreground mt-1">
              Last updated {format(new Date(project.updated_at), "MMMM d, yyyy")}
              {project.due_date && (
                <span className="ml-2">• Due {format(new Date(project.due_date), "MMM d, yyyy")}</span>
              )}
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            {project.is_public && project.public_token && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleCopyPublicLink}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy public link</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/projects/public/${project.public_token}`, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open public page</TooltipContent>
                </Tooltip>
              </>
            )}
            <Button variant="outline" size="sm" onClick={onShare}>
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Project Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        {/* Purpose */}
        {project.purpose && (
          <div className="space-y-2">
            <h3 className="text-body-sm font-medium text-muted-foreground uppercase tracking-wide">Purpose</h3>
            <p className="text-body text-foreground">{project.purpose}</p>
          </div>
        )}

        {/* Outcomes */}
        {project.outcomes && (
          <div className="space-y-2">
            <h3 className="text-body-sm font-medium text-muted-foreground uppercase tracking-wide">Expected Outcomes</h3>
            <p className="text-body text-foreground">{project.outcomes}</p>
          </div>
        )}
      </div>

      {/* Stakeholders */}
      {assignees && assignees.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-body-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Users className="h-4 w-4" />
            Stakeholders
          </h3>
          <div className="flex flex-wrap gap-2">
            {assignees.map((assignee: any) => (
              <div
                key={assignee.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-subtle rounded-full"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={assignee.profiles?.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {assignee.profiles?.name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-body-sm">{assignee.profiles?.name || assignee.profiles?.email}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {project.description && (
        <div className="space-y-2">
          <h3 className="text-body-sm font-medium text-muted-foreground uppercase tracking-wide">Description</h3>
          <div
            className="prose prose-sm max-w-none dark:prose-invert 
              prose-headings:text-foreground prose-p:text-foreground 
              prose-strong:text-foreground prose-a:text-primary
              prose-li:text-foreground"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(project.description) }}
          />
        </div>
      )}

      <Separator />

      {/* Roadmap */}
      <ProjectRoadmap projectId={project.id} isAdmin={isAdmin} />

      <Separator />

      {/* Tasks */}
      <ProjectTasksSection projectId={project.id} projectName={project.name} isAdmin={isAdmin} />
    </div>
  );
}
