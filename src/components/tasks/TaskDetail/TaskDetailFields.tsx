import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskAssigneeSelector } from "@/components/tasks/TaskAssigneeSelector";
import { useTaskDetailContext } from "./TaskDetailContext";
import { TaskDetailPriorityCard } from "./TaskDetailPriorityCard";

export function TaskDetailFields() {
  const {
    taskId,
    task,
    title,
    setTitle,
    selectedAssignees,
    setSelectedAssignees,
    refetchAssignees,
    users,
    saveField,
    isCompleted,
  } = useTaskDetailContext();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleTitleSave = () => {
    if (title.trim() && title !== task?.title) {
      saveField('title', title.trim());
    }
    setIsEditingTitle(false);
  };

  const isSubtask = !!task?.parent_id;
  const isRecurring = task?.task_type === 'recurring';

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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSave();
              if (e.key === 'Escape') {
                setTitle(task?.title || "");
                setIsEditingTitle(false);
              }
            }}
            className="text-heading-md font-semibold border-0 shadow-none focus-visible:ring-1 p-0 h-auto"
            autoFocus
          />
        ) : (
          <h2 
            className={cn(
              "text-heading-md font-semibold cursor-text hover:bg-muted/50 rounded-lg px-1 -mx-1 py-0.5 transition-smooth",
              isCompleted && "line-through text-muted-foreground"
            )}
            onClick={() => setIsEditingTitle(true)}
          >
            {title}
          </h2>
        )}
      </div>

      {/* Priority Card - Prominent status, priority, due date */}
      <TaskDetailPriorityCard />

      {/* Compact Assignees Row */}
      <div className="space-y-xs">
        <Label className="text-metadata text-muted-foreground">Assignees</Label>
        <TaskAssigneeSelector
          mode="edit"
          taskId={taskId}
          selectedIds={selectedAssignees}
          onSelectionChange={(ids) => {
            setSelectedAssignees(ids);
            refetchAssignees();
          }}
          users={users}
        />
      </div>
    </div>
  );
}
