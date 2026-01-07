import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getRecentActivity } from "@/lib/dashboardQueries";
import { Activity } from "lucide-react";

export function ActivityFeed() {
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    fetchActivities();

    const channel = supabase
      .channel('activity_feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_logs' },
        () => fetchActivities()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActivities = async () => {
    const data = await getRecentActivity(10);
    setActivities(data);
  };

  const getActionText = (activity: any) => {
    if (activity.field_name) {
      return `${activity.action} ${activity.entity_type} ${activity.field_name}`;
    }
    return `${activity.action} ${activity.entity_type}`;
  };

  return (
    <Card className="card-glow hover:shadow-soft transition-smooth p-lg">
      <div className="flex items-center gap-sm mb-lg">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-section-title">Recent Activity</h2>
      </div>
      <div className="space-y-sm max-h-[400px] overflow-y-auto">
        {activities.length > 0 ? (
          activities.map((activity) => (
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
