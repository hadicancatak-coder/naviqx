import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Lock, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { getNeedsAttention } from "@/lib/dashboardQueries";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

export function NeedsAttention() {
  const { user } = useAuth();
  const [data, setData] = useState<any>({ overdueTasks: [], blockers: [], pendingApprovals: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchNeedsAttention();
    }
  }, [user?.id]);

  const fetchNeedsAttention = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getNeedsAttention(user.id);
      setData(result);
    } catch (err) {
      logger.error('NeedsAttention: Error fetching data', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-lg">
        <div className="animate-pulse space-y-sm">
          <div className="h-6 bg-muted rounded w-40"></div>
          <div className="h-4 bg-muted rounded w-32"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-lg border-destructive/20">
        <div className="text-destructive flex items-start gap-sm">
          <AlertTriangle className="h-5 w-5 mt-0.5" />
          <div>
            <p className="font-semibold">Error Loading Data</p>
            <p className="text-body-sm">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  const totalItems = (data.overdueTasks?.length || 0) + (data.blockers?.length || 0) + (data.pendingApprovals?.length || 0);

  if (totalItems === 0) {
    return (
      <Card className="p-lg">
        <div className="flex items-center gap-sm mb-md">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-heading-md font-semibold text-foreground">Needs Attention</h2>
        </div>
        <p className="text-body-sm text-muted-foreground">No items need attention right now. Great work!</p>
      </Card>
    );
  }

  return (
    <Card className="p-lg bg-destructive/5 border-destructive/20">
      <div className="flex items-center gap-sm mb-md">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h2 className="text-heading-md font-semibold text-foreground">Needs Attention</h2>
        <Badge variant="destructive">{totalItems}</Badge>
      </div>
      
      <div className="space-y-sm">
        {data.overdueTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-sm mb-sm">
              <Clock className="h-4 w-4 text-destructive" />
              <span className="text-body-sm font-medium text-foreground">Overdue Tasks</span>
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                {data.overdueTasks.length}
              </Badge>
            </div>
            {data.overdueTasks.slice(0, 3).map((task: any) => (
              <div key={task.id} className="text-body-sm text-muted-foreground ml-lg mb-1 hover:bg-muted/30 transition-smooth cursor-pointer rounded px-sm py-1">
                • {task.title}
              </div>
            ))}
          </div>
        )}

        {data.blockers.length > 0 && (
          <div>
            <div className="flex items-center gap-sm mb-sm">
              <Lock className="h-4 w-4 text-destructive" />
              <span className="text-body-sm font-medium text-foreground">Active Blockers</span>
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                {data.blockers.length}
              </Badge>
            </div>
            {data.blockers.slice(0, 3).map((blocker: any) => (
              <div key={blocker.id} className="text-body-sm text-muted-foreground ml-lg mb-1 hover:bg-muted/30 transition-smooth cursor-pointer rounded px-sm py-1">
                • {blocker.title}
              </div>
            ))}
          </div>
        )}

        {data.pendingApprovals.length > 0 && (
          <div>
            <div className="flex items-center gap-sm mb-sm">
              <Clock className="h-4 w-4 text-warning" />
              <span className="text-body-sm font-medium text-foreground">Pending Approvals</span>
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                {data.pendingApprovals.length}
              </Badge>
            </div>
            {data.pendingApprovals.slice(0, 3).map((task: any) => (
              <div key={task.id} className="text-body-sm text-muted-foreground ml-lg mb-1 hover:bg-muted/30 transition-smooth cursor-pointer rounded px-sm py-1">
                • {task.title}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
