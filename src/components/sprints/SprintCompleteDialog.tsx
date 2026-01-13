import { useState } from "react";
import { Sprint } from "@/hooks/useSprints";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Clock, AlertCircle, ArrowRight, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  status: string;
}

interface SprintCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sprint: Sprint;
  incompleteTasks: Task[];
  completedTasks: Task[];
  nextSprint?: Sprint;
  onComplete: (moveToNextSprint: boolean) => void;
}

export function SprintCompleteDialog({
  open,
  onOpenChange,
  sprint,
  incompleteTasks,
  completedTasks,
  nextSprint,
  onComplete,
}: SprintCompleteDialogProps) {
  const [moveOption, setMoveOption] = useState<'backlog' | 'next'>('backlog');

  const handleComplete = () => {
    onComplete(moveOption === 'next' && !!nextSprint);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete Sprint</DialogTitle>
          <DialogDescription>
            Review the sprint summary and decide what to do with incomplete tasks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-lg py-md">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-md">
            <div className="p-md rounded-lg bg-success/10 border border-success/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-heading-sm font-semibold text-success">{completedTasks.length}</span>
              </div>
              <p className="text-metadata text-muted-foreground mt-1">Tasks completed</p>
            </div>
            <div className="p-md rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning-text" />
                <span className="text-heading-sm font-semibold text-warning-text">{incompleteTasks.length}</span>
              </div>
              <p className="text-metadata text-muted-foreground mt-1">Tasks incomplete</p>
            </div>
          </div>

          {/* Incomplete Tasks */}
          {incompleteTasks.length > 0 && (
            <div>
              <h4 className="text-body-sm font-medium mb-sm">Incomplete Tasks</h4>
              <ScrollArea className="h-32 rounded-lg border border-border">
                <div className="p-sm space-y-xs">
                  {incompleteTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-2 p-xs">
                      {task.status === 'Blocked' ? (
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-primary shrink-0" />
                      )}
                      <span className="text-body-sm truncate">{task.title}</span>
                      <Badge variant="outline" className="text-metadata ml-auto shrink-0">
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Move Options */}
              <div className="mt-md">
                <h4 className="text-body-sm font-medium mb-sm">Move incomplete tasks to:</h4>
                <RadioGroup value={moveOption} onValueChange={(v) => setMoveOption(v as 'backlog' | 'next')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="backlog" id="backlog" />
                    <Label htmlFor="backlog" className="flex items-center gap-2 cursor-pointer">
                      <Archive className="h-4 w-4 text-muted-foreground" />
                      Backlog
                    </Label>
                  </div>
                  {nextSprint && (
                    <div className="flex items-center space-x-2 mt-2">
                      <RadioGroupItem value="next" id="next" />
                      <Label htmlFor="next" className="flex items-center gap-2 cursor-pointer">
                        <ArrowRight className="h-4 w-4 text-primary" />
                        Next sprint ({nextSprint.name})
                      </Label>
                    </div>
                  )}
                </RadioGroup>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleComplete}>
            Complete Sprint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
