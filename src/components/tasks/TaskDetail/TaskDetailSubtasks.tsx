import { useState } from "react";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TaskChecklistSection } from "@/components/TaskChecklistSection";
import { TaskDependenciesSection } from "@/components/TaskDependenciesSection";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useTaskDetailContext } from "./TaskDetailContext";

export function TaskDetailSubtasks() {
  const { taskId, status, blocker, setBlockerDialogOpen } = useTaskDetailContext();
  const [subtasksExpanded, setSubtasksExpanded] = useState(true);

  return (
    <div className="space-y-md">
      {/* Subtasks / Checklist */}
      <Collapsible open={subtasksExpanded} onOpenChange={setSubtasksExpanded}>
        <CollapsibleTrigger className="flex items-center gap-xs w-full py-xs hover:bg-muted/50 rounded-md -mx-xs px-xs transition-smooth">
          {subtasksExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Label className="text-body-sm font-medium cursor-pointer">Subtasks</Label>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-sm">
          <TaskChecklistSection taskId={taskId} readOnly={false} />
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Dependencies */}
      <div className="space-y-xs">
        <Label className="text-metadata text-muted-foreground">Dependencies</Label>
        <TaskDependenciesSection taskId={taskId} currentStatus={status} />
      </div>

      {/* Blocker */}
      {blocker && (
        <>
          <Separator />
          <div className="space-y-xs">
            <Label className="text-metadata text-muted-foreground">Blocker</Label>
            <div className="p-sm rounded-lg border border-destructive/30 bg-destructive/5 space-y-xs">
              <div className="flex items-center justify-between">
                <span className="text-body-sm font-medium text-destructive">
                  {blocker.title || "Blocked"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBlockerDialogOpen(true)}
                >
                  Edit
                </Button>
              </div>
              {blocker.description && (
                <p className="text-metadata text-muted-foreground">{blocker.description}</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
