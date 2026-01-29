import { Sprint } from "@/hooks/useSprints";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Zap, Calendar, CheckCircle2, Clock, AlertCircle, Settings, Play, Square } from "lucide-react";
import { format, differenceInDays, isAfter } from "date-fns";
import { cn } from "@/lib/utils";

interface SprintHeaderProps {
  sprint: Sprint;
  taskStats: {
    total: number;
    completed: number;
    inProgress: number;
    blocked: number;
  };
  onComplete?: () => void;
  onSettings?: () => void;
}

export function SprintHeader({ sprint, taskStats, onComplete, onSettings }: SprintHeaderProps) {
  const today = new Date();
  const startDate = new Date(sprint.start_date);
  const endDate = new Date(sprint.end_date);
  
  const totalDays = differenceInDays(endDate, startDate);
  const daysElapsed = differenceInDays(today, startDate);
  const daysRemaining = differenceInDays(endDate, today);
  
  const completionRate = taskStats.total > 0 
    ? Math.round((taskStats.completed / taskStats.total) * 100) 
    : 0;
  
  const timeProgress = totalDays > 0 ? Math.round((daysElapsed / totalDays) * 100) : 0;
  const isOverdue = isAfter(today, endDate);
  const isAheadOfSchedule = completionRate > timeProgress;

  return (
    <div className="liquid-glass rounded-xl p-md mb-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-md">
          <div className="w-12 h-12 rounded-xl bg-success/15 flex items-center justify-center">
            <Zap className="h-6 w-6 text-success" />
          </div>
          <div>
            <div className="flex items-center gap-sm">
              <h1 className="text-heading-lg font-semibold">{sprint.name}</h1>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-metadata",
                  isOverdue ? "bg-destructive/15 text-destructive border-destructive/30" :
                  isAheadOfSchedule ? "bg-success/15 text-success border-success/30" :
                  "bg-primary/15 text-primary border-primary/30"
                )}
              >
                {isOverdue ? "Overdue" : isAheadOfSchedule ? "On Track" : `${daysRemaining} days left`}
              </Badge>
            </div>
            <p className="text-body-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
              <span className="text-muted-foreground/50">•</span>
              {totalDays} day sprint
            </p>
          </div>
        </div>

        <div className="flex items-center gap-sm">
          {onComplete && (
            <Button variant="outline" onClick={onComplete}>
              <Square className="h-4 w-4 mr-2" />
              Complete Sprint
            </Button>
          )}
          {onSettings && (
            <Button variant="ghost" size="icon" onClick={onSettings}>
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Sprint Goal */}
      {sprint.goal && (
        <p className="text-body text-muted-foreground mt-md pl-[60px]">
          <span className="font-medium text-foreground">Goal:</span> {sprint.goal}
        </p>
      )}

      {/* Stats Row */}
      <div className="flex items-center gap-xl mt-lg pl-[60px]">
        <div className="flex-1 max-w-md">
          <div className="flex items-center justify-between text-metadata mb-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </div>
        
        <div className="flex items-center gap-lg">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-body-sm font-medium">{taskStats.completed}</span>
            <span className="text-metadata text-muted-foreground">done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-body-sm font-medium">{taskStats.inProgress}</span>
            <span className="text-metadata text-muted-foreground">in progress</span>
          </div>
          {taskStats.blocked > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-body-sm font-medium text-destructive">{taskStats.blocked}</span>
              <span className="text-metadata text-muted-foreground">blocked</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 border-l border-border pl-lg">
            <span className="text-body-sm font-medium">{taskStats.total}</span>
            <span className="text-metadata text-muted-foreground">total tasks</span>
          </div>
        </div>
      </div>
    </div>
  );
}
