import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Flag, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isPast, isTomorrow } from "date-fns";
import { TASK_STATUSES, getStatusColor } from "@/lib/constants";
import { useTaskDetailContext } from "./TaskDetailContext";

export function TaskDetailPriorityCard() {
  const {
    status,
    setStatus,
    priority,
    setPriority,
    dueDate,
    setDueDate,
    saveField,
    isCompleted,
  } = useTaskDetailContext();

  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && !isCompleted;
  const isDueToday = dueDate && isToday(dueDate);
  const isDueTomorrow = dueDate && isTomorrow(dueDate);

  const getDueDateLabel = () => {
    if (!dueDate) return "No due date";
    if (isOverdue) return `Overdue (${format(dueDate, "MMM d")})`;
    if (isDueToday) return "Due today";
    if (isDueTomorrow) return "Due tomorrow";
    return format(dueDate, "MMM d");
  };

  return (
    <div className="flex flex-wrap items-center gap-sm p-sm rounded-lg bg-card border border-border">
      {/* Priority - Color-coded prominent badge */}
      <Select 
        value={priority} 
        onValueChange={(v: any) => {
          setPriority(v);
          saveField('priority', v);
        }}
      >
        <SelectTrigger className="w-auto h-8 gap-xs border-0 p-0 focus:ring-0 shadow-none">
          <div className={cn(
            "flex items-center gap-xs px-sm py-xs rounded-md font-medium text-body-sm",
            priority === 'High' && 'bg-destructive/15 text-destructive border border-destructive/30',
            priority === 'Medium' && 'bg-primary/15 text-primary border border-primary/30',
            priority === 'Low' && 'bg-muted/50 text-muted-foreground border border-border'
          )}>
            <Flag className="h-3.5 w-3.5" />
            {priority}
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Low">Low</SelectItem>
          <SelectItem value="Medium">Medium</SelectItem>
          <SelectItem value="High">High</SelectItem>
        </SelectContent>
      </Select>

      {/* Due Date - With urgency color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "h-8 gap-xs px-sm rounded-md",
              isOverdue && "bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive",
              isDueToday && "bg-warning/10 text-warning-text hover:bg-warning/20",
              isDueTomorrow && "bg-info/10 text-info-text hover:bg-info/20",
              !isOverdue && !isDueToday && !isDueTomorrow && "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {isOverdue ? (
              <AlertTriangle className="h-3.5 w-3.5" />
            ) : (
              <CalendarIcon className="h-3.5 w-3.5" />
            )}
            <span className="text-body-sm font-medium">{getDueDateLabel()}</span>
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

      {/* Status */}
      <Select 
        value={status} 
        onValueChange={(v) => {
          setStatus(v);
          saveField('status', v);
        }}
      >
        <SelectTrigger className="w-auto h-8 gap-xs border-0 p-0 focus:ring-0 shadow-none">
          <Badge variant="outline" className={cn("text-body-sm", getStatusColor(status))}>
            <Clock className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        </SelectTrigger>
        <SelectContent>
          {TASK_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
