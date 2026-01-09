import { Card } from "@/components/ui/card";
import { CheckCircle, ListTodo, TrendingUp, Calendar } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";

export function PerformanceMetrics() {
  const { data, isLoading } = useDashboardData();

  const stats = data?.taskStats ?? {
    total: 0,
    completed: 0,
    completedThisWeek: 0,
    completionRate: 0,
  };

  const statCards = [
    { label: "Total Tasks", value: stats.total, icon: ListTodo, color: "text-primary" },
    { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-success" },
    { label: "Completion Rate", value: `${stats.completionRate}%`, icon: TrendingUp, color: "text-warning" },
    { label: "This Week", value: stats.completedThisWeek, icon: Calendar, color: "text-primary" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-card animate-pulse">
              <div className="h-16 bg-muted rounded" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      <div>
        <h2 className="text-heading-sm font-semibold text-foreground mb-md">Performance Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
          {statCards.map((stat) => (
            <Card key={stat.label} className="p-card">
              <div className="flex items-center gap-sm">
                <div className={`p-sm rounded-lg bg-muted ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-metadata text-muted-foreground">{stat.label}</p>
                  <p className="text-heading-md font-semibold text-foreground">{stat.value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
