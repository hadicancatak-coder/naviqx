import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRecentActivity } from "@/lib/dashboardQueries";
import { Activity } from "lucide-react";
import { realtimeService } from "@/lib/realtimeService";

export function ActivityFeed() {
  const queryClient = useQueryClient();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activity-feed"],
    queryFn: () => getRecentActivity(10),
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Use centralized realtime service instead of creating own channel
  useEffect(() => {
    const unsubscribe = realtimeService.subscribe("activity_logs", () => {
      queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
    });

    return unsubscribe;
  }, [queryClient]);

  const getActionText = (activity: any) => {
    if (activity.field_name) {
      return `${activity.action} ${activity.entity_type} ${activity.field_name}`;
    }
    return `${activity.action} ${activity.entity_type}`;
  };

  if (isLoading) {
    return (
      <Card className="card-glow hover:shadow-soft transition-smooth p-lg">
        <div className="flex items-center gap-sm mb-lg">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-section-title">Recent Activity</h2>
        </div>
        <div className="space-y-sm">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-sm py-sm animate-pulse">
              <div className="h-8 w-8 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="card-glow hover:shadow-soft transition-smooth p-lg">
      <div className="flex items-center gap-sm mb-lg">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-section-title">Recent Activity</h2>
      </div>
      <div className="space-y-sm max-h-[400px] overflow-y-auto">
        {activities.length > 0 ? (
          activities.map((activity: any) => (
            <div key={activity.id} className="flex items-start gap-sm py-sm border-b border-border/50 last:border-0 hover:bg-muted/30 transition-smooth cursor-pointer">
              <Avatar className="h-8 w-8">
                <AvatarImage src={activity.user?.avatar_url} />
                <AvatarFallback className="bg-muted text-muted-foreground">{activity.user?.name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-body-sm text-foreground">
                  <span className="font-medium">{activity.user?.name || "Unknown"}</span>
                  {" "}{getActionText(activity)}
                </p>
                <p className="text-metadata text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-body-sm text-muted-foreground py-md">No recent activity</p>
        )}
      </div>
    </Card>
  );
}
