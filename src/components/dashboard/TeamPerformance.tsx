import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";

export function TeamPerformance() {
  const { data, isLoading } = useDashboardData();
  const users = data?.teamPerformance ?? [];

  const getScoreColor = (score: number) => {
    if (score >= 7) return "bg-success/15 text-success";
    if (score >= 4) return "bg-warning/15 text-warning";
    return "bg-destructive/15 text-destructive";
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

  return (
    <Card className="p-card">
      <h2 className="text-heading-sm font-semibold text-foreground mb-md flex items-center gap-sm">
        <Users className="h-5 w-5 text-muted-foreground" />
        Team Performance
      </h2>
      
      <div className="flex items-center gap-md px-sm py-xs text-metadata text-muted-foreground border-b border-border mb-sm">
        <div className="w-9" />
        <div className="flex-1">Name</div>
        <div className="w-14 text-center">Total</div>
        <div className="w-14 text-center">Done</div>
        <div className="w-14 text-center">Visits</div>
        <div className="w-16 text-center">Score</div>
      </div>
      
      <div className="space-y-xs max-h-[400px] overflow-y-auto hide-scrollbar">
        {users.map((user) => (
          <div
            key={user.userId}
            className="flex items-center gap-md p-sm rounded-lg hover:bg-muted/50 transition-smooth"
            title={`Task Score: ${user.taskScore}/10 (70%) + Engagement: ${user.engagementScore}/10 (30%)`}
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="text-metadata">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-medium text-foreground truncate">{user.name}</p>
            </div>
            <div className="w-14 text-center text-body-sm text-muted-foreground">
              {user.totalTasks}
            </div>
            <div className="w-14 text-center text-body-sm text-foreground font-medium">
              {user.completedTasks}
            </div>
            <div className="w-14 text-center text-body-sm text-muted-foreground">
              {user.visitsLast30Days}
            </div>
            <div
              className={`w-16 px-sm py-xs rounded-full text-metadata font-semibold text-center ${getScoreColor(user.score)}`}
            >
              {user.score}/10
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
