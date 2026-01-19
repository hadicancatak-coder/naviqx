import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Briefcase, TrendingUp, AlertCircle, Flame } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { cn } from "@/lib/utils";

// Workload thresholds based on tasks due in next 5 days
const BUSY_THRESHOLD = 3; // 3+ tasks in next 5 days = Busy
const FULL_THRESHOLD = 5; // 5+ tasks in next 5 days = Full

export function TeamWorkload() {
  const { data, isLoading } = useDashboardData();
  const users = data?.teamPerformance ?? [];

  const getWorkloadStatus = (tasksNext2Days: number) => {
    if (tasksNext2Days >= FULL_THRESHOLD) {
      return { status: 'full', color: 'bg-destructive', label: 'Full' };
    }
    if (tasksNext2Days >= BUSY_THRESHOLD) {
      return { status: 'busy', color: 'bg-warning', label: 'Busy' };
    }
    return { status: 'balanced', color: 'bg-success', label: 'Available' };
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card className="p-card">
        <div className="animate-pulse space-y-md">
          <div className="h-6 bg-muted rounded w-40" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-sm">
              <div className="h-10 w-10 bg-muted rounded-full" />
              <div className="flex-1 h-4 bg-muted rounded" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Sort by tasks in next 5 days (descending) - busiest first
  const sortedUsers = [...users].sort((a, b) => {
    return b.tasksNext2Days - a.tasksNext2Days;
  });

  return (
    <Card className="p-card">
      <h2 className="text-heading-sm font-semibold text-foreground mb-md flex items-center gap-sm">
        <Briefcase className="h-5 w-5 text-muted-foreground" />
        Team Workload
        <span className="text-xs text-muted-foreground font-normal">(next 5 days)</span>
      </h2>
      
      <div className="space-y-sm max-h-[400px] overflow-y-auto hide-scrollbar">
        {sortedUsers.map((user) => {
          const workload = getWorkloadStatus(user.tasksNext2Days);
          const utilizationPercent = Math.min((user.tasksNext2Days / FULL_THRESHOLD) * 100, 100);
          
          return (
            <div
              key={user.userId}
              className="p-sm rounded-lg hover:bg-muted/50 transition-smooth border border-border"
            >
              <div className="flex items-center gap-sm mb-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="text-metadata">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-foreground truncate">{user.name}</p>
                  <p className="text-metadata text-muted-foreground">
                    {user.tasksNext2Days} due soon • {user.totalTasks - user.completedTasks} active
                  </p>
                </div>
                <div className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-metadata font-medium",
                  workload.status === 'balanced' && "bg-success/15 text-success",
                  workload.status === 'busy' && "bg-warning/15 text-warning-text",
                  workload.status === 'full' && "bg-destructive/15 text-destructive"
                )}>
                  {workload.status === 'full' && <Flame className="h-3 w-3" />}
                  {workload.status === 'busy' && <AlertCircle className="h-3 w-3" />}
                  {workload.status === 'balanced' && <TrendingUp className="h-3 w-3" />}
                  {workload.label}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Progress 
                  value={utilizationPercent} 
                  className={cn(
                    "h-1.5 flex-1",
                    workload.status === 'full' && "[&>div]:bg-destructive",
                    workload.status === 'busy' && "[&>div]:bg-warning"
                  )}
                />
                <span className="text-metadata text-muted-foreground w-12 text-right">
                  {user.tasksNext2Days}/{FULL_THRESHOLD}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
