import { useNavigate } from "react-router-dom";
import { CheckSquare, AlertCircle, Calendar, Activity, ChevronRight } from "lucide-react";
import { DataCard } from "@/components/layout/DataCard";
import { Badge } from "@/components/ui/badge";
import { useDashboardData } from "@/hooks/useDashboardData";

export function MyTasks() {
  const navigate = useNavigate();
  const { data, isLoading } = useDashboardData();

  const taskCounts = data?.taskCounts ?? { today: 0, overdue: 0, thisWeek: 0, inProgress: 0 };

  const handleCategoryClick = (category: string) => {
    switch (category) {
      case "Today":
        navigate("/tasks?filter=today");
        break;
      case "Overdue":
        navigate("/tasks?filter=overdue");
        break;
      case "This Week":
        navigate("/tasks?filter=week");
        break;
      case "In Progress":
        navigate("/tasks?filter=in-progress");
        break;
    }
  };

  const taskCategories = [
    { label: "Today", count: taskCounts.today, icon: CheckSquare },
    { label: "Overdue", count: taskCounts.overdue, icon: AlertCircle },
    { label: "This Week", count: taskCounts.thisWeek, icon: Calendar },
    { label: "In Progress", count: taskCounts.inProgress, icon: Activity },
  ];

  if (isLoading) {
    return (
      <DataCard className="hover:shadow-soft transition-smooth">
        <div className="h-6 bg-muted rounded w-32 mb-md animate-pulse" />
        <div className="space-y-sm">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </DataCard>
    );
  }

  return (
    <DataCard className="hover:shadow-soft transition-smooth">
      <h2 className="text-heading-sm font-semibold text-foreground mb-md">My Tasks</h2>
      <div className="space-y-sm">
        {taskCategories.map((category) => (
          <div
            key={category.label}
            onClick={() => handleCategoryClick(category.label)}
            className="flex items-center justify-between p-md rounded-lg bg-card hover:bg-card-hover border border-border/50 cursor-pointer transition-smooth hover:shadow-md hover:-translate-y-0.5 group"
          >
            <div className="flex items-center gap-sm">
              <div className="w-10 h-10 rounded-lg bg-muted/30 flex items-center justify-center">
                <category.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="font-medium text-foreground">{category.label}</span>
            </div>
            <div className="flex items-center gap-sm">
              <Badge variant="secondary" className="font-semibold">
                {category.count}
              </Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </DataCard>
  );
}
