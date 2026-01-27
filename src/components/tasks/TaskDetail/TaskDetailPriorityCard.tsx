import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Flag, AlertTriangle, Clock, ChevronDown } from "lucide-react";
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

  const getPriorityStyles = () => {
    switch (priority) {
      case 'High':
        return 'bg-destructive/15 text-destructive border-destructive/30';
      case 'Medium':
        return 'bg-primary/15 text-primary border-primary/30';
      case 'Low':
      default:
        return 'bg-muted/50 text-muted-foreground border-border';
    }
  };

  const getDueDateStyles = () => {
    if (isOverdue) return 'bg-destructive/10 text-destructive border-destructive/30';
    if (isDueToday) return 'bg-warning/10 text-warning-text border-warning/30';
    if (isDueTomorrow) return 'bg-info/10 text-info-text border-info/30';
    return 'bg-muted/50 text-muted-foreground border-border';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-sm p-sm rounded-lg bg-card border border-border">
      {/* Priority */}
      <div className="flex flex-col gap-xs min-w-0">
        <span className="text-metadata text-muted-foreground">Priority</span>
        <Select 
          value={priority} 
          onValueChange={(v: any) => {
            setPriority(v);
            saveField('priority', v);
          }}
        >
          <SelectTrigger className="h-9 w-full border-0 p-0 focus:ring-0 shadow-none bg-transparent">
            <div className={cn(
              "flex items-center gap-xs h-9 px-2.5 rounded-md border font-medium text-body-sm w-full min-w-0",
              getPriorityStyles()
            )}>
              <Flag className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate flex-1 text-left">{priority}</span>
              <ChevronDown className="h-3 w-3 flex-shrink-0 opacity-50" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Low">Low</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="High">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Due Date */}
      <div className="flex flex-col gap-xs min-w-0">
        <span className="text-metadata text-muted-foreground">Due</span>
        <Popover>
          <PopoverTrigger asChild>
            <button 
              type="button"
              className={cn(
                "flex items-center gap-xs h-9 px-2.5 rounded-md border font-medium text-body-sm w-full min-w-0 text-left transition-colors",
                getDueDateStyles()
              )}
            >
              {isOverdue ? (
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              ) : (
                <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
              )}
              <span className="truncate flex-1">{getDueDateLabel()}</span>
            </button>
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

      {/* Status */}
      <div className="flex flex-col gap-xs min-w-0">
        <span className="text-metadata text-muted-foreground">Status</span>
        <Select 
          value={status} 
          onValueChange={(v) => {
            setStatus(v);
            saveField('status', v);
          }}
        >
          <SelectTrigger className="h-9 w-full border-0 p-0 focus:ring-0 shadow-none bg-transparent">
            <div className={cn(
              "flex items-center gap-xs h-9 px-2.5 rounded-md border font-medium text-body-sm w-full min-w-0",
              getStatusColor(status)
            )}>
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate flex-1 text-left">{status}</span>
              <ChevronDown className="h-3 w-3 flex-shrink-0 opacity-50" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {TASK_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
