import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, Clock, AlertCircle, Circle, Calendar, Inbox, User } from "lucide-react";
import { format, isPast, isToday, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: string;
  priority?: string;
  due_at?: string;
  assignees?: Array<{
    user_id?: string;
    id?: string;
    name?: string;
    avatar_url?: string;
    profiles?: {
      name?: string;
      avatar_url?: string;
    };
  }>;
  task_assignees?: Array<{
    user_id: string;
    profiles?: {
      name?: string;
      avatar_url?: string;
    };
  }>;
}

interface UnifiedTaskBoardProps {
  tasks: Task[];
  onTaskClick: (taskId: string, task?: Task) => void;
  groupBy?: 'status' | 'date' | 'assignee';
}

interface ColumnConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

const statusColumns: ColumnConfig[] = [
  { 
    id: 'Pending', 
    label: 'To Do', 
    icon: Circle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50'
  },
  { 
    id: 'Ongoing', 
    label: 'In Progress', 
    icon: Clock,
    color: 'text-primary',
    bgColor: 'bg-primary/5'
  },
  { 
    id: 'Blocked', 
    label: 'Blocked', 
    icon: AlertCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/5'
  },
  { 
    id: 'Completed', 
    label: 'Done', 
    icon: CheckCircle2,
    color: 'text-success',
    bgColor: 'bg-success/5'
  },
];

const dateColumns: ColumnConfig[] = [
  { id: 'Overdue', label: 'Overdue', icon: AlertCircle, color: 'text-destructive', bgColor: 'bg-destructive/5' },
  { id: 'Today', label: 'Today', icon: Clock, color: 'text-warning-text', bgColor: 'bg-warning/5' },
  { id: 'Tomorrow', label: 'Tomorrow', icon: Calendar, color: 'text-info', bgColor: 'bg-info/5' },
  { id: 'This Week', label: 'This Week', icon: Calendar, color: 'text-primary', bgColor: 'bg-primary/5' },
  { id: 'Later', label: 'Later', icon: Inbox, color: 'text-muted-foreground', bgColor: 'bg-muted/50' },
];

const priorityColors: Record<string, string> = {
  High: "bg-destructive/15 text-destructive border-destructive/30",
  Medium: "bg-warning/15 text-warning-text border-warning/30",
  Low: "bg-success/15 text-success border-success/30",
};

export function UnifiedTaskBoard({ tasks, onTaskClick, groupBy = 'status' }: UnifiedTaskBoardProps) {
  // Dynamic assignee columns
  const assigneeColumns = useMemo((): ColumnConfig[] => {
    const assignees = new Map<string, string>();
    tasks.forEach(task => {
      const taskAssignees = task.assignees || task.task_assignees || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      taskAssignees.forEach((a: any) => {
        const name = a.name || a.profiles?.name || 'Unknown';
        const id = a.user_id || a.id || name;
        if (!assignees.has(id)) assignees.set(id, name);
      });
    });
    
    const cols: ColumnConfig[] = Array.from(assignees.entries()).map(([id, name]) => ({
      id,
      label: name,
      icon: User,
      color: 'text-primary',
      bgColor: 'bg-primary/5'
    }));
    
    cols.push({
      id: 'Unassigned',
      label: 'Unassigned',
      icon: Inbox,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/50'
    });
    
    return cols;
  }, [tasks]);

  const columns = groupBy === 'status' ? statusColumns : groupBy === 'date' ? dateColumns : assigneeColumns;

  const getDateGroup = (task: Task): string => {
    if (!task.due_at) return 'Later';
    const dueDate = new Date(task.due_at);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = addDays(today, 1);
    const weekEnd = addDays(today, 7);

    if (dueDate < today && task.status !== 'Completed') return 'Overdue';
    if (dueDate.toDateString() === today.toDateString()) return 'Today';
    if (dueDate.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    if (dueDate <= weekEnd) return 'This Week';
    return 'Later';
  };

  const getAssigneeGroup = (task: Task): string => {
    const assignees = task.assignees || task.task_assignees || [];
    if (!assignees.length) return 'Unassigned';
    const first = assignees[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (first as any).user_id || (first as any).id || 'Unassigned';
  };

  const getTasksByColumn = (columnId: string): Task[] => {
    if (groupBy === 'status') {
      // Handle Backlog -> Pending mapping
      if (columnId === 'Pending') {
        return tasks.filter(t => t.status === 'Pending' || t.status === 'Backlog');
      }
      return tasks.filter(t => t.status === columnId);
    } else if (groupBy === 'date') {
      return tasks.filter(t => getDateGroup(t) === columnId);
    } else {
      return tasks.filter(t => getAssigneeGroup(t) === columnId);
    }
  };

  const colCount = Math.min(columns.length, 5);

  return (
    <div 
      className="grid gap-md h-full"
      style={{ gridTemplateColumns: `repeat(${colCount}, minmax(240px, 1fr))` }}
    >
      {columns.slice(0, colCount).map(column => {
        const columnTasks = getTasksByColumn(column.id);
        const Icon = column.icon;
        
        return (
          <div key={column.id} className="flex flex-col min-h-0">
            {/* Column Header - Styled like SprintKanban */}
            <div className={cn("rounded-t-lg p-sm flex items-center gap-2", column.bgColor)}>
              <Icon className={cn("h-4 w-4", column.color)} />
              <span className="text-body-sm font-medium">{column.label}</span>
              <Badge variant="secondary" className="ml-auto text-metadata">
                {columnTasks.length}
              </Badge>
            </div>
            
            {/* Column Content */}
            <Card className="flex-1 rounded-t-none border-t-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-sm space-y-sm">
                  {columnTasks.length === 0 ? (
                    <div className="text-center py-lg">
                      <p className="text-metadata text-muted-foreground">No tasks</p>
                    </div>
                  ) : (
                    columnTasks.map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        onClick={() => onTaskClick(task.id, task)} 
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>
        );
      })}
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

function TaskCard({ task, onClick }: TaskCardProps) {
  const isOverdue = task.due_at && isPast(new Date(task.due_at)) && task.status !== 'Completed';
  const isDueToday = task.due_at && isToday(new Date(task.due_at));
  
  // Normalize assignees from different formats
  const assignees = task.assignees || task.task_assignees || [];

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-sm rounded-lg border bg-card hover:bg-card-hover transition-smooth cursor-pointer hover-lift",
        task.status === 'Completed' && "opacity-60"
      )}
    >
      <p className={cn(
        "text-body-sm font-medium line-clamp-2",
        task.status === 'Completed' && "line-through"
      )}>
        {task.title}
      </p>
      
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5">
          {task.priority && (
            <Badge variant="outline" className={cn("text-metadata", priorityColors[task.priority])}>
              {task.priority}
            </Badge>
          )}
          {task.due_at && (
            <span className={cn(
              "text-metadata flex items-center gap-1",
              isOverdue ? "text-destructive" : isDueToday ? "text-warning-text" : "text-muted-foreground"
            )}>
              <Calendar className="h-3 w-3" />
              {format(new Date(task.due_at), 'MMM d')}
            </span>
          )}
        </div>
        
        {assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {assignees.slice(0, 2).map((assignee: any, idx) => (
              <Avatar key={assignee.user_id || assignee.id || idx} className="h-5 w-5 border-2 border-background">
                <AvatarImage src={assignee.avatar_url || assignee.profiles?.avatar_url} />
                <AvatarFallback className="text-[9px]">
                  {(assignee.name || assignee.profiles?.name || 'U').charAt(0)}
                </AvatarFallback>
              </Avatar>
            ))}
            {assignees.length > 2 && (
              <div className="h-5 w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                <span className="text-[9px] text-muted-foreground">+{assignees.length - 2}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
