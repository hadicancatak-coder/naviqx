import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Settings2, Clock, Users, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TagsMultiSelect } from "@/components/tasks/TagsMultiSelect";
import { SprintSelector } from "@/components/tasks/SprintSelector";
import { PhaseSelector } from "./PhaseSelector";
import { useTaskDetailContext } from "./TaskDetailContext";
import { useProjects } from "@/hooks/useProjects";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

export function TaskDetailDetails() {
  const {
    task,
    mutations,
    isCollaborative,
    setIsCollaborative,
    collaborativeStatus,
    isCompleted,
    realtimeAssignees,
  } = useTaskDetailContext();
  
  const { projects } = useProjects();
  // Collapsed by default to reduce clutter
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  // Derive values from task (single source of truth)
  const tags = Array.isArray(task?.labels) ? task.labels : [];
  const projectId = task?.project_id || null;
  const phaseId = task?.phase_id || null;
  const selectedAssignees = realtimeAssignees.map(a => a.id);

  const getAgeText = (createdAt: string | null) => {
    if (!createdAt) return '—';
    const days = differenceInDays(new Date(), new Date(createdAt));
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    return `${days} days`;
  };

  // Direct mutation handlers
  const handleTagsChange = (newTags: string[]) => {
    if (task?.id) {
      mutations.updateTask.mutate({ id: task.id, updates: { labels: newTags } });
    }
  };

  const handleProjectChange = (value: string) => {
    if (task?.id) {
      const newProjectId = value === "none" ? null : value;
      mutations.updateTask.mutate({ 
        id: task.id, 
        updates: { 
          project_id: newProjectId,
          // Reset phase when project changes
          ...(newProjectId !== projectId ? { phase_id: null } : {})
        } 
      });
    }
  };

  const handlePhaseChange = (newPhaseId: string | null) => {
    if (task?.id) {
      mutations.updateTask.mutate({ id: task.id, updates: { phase_id: newPhaseId } });
    }
  };

  const handleSprintChange = (sprintId: string | null) => {
    if (task?.id) {
      mutations.updateTask.mutate({ id: task.id, updates: { sprint: sprintId } });
    }
  };

  return (
    <Collapsible open={detailsExpanded} onOpenChange={setDetailsExpanded}>
      <CollapsibleTrigger className="flex items-center gap-xs w-full py-xs hover:bg-muted/50 rounded-md -mx-xs px-xs transition-smooth">
        {detailsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <Label className="text-body-sm font-medium cursor-pointer flex items-center gap-xs">
          <Settings2 className="h-4 w-4" />
          Details
        </Label>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pt-sm space-y-md">
        {/* Collaborative Mode (only show if multiple assignees) */}
        {selectedAssignees.length > 1 && (
          <div className="space-y-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-xs">
                <Label className="text-metadata text-muted-foreground flex items-center gap-xs">
                  <Users className="h-3.5 w-3.5" />
                  Collaborative Task
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isCollaborative 
                    ? "All assignees must complete" 
                    : "Any assignee can complete"}
                </p>
              </div>
              <Switch
                checked={isCollaborative}
                onCheckedChange={setIsCollaborative}
                disabled={isCompleted}
              />
            </div>
            
            {/* Show completion status for collaborative tasks */}
            {isCollaborative && collaborativeStatus && (
              <div className="mt-sm space-y-xs">
                <Label className="text-xs text-muted-foreground">
                  Completion Status ({collaborativeStatus.assignees.filter(a => a.completed).length}/{collaborativeStatus.assignees.length})
                </Label>
                <div className="space-y-xs">
                  {collaborativeStatus.assignees.map((assignee) => (
                    <div 
                      key={assignee.id} 
                      className={cn(
                        "flex items-center justify-between text-xs p-xs rounded",
                        assignee.completed ? "bg-success-soft" : "bg-muted/50"
                      )}
                    >
                      <span>{assignee.name}</span>
                      {assignee.completed ? (
                        <Check className="h-3.5 w-3.5 text-success-text" />
                      ) : (
                        <span className="text-muted-foreground">Pending</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Separator />
          </div>
        )}

        {/* Tags */}
        <div className="space-y-xs">
          <Label className="text-metadata text-muted-foreground">Tags</Label>
          <TagsMultiSelect
            value={tags}
            onChange={handleTagsChange}
          />
        </div>

        {/* Project */}
        <div className="space-y-xs">
          <Label className="text-metadata text-muted-foreground">Project</Label>
          <Select 
            value={projectId || "none"} 
            onValueChange={handleProjectChange}
          >
            <SelectTrigger className="w-full">
              <FolderKanban className="h-4 w-4 mr-2" />
              <SelectValue placeholder="No project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No project</SelectItem>
              {projects?.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Phase Selector - only show when project is selected */}
        <PhaseSelector
          projectId={projectId}
          value={phaseId}
          onChange={handlePhaseChange}
        />

        {/* Sprint */}
        <div className="space-y-xs">
          <Label className="text-metadata text-muted-foreground">Sprint</Label>
          <SprintSelector
            value={task?.sprint || null}
            onChange={handleSprintChange}
          />
        </div>

        <Separator />

        {/* Date Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-sm">
          <div className="space-y-0.5">
            <Label className="text-metadata text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Created
            </Label>
            <p className="text-body-sm text-foreground">
              {task?.created_at ? format(new Date(task.created_at), 'MMM d, yyyy') : '—'}
            </p>
          </div>
          <div className="space-y-0.5">
            <Label className="text-metadata text-muted-foreground">Updated</Label>
            <p className="text-body-sm text-foreground">
              {task?.updated_at ? formatDistanceToNow(new Date(task.updated_at), { addSuffix: true }) : '—'}
            </p>
          </div>
          <div className="space-y-0.5">
            <Label className="text-metadata text-muted-foreground">Age</Label>
            <p className="text-body-sm text-foreground">
              {getAgeText(task?.created_at)}
            </p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
