import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle } from "lucide-react";
import { addDays, format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTaskMutations } from "@/hooks/useTaskMutations";

interface TaskBoardViewProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tasks: any[];
  onTaskClick: (taskId: string) => void;
  groupBy?: 'status' | 'date' | 'assignee';
}

const statusGroups = ['Backlog', 'Ongoing', 'Blocked', 'Completed'];
const dateGroups = ['Overdue', 'Today', 'Tomorrow', 'This Week', 'Later'];

const priorityColors: Record<string, string> = {
  High: "bg-destructive",
  Medium: "bg-warning",
  Low: "bg-muted-foreground/40",
};

export const TaskBoardView = ({ tasks, onTaskClick, groupBy = 'status' }: TaskBoardViewProps) => {
  const { updateStatus } = useTaskMutations();

  // Dynamic assignee groups
  const assigneeGroups = useMemo(() => {
    const assignees = new Map<string, string>();
    tasks.forEach(task => {
      if (task.assignees?.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        task.assignees.forEach((a: any) => {
          const name = a.name || 'Unknown';
          if (!assignees.has(name)) assignees.set(name, name);
        });
      }
    });
    return [...Array.from(assignees.values()), 'Unassigned'];
  }, [tasks]);

  const groups = groupBy === 'status' ? statusGroups : groupBy === 'date' ? dateGroups : assigneeGroups;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getDateGroup = (task: any): string => {
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

  const getAssigneeGroup = (task: any): string => {
    if (!task.assignees?.length) return 'Unassigned';
    return task.assignees[0]?.name || 'Unknown';
  };

  const filterTasksByGroup = (group: string) => {
    if (groupBy === 'status') {
      if (group === 'Backlog') {
        return tasks.filter(t => t.status === 'Pending' || t.status === 'Backlog');
      }
      return tasks.filter(t => t.status === group);
    } else if (groupBy === 'date') {
      return tasks.filter(t => getDateGroup(t) === group);
    } else {
      return tasks.filter(t => getAssigneeGroup(t) === group);
    }
  };

  const handleComplete = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    updateStatus.mutate({ id: task.id, status: newStatus });
  };

  const isOverdue = (task: any) => {
    if (!task.due_at || task.status === 'Completed') return false;
    return new Date(task.due_at) < new Date();
  };

  const colCount = Math.min(groups.length, 5);

  return (
    <div className="overflow-x-auto -mx-md px-md sm:overflow-visible sm:mx-0 sm:px-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md min-w-[280px] sm:min-w-0">
      {groups.map(group => {
        const groupTasks = filterTasksByGroup(group);

        return (
          <div key={group} className="flex flex-col min-h-[300px]">
            {/* Column Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
              <h3 className="font-medium text-body-sm text-foreground">{group}</h3>
              <Badge variant="secondary" className="text-metadata h-5 px-1.5">
                {groupTasks.length}
              </Badge>
            </div>

            {/* Column Content */}
            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-2">
                {groupTasks.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-metadata border border-dashed border-border rounded-lg">
                    No tasks
                  </div>
                ) : (
                  groupTasks.map(task => {
                    const completed = task.status === 'Completed';
                    const overdue = isOverdue(task);

                    return (
                      <div
                        key={task.id}
                        onClick={() => onTaskClick(task.id)}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all",
                          "bg-card hover:bg-muted/30 hover:border-primary/30",
                          completed && "opacity-50",
                          overdue && "border-destructive/30 bg-destructive/5"
                        )}
                      >
                        {/* Top Row: Priority + Title */}
                        <div className="flex items-start gap-2">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                              priorityColors[task.priority] || priorityColors.Low
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={completed}
                                onCheckedChange={() => handleComplete(task, { stopPropagation: () => {} } as any)}
                                onClick={(e) => { e.stopPropagation(); handleComplete(task, e); }}
                                className={cn(
                                  "h-4 w-4 flex-shrink-0",
                                  completed && "bg-success border-success"
                                )}
                              />
                              <span className={cn(
                                "text-body-sm font-medium truncate",
                                completed && "line-through text-muted-foreground"
                              )}>
                                {task.title}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Row: Assignees + Comments + Due */}
                        <div className="flex items-center justify-between mt-2 pl-4">
                          {/* Assignees */}
                          <div className="flex -space-x-1">
                            {task.assignees?.slice(0, 2).map((a: any) => (
                              <Avatar key={a.user_id || a.id} className="h-5 w-5 border border-background">
                                <AvatarImage src={a.avatar_url} />
                                <AvatarFallback className="text-[8px] bg-muted">
                                  {a.name?.charAt(0) || '?'}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {task.assignees?.length > 2 && (
                              <div className="h-5 w-5 rounded-full bg-muted border border-background flex items-center justify-center text-[8px]">
                                +{task.assignees.length - 2}
                              </div>
                            )}
                          </div>

                          {/* Comments + Due Date */}
                          <div className="flex items-center gap-2">
                            {task.comments_count > 0 && (
                              <span className="text-metadata text-muted-foreground flex items-center gap-0.5">
                                <MessageCircle className="h-3 w-3" />
                                {task.comments_count}
                              </span>
                            )}
                            {task.due_at && (
                              <span className={cn(
                                "text-metadata tabular-nums",
                                overdue ? "text-destructive font-medium" : "text-muted-foreground"
                              )}>
                                {format(new Date(task.due_at), 'MMM d')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
      </div>
    </div>
  );
};
