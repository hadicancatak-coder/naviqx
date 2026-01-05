import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { TASK_STATUSES, getStatusColor } from "@/lib/constants";
import { TaskAssigneeSelector } from "@/components/tasks/TaskAssigneeSelector";
import { TagsMultiSelect } from "@/components/tasks/TagsMultiSelect";
import { useTaskDetailContext } from "./TaskDetailContext";

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
  } = useTaskDetailContext();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleTitleSave = () => {
    if (title.trim() && title !== task?.title) {
      saveField('title', title.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <div className="space-y-md">
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
              "text-heading-md font-semibold cursor-text hover:bg-muted/50 rounded-md px-1 -mx-1 py-0.5 transition-smooth",
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
    </div>
  );
}
