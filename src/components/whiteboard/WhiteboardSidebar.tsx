import { useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStatusConfig, getPriorityConfig } from "@/domain/tasks";

interface WhiteboardSidebarProps {
  onAddTask: (taskId: string, taskTitle: string, status: string, priority: string) => void;
}

export function WhiteboardSidebar({ onAddTask }: WhiteboardSidebarProps) {
  const { data: tasks = [] } = useTasks();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by status
  const activeTasks = filteredTasks.filter(t => 
    !["done", "cancelled"].includes(t.status?.toLowerCase() || "")
  ).slice(0, 20);

  return (
    <div className="w-72 bg-card border-l border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-md border-b border-border">
        <div className="flex items-center gap-sm mb-sm">
          <ListTodo className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-heading-sm font-semibold">Tasks</h3>
        </div>
        <div className="relative">
          <Search className="absolute left-sm top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Task list */}
      <ScrollArea className="flex-1">
        <div className="p-sm space-y-xs">
          {activeTasks.length === 0 ? (
            <p className="text-body-sm text-muted-foreground text-center py-lg">
              No tasks found
            </p>
          ) : (
            activeTasks.map((task) => {
              const statusConfig = getStatusConfig(task.status || "todo");
              const priorityConfig = getPriorityConfig(task.priority || "medium");

              return (
                <div
                  key={task.id}
                  className={cn(
                    "p-sm rounded-lg border border-border bg-elevated",
                    "hover:bg-card-hover transition-smooth group"
                  )}
                >
                  <div className="flex items-start justify-between gap-sm">
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-medium text-foreground truncate">
                        {task.title}
                      </p>
                      <div className="flex gap-xs mt-xs flex-wrap">
                        <Badge 
                          variant="secondary" 
                          className={cn("text-metadata", statusConfig.className)}
                        >
                          {statusConfig.label}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={cn("text-metadata", priorityConfig.className)}
                        >
                          {priorityConfig.label}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onAddTask(
                        task.id,
                        task.title,
                        task.status || "todo",
                        task.priority || "medium"
                      )}
                      title="Add to whiteboard"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Footer hint */}
      <div className="p-sm border-t border-border">
        <p className="text-metadata text-muted-foreground text-center">
          Click + to add task to whiteboard
        </p>
      </div>
    </div>
  );
}
