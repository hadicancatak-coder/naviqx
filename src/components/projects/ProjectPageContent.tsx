import { useState } from "react";
import { format } from "date-fns";
import { Edit, Trash2, Share2, Globe, GlobeLock, Copy, ExternalLink, Users, FileText, ListTodo, Info, Calendar, RefreshCw, CalendarClock, Clock, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Project, useProjectAssignees } from "@/hooks/useProjects";
import { ProjectRoadmap } from "./ProjectRoadmap";
import { ProjectTasksSection } from "./ProjectTasksSection";
import { useToast } from "@/hooks/use-toast";
import { useTasks } from "@/hooks/useTasks";
import * as LucideIcons from "lucide-react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
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
  const { data: tasks } = useTasks();

  // Count tasks linked to this project
  const projectTasks = tasks?.filter((t: any) => t.project_id === project.id) || [];
  const taskCount = projectTasks.length;

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
    <div className="space-y-md">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-md">
        <div className="flex items-center gap-sm">
          {/* Breadcrumbs inline */}
          {breadcrumbs.length > 1 && (
            <nav className="flex items-center gap-1 text-body-sm text-muted-foreground mr-2">
              {breadcrumbs.slice(0, -1).map((crumb, idx) => (
                <span key={crumb.id} className="flex items-center gap-1">
                  {idx > 0 && <span>/</span>}
                  <span>{crumb.name}</span>
                </span>
              ))}
              <span>/</span>
            </nav>
          )}
          <IconComponent className="h-5 w-5 text-primary" />
          <h1 className="text-heading-md font-semibold text-foreground">{project.name}</h1>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          {project.is_public ? (
            <Tooltip>
              <TooltipTrigger>
                <Globe className="h-4 w-4 text-success-text" />
              </TooltipTrigger>
              <TooltipContent>Public</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger>
                <GlobeLock className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>Private</TooltipContent>
            </Tooltip>
          )}
          {project.due_date && (
            <span className="text-body-sm text-muted-foreground ml-2">
              Due {format(new Date(project.due_date), "MMM d")}
            </span>
          )}
        </div>

        {isAdmin && (
          <div className="flex items-center gap-1">
            {project.is_public && project.public_token && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyPublicLink}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy link</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => window.open(`/projects/public/${project.public_token}`, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open public</TooltipContent>
                </Tooltip>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onShare}>
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* ROADMAP FIRST - Hero Section */}
      <div className="bg-card border border-border rounded-xl p-lg">
        <ProjectRoadmap projectId={project.id} isAdmin={isAdmin} projectDueDate={project.due_date} />
      </div>

      {/* Tabbed Details Panel */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start bg-muted/50 border border-border rounded-lg p-1">
          <TabsTrigger value="overview" className="gap-1.5">
            <Info className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5">
            <ListTodo className="h-4 w-4" />
            Tasks {taskCount > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{taskCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="details" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Details
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-md">
          <div className="bg-card border border-border rounded-xl p-lg space-y-lg">
            {/* Purpose & Outcomes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
              {project.purpose && (
                <div className="space-y-2">
                  <h3 className="text-body-sm font-medium text-muted-foreground uppercase tracking-wide">Purpose</h3>
                  <p className="text-body text-foreground">{project.purpose}</p>
                </div>
              )}
              {project.outcomes && (
                <div className="space-y-2">
                  <h3 className="text-body-sm font-medium text-muted-foreground uppercase tracking-wide">Expected Outcomes</h3>
                  <p className="text-body text-foreground">{project.outcomes}</p>
                </div>
              )}
            </div>

            {/* Stakeholders */}
            {assignees && assignees.length > 0 && (
              <>
                <Separator />
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
              </>
            )}

            {/* Show message if no content */}
            {!project.purpose && !project.outcomes && (!assignees || assignees.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-body-sm">No overview information added yet</p>
                {isAdmin && (
                  <Button variant="link" size="sm" onClick={onEdit} className="mt-2">
                    Add project details
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-md">
          <div className="bg-card border border-border rounded-xl p-lg">
            <ProjectTasksSection projectId={project.id} projectName={project.name} isAdmin={isAdmin} />
          </div>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-md">
          <ProjectDetailsTab 
            project={project} 
            iconName={iconName}
            IconComponent={IconComponent}
            statusInfo={statusInfo}
            isAdmin={isAdmin}
            onEdit={onEdit}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Metadata Card Component
function MetadataCard({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-subtle rounded-lg border border-border">
      <div className="flex items-center justify-center h-9 w-9 rounded-md bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-metadata text-muted-foreground">{label}</p>
        <p className="text-body-sm font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

// Settings Item Component
function SettingsItem({ 
  icon: Icon, 
  label, 
  children 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-subtle rounded-lg border border-border">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center gap-2">
        <span className="text-body-sm text-muted-foreground">{label}:</span>
        {children}
      </div>
    </div>
  );
}

// Project Details Tab Component
function ProjectDetailsTab({ 
  project, 
  iconName,
  IconComponent,
  statusInfo,
  isAdmin,
  onEdit
}: { 
  project: Project; 
  iconName: string;
  IconComponent: React.ComponentType<{ className?: string }>;
  statusInfo: { label: string; variant: "default" | "secondary" | "outline" | "destructive" };
  isAdmin?: boolean;
  onEdit: () => void;
}) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  const sanitizedDescription = project.description 
    ? DOMPurify.sanitize(project.description) 
    : null;
  
  // Check if description is long enough to need collapsing
  const descriptionLength = project.description?.length || 0;
  const needsCollapse = descriptionLength > 500;

  return (
    <div className="space-y-md">
      {/* Project Metadata Cards */}
      <div className="bg-card border border-border rounded-xl p-lg">
        <h3 className="text-body-sm font-medium text-muted-foreground uppercase tracking-wide mb-md flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Timeline
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-md">
          <MetadataCard 
            icon={Calendar} 
            label="Created" 
            value={format(new Date(project.created_at), "MMM d, yyyy")} 
          />
          <MetadataCard 
            icon={RefreshCw} 
            label="Last Updated" 
            value={format(new Date(project.updated_at), "MMM d, yyyy")} 
          />
          <MetadataCard 
            icon={CalendarClock} 
            label="Deadline" 
            value={project.due_date ? format(new Date(project.due_date), "MMM d, yyyy") : "Not set"} 
          />
          <MetadataCard 
            icon={Clock} 
            label="Est. Time" 
            value={project.required_time ? `${project.required_time}h` : "Not set"} 
          />
        </div>
      </div>

      {/* Project Settings */}
      <div className="bg-card border border-border rounded-xl p-lg">
        <h3 className="text-body-sm font-medium text-muted-foreground uppercase tracking-wide mb-md flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Project Settings
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
          <SettingsItem icon={LucideIcons.Circle} label="Status">
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </SettingsItem>
          <SettingsItem icon={project.is_public ? Globe : GlobeLock} label="Visibility">
            <span className="text-body-sm font-medium text-foreground">
              {project.is_public ? "Public" : "Private"}
            </span>
          </SettingsItem>
          <SettingsItem icon={IconComponent} label="Icon">
            <span className="text-body-sm font-medium text-foreground">{iconName}</span>
          </SettingsItem>
        </div>
      </div>

      {/* Description */}
      <div className="bg-card border border-border rounded-xl p-lg">
        <h3 className="text-body-sm font-medium text-muted-foreground uppercase tracking-wide mb-md flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Description
        </h3>
        
        {sanitizedDescription ? (
          <div className="space-y-3">
            <div 
              className={cn(
                "relative overflow-hidden transition-all duration-300",
                !isDescriptionExpanded && needsCollapse && "max-h-[200px]"
              )}
            >
              <div
                className="prose prose-sm max-w-none dark:prose-invert 
                  prose-headings:text-foreground prose-p:text-foreground 
                  prose-strong:text-foreground prose-a:text-primary
                  prose-li:text-foreground prose-ul:text-foreground prose-ol:text-foreground"
                dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
              />
              {!isDescriptionExpanded && needsCollapse && (
                <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-card to-transparent pointer-events-none" />
              )}
            </div>
            {needsCollapse && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="gap-1.5"
              >
                {isDescriptionExpanded ? (
                  <>Show less <ChevronUp className="h-4 w-4" /></>
                ) : (
                  <>Show more <ChevronDown className="h-4 w-4" /></>
                )}
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-body-sm">No description added yet</p>
            {isAdmin && (
              <Button variant="link" size="sm" onClick={onEdit} className="mt-2">
                Add description
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}