import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, Clock, AlertCircle, Circle, Calendar } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  status: string;
  priority?: string;
  due_at?: string;
  task_assignees?: Array<{
    user_id: string;
    profiles?: {
      name?: string;
      avatar_url?: string;
    };
  }>;
}

interface SprintKanbanProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
}

const columns = [
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

const priorityColors: Record<string, string> = {
  High: "bg-destructive/15 text-destructive border-destructive/30",
  Medium: "bg-warning/15 text-warning-text border-warning/30",
  Low: "bg-success/15 text-success border-success/30",
};

export function SprintKanban({ tasks, onTaskClick }: SprintKanbanProps) {
  const getTasksByStatus = (status: string) => 
    tasks.filter(t => t.status === status);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md h-full overflow-x-auto">
      {columns.map(column => {
        const columnTasks = getTasksByStatus(column.id);
        const Icon = column.icon;
        
        return (
          <div key={column.id} className="flex flex-col min-h-0">
            <div className={cn("rounded-t-lg p-sm flex items-center gap-2", column.bgColor)}>
              <Icon className={cn("h-4 w-4", column.color)} />
              <span className="text-body-sm font-medium">{column.label}</span>
              <Badge variant="secondary" className="ml-auto text-metadata">
                {columnTasks.length}
              </Badge>
            </div>
            
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
                        onClick={() => onTaskClick(task.id)} 
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

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const isOverdue = task.due_at && isPast(new Date(task.due_at)) && task.status !== 'Completed';
  const isDueToday = task.due_at && isToday(new Date(task.due_at));

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-sm rounded-lg border bg-card hover:bg-card-hover transition-smooth cursor-pointer",
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
        
        {task.task_assignees && task.task_assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {task.task_assignees.slice(0, 2).map(assignee => (
              <Avatar key={assignee.user_id} className="h-5 w-5 border-2 border-background">
                <AvatarImage src={assignee.profiles?.avatar_url} />
                <AvatarFallback className="text-[9px]">
                  {assignee.profiles?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            ))}
            {task.task_assignees.length > 2 && (
              <div className="h-5 w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                <span className="text-[9px] text-muted-foreground">+{task.task_assignees.length - 2}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
