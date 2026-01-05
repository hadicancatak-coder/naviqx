import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight, Plus, CheckCheck, Loader2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TaskDependenciesSection } from "@/components/TaskDependenciesSection";
import { Separator } from "@/components/ui/separator";
import { SubtaskRow } from "@/components/tasks/SubtaskRow";
import { useSubtasks } from "@/hooks/useSubtasks";
import { useTaskDetailContext } from "./TaskDetailContext";
import { cn } from "@/lib/utils";

export function TaskDetailSubtasks() {
  const { taskId, status, blocker, setBlockerDialogOpen } = useTaskDetailContext();
  const [subtasksExpanded, setSubtasksExpanded] = useState(true);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    subtasks,
    isLoading,
    createSubtask,
    completeSubtask,
    deleteSubtask,
    updateSubtask,
    completeAllSubtasks,
    progress,
    completedCount,
    totalCount,
  } = useSubtasks(taskId);

  useEffect(() => {
    if (isAddingSubtask && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingSubtask]);

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    
    createSubtask.mutate(
      { title: newSubtaskTitle.trim(), parentId: taskId },
      {
        onSuccess: () => {
          setNewSubtaskTitle("");
          // Keep input open for rapid entry
        }
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddSubtask();
    }
    if (e.key === 'Escape') {
      setNewSubtaskTitle("");
      setIsAddingSubtask(false);
    }
  };

  const handleComplete = (id: string, completed: boolean) => {
    completeSubtask.mutate({ id, completed });
  };

  const handleDelete = (id: string) => {
    deleteSubtask.mutate(id);
  };

  const handleTitleChange = (id: string, title: string) => {
    updateSubtask.mutate({ id, updates: { title } });
  };

  return (
    <div className="space-y-md">
      {/* Subtasks Section */}
      <Collapsible open={subtasksExpanded} onOpenChange={setSubtasksExpanded}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger className="flex items-center gap-xs py-xs hover:bg-muted/50 rounded-md -mx-xs px-xs transition-smooth">
            {subtasksExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Label className="text-body-sm font-medium cursor-pointer">Subtasks</Label>
            {totalCount > 0 && (
              <span className="text-metadata text-muted-foreground">
                {completedCount}/{totalCount}
              </span>
            )}
          </CollapsibleTrigger>
          
          {totalCount > 0 && completedCount < totalCount && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => completeAllSubtasks.mutate()}
              disabled={completeAllSubtasks.isPending}
              className="h-7 text-metadata"
            >
              {completeAllSubtasks.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <CheckCheck className="h-3 w-3 mr-1" />
              )}
              Complete All
            </Button>
          )}
        </div>

        <CollapsibleContent className="pt-sm">
          {/* Progress Bar */}
          {totalCount > 0 && (
            <div className="mb-sm">
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          {/* Subtask List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-md">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              {subtasks.map((subtask) => (
                <SubtaskRow
                  key={subtask.id}
                  subtask={subtask}
                  onComplete={handleComplete}
                  onDelete={handleDelete}
                  onTitleChange={handleTitleChange}
                  isProcessing={
                    completeSubtask.isPending || 
                    deleteSubtask.isPending || 
                    updateSubtask.isPending
                  }
                />
              ))}

              {/* Add Subtask Input */}
              {isAddingSubtask ? (
                <div className="flex items-center gap-xxs h-row-compact pl-lg pr-sm border-t border-border/50">
                  <Input
                    ref={inputRef}
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => {
                      if (!newSubtaskTitle.trim()) {
                        setIsAddingSubtask(false);
                      }
                    }}
                    placeholder="Subtask name..."
                    disabled={createSubtask.isPending}
                    className="h-6 text-body-sm border-0 shadow-none focus-visible:ring-0 flex-1 px-0"
                  />
                  {createSubtask.isPending && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingSubtask(true)}
                  className={cn(
                    "flex items-center gap-2 w-full h-row-compact pl-lg pr-sm",
                    "text-body-sm text-muted-foreground hover:text-foreground hover:bg-card-hover transition-smooth",
                    totalCount > 0 && "border-t border-border/50"
                  )}
                >
                  <Plus className="h-3 w-3" />
                  <span>Add subtask</span>
                </button>
              )}
            </div>
          )}
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
