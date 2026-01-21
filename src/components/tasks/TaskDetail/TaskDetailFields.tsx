import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, Clock, FolderKanban, Repeat, Users, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { TASK_STATUSES, getStatusColor } from "@/lib/constants";
import { TaskAssigneeSelector } from "@/components/tasks/TaskAssigneeSelector";
import { TagsMultiSelect } from "@/components/tasks/TagsMultiSelect";
import { SprintSelector } from "@/components/tasks/SprintSelector";
import { PhaseSelector } from "./PhaseSelector";
import { useTaskDetailContext } from "./TaskDetailContext";
import { useProjects } from "@/hooks/useProjects";

export function TaskDetailFields() {
  const {
    taskId,
    task,
    title,
    setTitle,
    status,
    setStatus,
    priority,
    setPriority,
    dueDate,
    setDueDate,
    tags,
    setTags,
    selectedAssignees,
    setSelectedAssignees,
    refetchAssignees,
    users,
    saveField,
    isCompleted,
    projectId,
    setProjectId,
    isCollaborative,
    setIsCollaborative,
    collaborativeStatus,
    currentUserCompleted,
    phaseId,
    setPhaseId,
  } = useTaskDetailContext();
  
  const { projects } = useProjects();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleTitleSave = () => {
    if (title.trim() && title !== task?.title) {
      saveField('title', title.trim());
    }
    setIsEditingTitle(false);
  };

  const getAgeText = (createdAt: string | null) => {
    if (!createdAt) return '—';
    const days = differenceInDays(new Date(), new Date(createdAt));
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    return `${days} days`;
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

      {/* Quick Details Row */}
      <div className="flex flex-wrap items-center gap-sm">
        {/* Status */}
        <Select 
          value={status} 
          onValueChange={(v) => {
            setStatus(v);
            saveField('status', v);
          }}
        >
          <SelectTrigger className="w-auto h-8 gap-xs">
            <Badge variant="outline" className={cn("text-metadata", getStatusColor(status))}>
              {status}
            </Badge>
          </SelectTrigger>
          <SelectContent>
            {TASK_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority */}
        <Select 
          value={priority} 
          onValueChange={(v: any) => {
            setPriority(v);
            saveField('priority', v);
          }}
        >
          <SelectTrigger className="w-auto h-8 gap-xs">
            <Badge 
              variant="outline" 
              className={cn(
                "text-metadata",
                priority === 'High' && 'border-destructive/50 text-destructive bg-destructive/10',
                priority === 'Medium' && 'border-primary/50 text-primary bg-primary/10',
                priority === 'Low' && 'border-border text-muted-foreground'
              )}
            >
              {priority}
            </Badge>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Low">Low</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="High">High</SelectItem>
          </SelectContent>
        </Select>

        {/* Due Date */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-xs">
              <CalendarIcon className="h-3.5 w-3.5" />
              {dueDate ? format(dueDate, "MMM d") : "Add due date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={(date) => {
                setDueDate(date);
                saveField('due_at', date);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <Separator />

      {/* Assignees */}
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

      {/* Collaborative Mode (only show if multiple assignees) */}
      {selectedAssignees.length > 1 && (
        <>
          <Separator />
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
          </div>
        </>
      )}

      {/* Tags */}
      <div className="space-y-xs">
        <Label className="text-metadata text-muted-foreground">Tags</Label>
        <TagsMultiSelect
          value={tags}
          onChange={(newTags) => {
            setTags(newTags);
            saveField('labels', newTags);
          }}
        />
      </div>

      {/* Project */}
      <div className="space-y-xs">
        <Label className="text-metadata text-muted-foreground">Project</Label>
        <Select 
          value={projectId || "none"} 
          onValueChange={(v) => {
            const newValue = v === "none" ? null : v;
            setProjectId(newValue);
            saveField('project_id', newValue);
            // Reset phase when project changes
            if (newValue !== projectId) {
              setPhaseId(null);
              saveField('phase_id', null);
            }
          }}
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
        onChange={(newPhaseId) => {
          setPhaseId(newPhaseId);
          saveField('phase_id', newPhaseId);
        }}
      />

      {/* Sprint */}
      <div className="space-y-xs">
        <Label className="text-metadata text-muted-foreground">Sprint</Label>
        <SprintSelector
          value={task?.sprint || null}
          onChange={(v) => saveField('sprint', v)}
        />
      </div>

      <Separator />

      {/* Date Metadata */}
      <div className="grid grid-cols-3 gap-sm">
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
    </div>
  );
}