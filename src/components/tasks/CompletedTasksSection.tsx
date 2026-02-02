import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface CompletedTasksSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tasks: any[];
  onTaskClick: (taskId: string) => void;
  onTaskComplete: (taskId: string, completed: boolean) => void;
}

export const CompletedTasksSection = ({
  tasks,
  onTaskClick,
  onTaskComplete,
}: CompletedTasksSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (tasks.length === 0) return null;

  return (
    <div className="mt-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-xs w-full py-sm px-md rounded-lg bg-success/10 hover:bg-success/20 border border-success/30 transition-smooth group"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-success" />
        ) : (
          <ChevronRight className="w-4 h-4 text-success" />
        )}
        <span className="text-body-sm font-medium text-success">
          Completed Tasks ({tasks.length})
        </span>
        <Badge variant="secondary" className="ml-auto bg-success/20 text-success border-success/30">
          {tasks.length}
        </Badge>
      </button>

      {isExpanded && (
        <div className="mt-xs space-y-xs opacity-85">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-sm py-sm px-md border border-border/50 rounded-lg hover:bg-muted/30 transition-smooth cursor-pointer group"
              onClick={() => onTaskClick(task.id)}
            >
              <Checkbox
                checked={true}
                onCheckedChange={(checked) => onTaskComplete(task.id, checked as boolean)}
                onClick={(e) => e.stopPropagation()}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-body-sm line-through text-muted-foreground">
                    {task.title}
                  </h4>
                  <Badge
                    variant="outline"
                    className="border-border/50 text-muted-foreground text-metadata"
                  >
                    {task.priority}
                  </Badge>
                </div>
                {task.description && (
                  <p className="text-metadata text-muted-foreground line-clamp-1">
                    {task.description.replace(/<[^>]*>/g, "").substring(0, 100)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
