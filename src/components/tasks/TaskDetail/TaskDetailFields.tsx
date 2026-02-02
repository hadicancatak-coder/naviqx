import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskAssigneeSelector } from "@/components/tasks/TaskAssigneeSelector";
import { useTaskDetailContext } from "./TaskDetailContext";
import { TaskDetailPriorityCard } from "./TaskDetailPriorityCard";
import { RecurrenceEditor } from "@/components/tasks/RecurrenceEditor";
import { RecurrenceRule } from "@/lib/recurrenceUtils";
import { useTemplateTask } from "@/hooks/useTemplateTask";

export function TaskDetailFields() {
  const { taskId, task, mutations, realtimeAssignees, refetchAssignees, isCompleted, comments } = useTaskDetailContext();

  // Local state only for title editing
  const [localTitle, setLocalTitle] = useState(task?.title || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // For instance tasks, fetch the parent template's recurrence data
  const isTemplate = !!task?.is_recurrence_template;
  const isInstance = !!task?.template_task_id;
  const templateTaskId = task?.template_task_id as string | null;
  const { data: templateData } = useTemplateTask(isInstance ? templateTaskId : null);

  // Sync local title when task changes (switching tasks)
  useEffect(() => {
    setLocalTitle(task?.title || "");
  }, [task?.id, task?.title]);

  const handleTitleSave = () => {
    if (localTitle.trim() && localTitle !== task?.title && task?.id) {
      mutations.updateTitle.mutate({ id: task.id, title: localTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  // Get assignee IDs from realtime data
  const selectedAssignees = realtimeAssignees.map(a => a.id);

  const isSubtask = !!task?.parent_id;
  const isRecurring = task?.task_type === 'recurring' || isInstance;

  return (
    <div className="space-y-md">
      {/* Task type badges */}
      {(isSubtask || isRecurring) && (
        <div className="flex items-center gap-sm">
          {isSubtask && (
            <Badge variant="secondary" className="text-metadata">Subtask</Badge>
          )}
          {isRecurring && (
            <Badge variant="secondary" className="text-metadata bg-info/10 text-info border-info/30">
              <Repeat className="h-3 w-3 mr-1" />
              Recurring
            </Badge>
          )}
        </div>
      )}

      {/* Title - Inline editable */}
      <div>
        {isEditingTitle ? (
          <Input
            ref={titleInputRef}
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSave();
              if (e.key === 'Escape') {
                setLocalTitle(task?.title || "");
                setIsEditingTitle(false);
              }
            }}
            className="text-heading-md font-semibold border-0 shadow-none focus-visible:ring-1 p-0 h-auto"
            autoFocus
          />
        ) : (
          <h2 
            className={cn(
              "text-heading-lg font-semibold cursor-text hover:bg-muted/50 rounded-lg px-1 -mx-1 py-0.5 transition-smooth",
              isCompleted && "line-through text-muted-foreground"
            )}
            onClick={() => setIsEditingTitle(true)}
          >
            {task?.title || localTitle}
          </h2>
        )}
      </div>

      {/* Priority Card - Prominent status, priority, due date */}
      <TaskDetailPriorityCard />

      {/* Recurrence Editor - for templates AND instances */}
      {(isTemplate || isInstance) && (
        <RecurrenceEditor
          taskId={taskId}
          templateTaskId={isInstance ? templateTaskId || undefined : undefined}
          currentRrule={isTemplate ? (task?.recurrence_rrule as string | null) : (templateData?.recurrence_rrule || null)}
          nextRunAt={isTemplate ? (task?.next_run_at as string | null) : (templateData?.next_run_at || null)}
          isTemplate={isTemplate}
          isInstance={isInstance}
          onUpdate={(rule: RecurrenceRule) => {
            // Always update the template (either this task if it's a template, or the parent template)
            const targetId = templateTaskId || taskId;
            mutations.updateRecurrence.mutate({ id: targetId, rule });
          }}
          isPending={mutations.updateRecurrence.isPending}
        />
      )}

      {/* Compact Assignees Row */}
      <div className="space-y-xs">
        <Label className="text-metadata text-muted-foreground">Assignees</Label>
        <TaskAssigneeSelector
          mode="edit"
          taskId={taskId}
          selectedIds={selectedAssignees}
          onSelectionChange={() => {
            refetchAssignees();
          }}
          users={comments.users}
        />
      </div>
    </div>
  );
}
