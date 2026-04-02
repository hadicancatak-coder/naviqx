import { useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarIcon, Flag, AlertTriangle, Clock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isPast, isTomorrow } from "date-fns";
import { TASK_STATUSES, getStatusColor } from "@/lib/constants";
import { validateDateForUsers, getDayName, formatWorkingDays } from "@/lib/workingDaysHelper";
import { useTaskDetailContext } from "./TaskDetailContext";

const DETAIL_SELECT_CLASS =
  "h-full w-full appearance-none bg-transparent pl-8 pr-8 text-body-sm font-medium text-current outline-none disabled:cursor-not-allowed";

export function TaskDetailPriorityCard() {
  const { task, mutations, isCompleted, realtimeAssignees } = useTaskDetailContext();

  const status = task?.status || "Ongoing";
  const priority = task?.priority || "Medium";
  const dueDate = task?.due_at ? new Date(task.due_at) : undefined;
  const assigneesWithWorkingDays = realtimeAssignees.length > 0 ? realtimeAssignees : task?.assignees || [];

  const workingDaysWarning = useMemo(() => {
    if (!task?.due_at || assigneesWithWorkingDays.length === 0) {
      return null;
    }

    const validationDate = new Date(task.due_at);
    const validation = validateDateForUsers(validationDate, assigneesWithWorkingDays);

    if (validation.isValid) {
      return null;
    }

    const list = validation.invalidUsers
      .map((user) => `${user.name} (${formatWorkingDays(user.workingDays)})`)
      .join(", ");

    return `${getDayName(validationDate)} is outside working days for: ${list}`;
  }, [task?.due_at, assigneesWithWorkingDays]);

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
      case "High":
        return "bg-destructive/15 text-destructive border-destructive/30";
      case "Medium":
        return "bg-primary/15 text-primary border-primary/30";
      case "Low":
      default:
        return "bg-muted/50 text-muted-foreground border-border";
    }
  };

  const getDueDateStyles = () => {
    if (isOverdue) return "bg-destructive/10 text-destructive border-destructive/30";
    if (isDueToday) return "bg-warning/10 text-warning-text border-warning/30";
    if (isDueTomorrow) return "bg-info/10 text-info-text border-info/30";
    return "bg-muted/50 text-muted-foreground border-border";
  };

  const handlePriorityChange = (value: string) => {
    if (task?.id) {
      mutations.updatePriority.mutate({ id: task.id, priority: value });
    }
  };

  const handleStatusChange = (value: string) => {
    if (task?.id) {
      mutations.updateStatus.mutate({ id: task.id, status: value });
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (task?.id) {
      mutations.updateDeadline.mutate({ id: task.id, due_at: date?.toISOString() || null });
    }
  };

  return (
    <div className="space-y-sm">
      <div className="grid grid-cols-1 gap-sm rounded-lg border border-border bg-card p-sm sm:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-xs">
          <span className="text-metadata text-muted-foreground">Priority</span>
          <div className={cn("relative h-9 w-full rounded-md border", getPriorityStyles())}>
            <Flag className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
            <select
              value={priority}
              onChange={(event) => handlePriorityChange(event.target.value)}
              disabled={mutations.updatePriority.isPending}
              aria-label="Task priority"
              className={DETAIL_SELECT_CLASS}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 opacity-50" />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-xs">
          <span className="text-metadata text-muted-foreground">Due</span>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex h-9 w-full min-w-0 items-center gap-xs rounded-md border px-2.5 text-left text-body-sm font-medium transition-colors",
                  getDueDateStyles()
                )}
              >
                {isOverdue ? (
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                ) : (
                  <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
                )}
                <span className="flex-1 truncate">{getDueDateLabel()}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dueDate} onSelect={handleDateChange} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex min-w-0 flex-col gap-xs">
          <span className="text-metadata text-muted-foreground">Status</span>
          <div className={cn("relative h-9 w-full rounded-md border", getStatusColor(status))}>
            <Clock className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
            <select
              value={status}
              onChange={(event) => handleStatusChange(event.target.value)}
              disabled={mutations.updateStatus.isPending}
              aria-label="Task status"
              className={DETAIL_SELECT_CLASS}
            >
              {TASK_STATUSES.map((taskStatus) => (
                <option key={taskStatus.value} value={taskStatus.value}>
                  {taskStatus.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 opacity-50" />
          </div>
        </div>
      </div>

      {workingDaysWarning && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-metadata">{workingDaysWarning}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
