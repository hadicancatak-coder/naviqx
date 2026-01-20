import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Target, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useKPIs } from "@/hooks/useKPIs";
import { format } from "date-fns";

export function MyKPIsProgress() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { kpis, isLoading } = useKPIs();
  const [userProfileId, setUserProfileId] = useState<string | null>(null);

  // Get the user's profile ID for KPI filtering
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchProfileId = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (data) {
        setUserProfileId(data.id);
      }
    };
    
    fetchProfileId();
  }, [user?.id]);

  // Filter KPIs assigned to the current user
  const myKpis = kpis?.filter(kpi => 
    kpi.assignments?.some(a => a.user_id === userProfileId)
  ) || [];

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center gap-sm mb-md">
          <Target className="h-5 w-5" />
          <h2 className="text-section-title">My KPIs Progress</h2>
        </div>
        <div className="animate-pulse space-y-sm">
          <div className="h-4 bg-muted rounded"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (myKpis.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-sm mb-md">
          <Target className="h-5 w-5" />
          <h2 className="text-section-title">My KPIs Progress</h2>
        </div>
        <div className="text-center py-xl">
          <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-md">No KPIs assigned yet</p>
          <Button onClick={() => navigate('/kpis')} variant="outline">
            View All KPIs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-md">
        <div className="flex items-center gap-sm">
          <Target className="h-5 w-5" />
          <h2 className="text-section-title">My KPIs Progress</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/kpis')}>
          View All
        </Button>
      </div>
      
      <div className="space-y-md">
        {myKpis.slice(0, 4).map((kpi) => {
          const assignment = kpi.assignments?.find(a => a.user_id === userProfileId);
          // Calculate progress from targets
          const totalProgress = kpi.targets?.reduce((acc, t) => {
            const progress = t.target_value > 0 
              ? Math.min(100, (t.current_value / t.target_value) * 100)
              : 0;
            return acc + progress;
          }, 0) || 0;
          const avgProgress = kpi.targets?.length ? totalProgress / kpi.targets.length : 0;

          return (
            <div key={kpi.id} className="space-y-sm p-sm rounded-lg hover:bg-muted/30 transition-smooth cursor-pointer">
              <div className="flex items-center justify-between text-body">
                <span className="line-clamp-1 font-medium">{kpi.title}</span>
                <Badge 
                  variant={assignment?.status === 'approved' ? 'default' : 'secondary'}
                  className="text-metadata"
                >
                  {assignment?.status || 'pending'}
                </Badge>
              </div>
              {kpi.description && (
                <p className="text-body-sm text-muted-foreground line-clamp-1">{kpi.description}</p>
              )}
              <Progress value={avgProgress} className="h-2" />
              <div className="flex items-center justify-between text-metadata text-muted-foreground">
                <span>{kpi.metric_type} • Target: {kpi.target}</span>
                {kpi.deadline && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(kpi.deadline), 'MMM d')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {myKpis.length > 4 && (
          <p className="text-metadata text-center text-muted-foreground">
            +{myKpis.length - 4} more KPIs
          </p>
        )}
      </div>
    </div>
  );
}