import { useState, useMemo } from "react";
import { useTasks } from "@/hooks/useTasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, ListTodo, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStatusConfig, getPriorityConfig } from "@/domain/tasks";

interface WhiteboardSidebarProps {
  onAddTask: (taskId: string, taskTitle: string, status: string, priority: string) => void;
  tasksOnBoard?: string[]; // IDs of tasks already on the whiteboard
}

export function WhiteboardSidebar({ onAddTask, tasksOnBoard = [] }: WhiteboardSidebarProps) {
  const { data: tasks = [] } = useTasks();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "todo" | "in_progress" | "blocked">("all");

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(task =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Exclude done/cancelled
    result = result.filter(t => 
      !["done", "cancelled"].includes(t.status?.toLowerCase() || "")
    );

    // Apply status filter
    if (statusFilter !== "all") {
      const statusMap: Record<string, string[]> = {
        todo: ["to do", "todo"],
        in_progress: ["in progress", "in_progress"],
        blocked: ["blocked"],
      };
      const allowedStatuses = statusMap[statusFilter] || [];
      result = result.filter(t => 
        allowedStatuses.includes(t.status?.toLowerCase() || "")
      );
    }

    return result.slice(0, 30);
  }, [tasks, searchQuery, statusFilter]);

  const onBoardCount = tasksOnBoard.length;

  return (
    <div className="w-72 bg-card border-l border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-md border-b border-border space-y-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <ListTodo className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-heading-sm font-semibold">Tasks</h3>
          </div>
          {onBoardCount > 0 && (
            <Badge variant="secondary" className="text-metadata">
              {onBoardCount} on board
            </Badge>
          )}
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

        {/* Status filter tabs */}
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <TabsList className="w-full grid grid-cols-4 h-8">
            <TabsTrigger value="all" className="text-metadata">All</TabsTrigger>
            <TabsTrigger value="todo" className="text-metadata">To Do</TabsTrigger>
            <TabsTrigger value="in_progress" className="text-metadata">Active</TabsTrigger>
            <TabsTrigger value="blocked" className="text-metadata">Blocked</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Task list */}
      <ScrollArea className="flex-1">
        <div className="p-sm space-y-xs">
          {filteredTasks.length === 0 ? (
            <p className="text-body-sm text-muted-foreground text-center py-lg">
              No tasks found
            </p>
          ) : (
            filteredTasks.map((task) => {
              const statusConfig = getStatusConfig(task.status || "todo");
              const priorityConfig = getPriorityConfig(task.priority || "medium");
              const isOnBoard = tasksOnBoard.includes(task.id);

              return (
                <div
                  key={task.id}
                  className={cn(
                    "p-sm rounded-lg border bg-elevated",
                    "hover:bg-card-hover transition-smooth group",
                    isOnBoard ? "border-primary/30 bg-primary/5" : "border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-xs">
                        {isOnBoard && (
                          <Check className="h-3 w-3 text-primary flex-shrink-0" />
                        )}
                        <p className={cn(
                          "text-body-sm font-medium truncate",
                          isOnBoard ? "text-primary" : "text-foreground"
                        )}>
                          {task.title}
                        </p>
                      </div>
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
                      variant={isOnBoard ? "ghost" : "default"}
                      size="icon"
                      className={cn(
                        "h-7 w-7 flex-shrink-0",
                        !isOnBoard && "opacity-0 group-hover:opacity-100 transition-opacity"
                      )}
                      onClick={() => onAddTask(
                        task.id,
                        task.title,
                        task.status || "todo",
                        task.priority || "medium"
                      )}
                      title={isOnBoard ? "Already on board" : "Add to whiteboard"}
                      disabled={isOnBoard}
                    >
                      {isOnBoard ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
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
