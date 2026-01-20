import { useNavigate } from "react-router-dom";
import { CheckSquare, AlertCircle, Calendar, Activity, ChevronRight, Timer } from "lucide-react";
import { DataCard } from "@/components/layout/DataCard";
import { useDashboardData } from "@/hooks/useDashboardData";

export function MyTasks() {
  const navigate = useNavigate();
  const { data, isLoading } = useDashboardData();

  const taskCounts = data?.taskCounts ?? { today: 0, overdue: 0, thisWeek: 0, inProgress: 0, stale: 0 };

  const stats = [
    { 
      icon: Calendar, 
      label: "Due Today", 
      value: taskCounts.today, 
      color: "text-primary", 
      bg: "bg-primary/10",
      onClick: () => navigate('/tasks?filter=today')
    },
    { 
      icon: AlertCircle, 
      label: "Overdue", 
      value: taskCounts.overdue, 
      color: "text-destructive", 
      bg: "bg-destructive/10",
      onClick: () => navigate('/tasks?filter=overdue')
    },
    { 
      icon: Activity, 
      label: "In Progress", 
      value: taskCounts.inProgress, 
      color: "text-success", 
      bg: "bg-success/10",
      onClick: () => navigate('/tasks?filter=in-progress')
    },
    { 
      icon: Timer, 
      label: "Stale", 
      value: taskCounts.stale, 
      color: "text-warning", 
      bg: "bg-warning/10",
      onClick: () => navigate('/tasks?filter=stale')
    },
  ];

  if (isLoading) {
    return (
      <DataCard className="hover:shadow-soft transition-smooth">
        <div className="h-6 bg-muted rounded w-32 mb-md animate-pulse" />
        <div className="grid grid-cols-2 gap-sm">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </DataCard>
    );
  }

  return (
    <DataCard className="hover:shadow-soft transition-smooth">
      <div className="flex items-center justify-between mb-md">
        <div className="flex items-center gap-sm">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <CheckSquare className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-heading-sm font-semibold text-foreground">My Tasks</h2>
        </div>
        <button
          onClick={() => navigate('/tasks')}
          className="text-body-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          View all
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-sm">
        {stats.map((stat) => (
          <button
            key={stat.label}
            onClick={stat.onClick}
            className="flex items-center gap-sm p-sm rounded-lg bg-card hover:bg-card-hover border border-border/50 transition-smooth text-left group"
          >
            <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-heading-sm font-semibold text-foreground">{stat.value}</p>
              <p className="text-metadata text-muted-foreground truncate">{stat.label}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </DataCard>
  );
}
