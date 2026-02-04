import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, AlertTriangle, User, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface SuspiciousActivity {
  id: string;
  user_id: string;
  activity_type: string;
  severity: string;
  details: Record<string, unknown>;
  resolved: boolean;
  created_at: string;
  user_email?: string;
}

interface SuspiciousActivityListProps {
  activities: SuspiciousActivity[];
  onResolve: (activityId: string) => void;
  loading?: boolean;
}

export function SuspiciousActivityList({
  activities,
  onResolve,
  loading,
}: SuspiciousActivityListProps) {
  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case "high":
        return "status-destructive";
      case "medium":
        return "status-warning";
      case "low":
        return "status-info";
      default:
        return "status-neutral";
    }
  };

  const formatActivityType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-sm">Suspicious Activities</CardTitle>
          <CardDescription>Real-time monitoring of unusual behavior</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-lg text-muted-foreground">
            <CheckCircle className="h-10 w-10 mx-auto mb-sm text-success-text" />
            <p>No suspicious activities detected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-heading-sm">Suspicious Activities</CardTitle>
        <CardDescription>
          {activities.length} unresolved activit{activities.length !== 1 ? "ies" : "y"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-sm">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-sm border border-border rounded-lg hover:bg-card-hover transition-smooth"
              >
                <div className="flex items-center gap-md">
                  <div className="p-sm bg-muted rounded-full">
                    <AlertTriangle className="h-4 w-4 text-warning-text" />
                  </div>
                  <div>
                    <div className="flex items-center gap-sm">
                      <span className="font-medium text-body-sm">
                        {formatActivityType(activity.activity_type)}
                      </span>
                      <Badge className={getSeverityBadgeClass(activity.severity)}>
                        {activity.severity}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-sm text-metadata text-muted-foreground mt-xs">
                      <User className="h-3 w-3" />
                      <span>{activity.user_email || activity.user_id.slice(0, 8)}...</span>
                      <Clock className="h-3 w-3 ml-sm" />
                      <span>
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {activity.details && Object.keys(activity.details).length > 0 && (
                      <p className="text-metadata text-muted-foreground mt-xs">
                        {Object.entries(activity.details)
                          .slice(0, 2)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(" • ")}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onResolve(activity.id)}
                  disabled={loading}
                >
                  Resolve
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
