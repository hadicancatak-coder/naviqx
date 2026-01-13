import { useSprints } from "@/hooks/useSprints";
import { useTasks } from "@/hooks/useTasks";
import { DataCard } from "@/components/layout/DataCard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { format, differenceInDays, isAfter, isBefore } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export function SprintProgress() {
  const navigate = useNavigate();
  const { activeSprint, isLoading: sprintsLoading } = useSprints();
  const { data: tasks, isLoading: tasksLoading } = useTasks();

  if (sprintsLoading || tasksLoading) {
    return (
      <DataCard className="hover:shadow-soft transition-smooth">
        <div className="h-6 bg-muted rounded w-32 mb-md animate-pulse" />
        <div className="space-y-sm">
          <div className="h-4 bg-muted rounded w-full animate-pulse" />
          <div className="h-8 bg-muted rounded w-full animate-pulse" />
        </div>
      </DataCard>
    );
  }

  if (!activeSprint) {
    return (
      <DataCard className="hover:shadow-soft transition-smooth">
        <div className="flex items-center gap-2 mb-md">
          <Zap className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-heading-sm font-semibold text-foreground">Current Sprint</h2>
        </div>
        <div className="text-center py-lg">
          <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-sm" />
          <p className="text-body-sm text-muted-foreground">No active sprint</p>
          <p className="text-metadata text-muted-foreground mt-1">
            Create a sprint in Admin → Sprints
          </p>
        </div>
      </DataCard>
    );
  }

  // Calculate sprint stats
  const sprintTasks = tasks?.filter(t => t.sprint === activeSprint.id) || [];
  const completedTasks = sprintTasks.filter(t => t.status === 'Completed');
  const blockedTasks = sprintTasks.filter(t => t.status === 'Blocked');
  const ongoingTasks = sprintTasks.filter(t => t.status === 'Ongoing');
  
  const completionRate = sprintTasks.length > 0 
    ? Math.round((completedTasks.length / sprintTasks.length) * 100) 
    : 0;

  const today = new Date();
  const startDate = new Date(activeSprint.start_date);
  const endDate = new Date(activeSprint.end_date);
  
  const totalDays = differenceInDays(endDate, startDate);
  const daysElapsed = differenceInDays(today, startDate);
  const daysRemaining = differenceInDays(endDate, today);
  
  const timeProgress = totalDays > 0 ? Math.round((daysElapsed / totalDays) * 100) : 0;
  const isOverdue = isAfter(today, endDate);
  const isAheadOfSchedule = completionRate > timeProgress;

  return (
    <DataCard 
      className="hover:shadow-soft transition-smooth cursor-pointer"
      onClick={() => navigate('/tasks?sprint=' + activeSprint.id)}
    >
      <div className="flex items-center justify-between mb-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center">
            <Zap className="h-4 w-4 text-success" />
          </div>
          <div>
            <h2 className="text-heading-sm font-semibold text-foreground">{activeSprint.name}</h2>
            <p className="text-metadata text-muted-foreground">
              {format(startDate, 'MMM d')} - {format(endDate, 'MMM d')}
            </p>
          </div>
        </div>
        <Badge 
          variant="outline" 
          className={cn(
            "text-metadata",
            isOverdue ? "bg-destructive/15 text-destructive border-destructive/30" :
            isAheadOfSchedule ? "bg-success/15 text-success border-success/30" :
            "bg-primary/15 text-primary border-primary/30"
          )}
        >
          {isOverdue ? "Overdue" : isAheadOfSchedule ? "On Track" : `${daysRemaining}d left`}
        </Badge>
      </div>

      {/* Progress */}
      <div className="space-y-sm">
        <div className="flex items-center justify-between text-metadata">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{completedTasks.length}/{sprintTasks.length} tasks</span>
        </div>
        <Progress value={completionRate} className="h-2" />
        
        <div className="flex items-center gap-lg mt-md">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <span className="text-metadata">{completedTasks.length} done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="text-metadata">{ongoingTasks.length} in progress</span>
          </div>
          {blockedTasks.length > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              <span className="text-metadata text-destructive">{blockedTasks.length} blocked</span>
            </div>
          )}
        </div>
      </div>

      {activeSprint.goal && (
        <p className="text-body-sm text-muted-foreground mt-md pt-md border-t border-border line-clamp-2">
          {activeSprint.goal}
        </p>
      )}
    </DataCard>
  );
}
