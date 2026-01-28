import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CheckSquare, AlertTriangle, ArrowRight, Target, FileText } from "lucide-react";
import { adminService } from "@/lib/adminService";
import { CardSkeleton } from "@/components/skeletons";
import { useNavigate } from "react-router-dom";
import { logger } from "@/lib/logger";
interface SystemHealth {
  users: number;
  tasks: number;
  unresolvedErrors: number;
}

export default function Overview() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await adminService.getSystemHealth();
        setHealth(data);
      } catch (error) {
        logger.error('Error fetching system health:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHealth();
  }, []);

  const statCards = [
    {
      title: "Total Users",
      subtitle: "Active team members",
      value: health?.users || 0,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
      onClick: () => navigate('/admin/users'),
    },
    {
      title: "Total Tasks",
      subtitle: "All tasks in system",
      value: health?.tasks || 0,
      icon: CheckSquare,
      color: "text-success",
      bgColor: "bg-success/10",
      onClick: () => navigate('/tasks'),
    },
    {
      title: "Unresolved Errors",
      subtitle: "Requires attention",
      value: health?.unresolvedErrors || 0,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      onClick: () => navigate('/admin/logs'),
    },
  ];

  const quickActions = [
    { label: "Manage Users", icon: Users, path: "/admin/users" },
    { label: "Manage KPIs", icon: Target, path: "/admin/kpis" },
    { label: "View Logs", icon: FileText, path: "/admin/logs" },
  ];

  return (
    <div className="space-y-lg">
      <div>
        <h2 className="text-heading-md font-semibold">System Overview</h2>
        <p className="text-body-sm text-muted-foreground mt-1">
          Monitor system health and key metrics
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
        {loading ? (
          <CardSkeleton count={4} />
        ) : (
          statCards.map((card) => (
            <Card
              key={card.title}
              className="cursor-pointer transition-smooth hover:shadow-md hover:border-primary/30 group"
              onClick={card.onClick}
            >
              <CardContent className="p-card pt-card">
                <div className="flex items-start justify-between">
                  <div className="space-y-xs">
                    <p className="text-body-sm text-muted-foreground">{card.title}</p>
                    <p className="text-3xl font-bold text-foreground">{card.value}</p>
                    <p className="text-metadata text-muted-foreground">{card.subtitle}</p>
                  </div>
                  <div className={`p-sm rounded-xl ${card.bgColor}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
                <div className="mt-md flex items-center text-metadata text-primary opacity-0 group-hover:opacity-100 transition-smooth">
                  <span>View details</span>
                  <ArrowRight className="h-3 w-3 ml-1" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-sm">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-sm">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="gap-2"
                onClick={() => navigate(action.path)}
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
