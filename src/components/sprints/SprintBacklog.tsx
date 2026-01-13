import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Plus, ArrowRight, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
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

interface SprintBacklogProps {
  tasks: Task[];
  selectedTasks: string[];
  onTaskSelect: (taskId: string) => void;
  onAddToSprint: () => void;
  onTaskClick: (taskId: string) => void;
}

const priorityColors: Record<string, string> = {
  High: "bg-destructive/15 text-destructive border-destructive/30",
  Medium: "bg-warning/15 text-warning-text border-warning/30",
  Low: "bg-success/15 text-success border-success/30",
};

export function SprintBacklog({ 
  tasks, 
  selectedTasks, 
  onTaskSelect, 
  onAddToSprint,
  onTaskClick 
}: SprintBacklogProps) {
  const [search, setSearch] = useState("");

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="flex flex-col h-full">
      <div className="p-md border-b border-border">
        <div className="flex items-center justify-between mb-sm">
          <div>
            <h3 className="text-heading-sm font-semibold">Backlog</h3>
            <p className="text-metadata text-muted-foreground">{tasks.length} tasks</p>
          </div>
          {selectedTasks.length > 0 && (
            <Button size="sm" onClick={onAddToSprint}>
              <ArrowRight className="h-4 w-4 mr-2" />
              Add {selectedTasks.length} to Sprint
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search backlog..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-sm space-y-xs">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-xl">
              <p className="text-body-sm text-muted-foreground">No tasks in backlog</p>
              <p className="text-metadata text-muted-foreground mt-1">
                Tasks without a sprint will appear here
              </p>
            </div>
          ) : (
            filteredTasks.map(task => (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-sm p-sm rounded-lg border transition-smooth cursor-pointer",
                  selectedTasks.includes(task.id) 
                    ? "bg-primary/5 border-primary/30" 
                    : "bg-card border-border hover:bg-card-hover"
                )}
              >
                <Checkbox
                  checked={selectedTasks.includes(task.id)}
                  onCheckedChange={() => onTaskSelect(task.id)}
                />
                <div 
                  className="flex-1 min-w-0"
                  onClick={() => onTaskClick(task.id)}
                >
                  <p className="text-body-sm font-medium truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {task.priority && (
                      <Badge variant="outline" className={cn("text-metadata", priorityColors[task.priority])}>
                        {task.priority}
                      </Badge>
                    )}
                    {task.due_at && (
                      <span className="text-metadata text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(task.due_at), 'MMM d')}
                      </span>
                    )}
                  </div>
                </div>
                {task.task_assignees && task.task_assignees.length > 0 && (
                  <div className="flex -space-x-1.5">
                    {task.task_assignees.slice(0, 2).map((assignee, idx) => (
                      <Avatar key={assignee.user_id} className="h-6 w-6 border-2 border-background">
                        <AvatarImage src={assignee.profiles?.avatar_url} />
                        <AvatarFallback className="text-[10px]">
                          {assignee.profiles?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
