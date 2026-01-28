import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useKPIs } from "@/hooks/useKPIs";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageContainer, PageHeader, EmptyState } from "@/components/layout";
import { CardSkeleton } from "@/components/skeletons/CardSkeleton";
import { Target, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function KPIs() {
  const { user, loading: authLoading } = useAuth();
  const { kpis, isLoading, isError } = useKPIs();
  const [userProfileId, setUserProfileId] = useState<string | null>(null);

  // Get current user's profile ID
  useEffect(() => {
    const fetchUserProfileId = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (data) {
        setUserProfileId(data.id);
      }
    };
    
    fetchUserProfileId();
  }, [user?.id]);

  // Filter KPIs assigned to current user using profile ID
  const myKPIs = kpis?.filter(kpi => 
    kpi.assignments?.some(assignment => assignment.user_id === userProfileId)
  ) || [];

  // Wait for auth to resolve first
  if (authLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageContainer>
    );
  }

  // Handle error state
  if (isError) {
    return (
      <PageContainer>
        <PageHeader
          icon={Target}
          title="My KPIs"
          description="Track your key performance indicators and goals"
        />
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-md">
          <p className="text-muted-foreground">Could not load KPIs.</p>
        </div>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader
          icon={Target}
          title="My KPIs"
          description="Track your key performance indicators and goals"
        />
        <div className="grid gap-md md:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        icon={Target}
        title="My KPIs"
        description="Track your key performance indicators and goals"
      />

      {myKPIs.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No KPIs Assigned"
          description="You don't have any KPIs assigned yet. Your manager will assign KPIs that you'll be able to track here."
        />
      ) : (
        <div className="grid gap-md md:grid-cols-2 lg:grid-cols-3">
          {myKPIs.map((kpi) => {
            const myAssignment = kpi.assignments?.find(a => a.user_id === userProfileId);
            const totalTarget = kpi.targets?.reduce((sum, t) => sum + t.target_value, 0) || 0;
            const totalCurrent = kpi.targets?.reduce((sum, t) => sum + t.current_value, 0) || 0;
            const progress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

            return (
              <Card key={kpi.id} className="surface-elevated hover-lift transition-smooth">
                <CardHeader className="pb-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-heading-sm">{kpi.title}</CardTitle>
                      {kpi.description && (
                        <CardDescription className="mt-xs text-body-sm">{kpi.description}</CardDescription>
                      )}
                    </div>
                    <Badge 
                      variant={myAssignment?.status === 'approved' ? 'default' : 'secondary'}
                      className="shrink-0"
                    >
                      {myAssignment?.status || 'pending'}
                    </Badge>
                  </div>
                  <div className="flex gap-xs mt-sm flex-wrap">
                    <Badge variant="outline" className="text-metadata">{kpi.metric_type}</Badge>
                    <Badge variant="outline" className="text-metadata">Target: {kpi.target}</Badge>
                    {kpi.deadline && (
                      <Badge variant="outline" className="text-metadata flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(kpi.deadline), 'MMM d, yyyy')}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-md">
                  <div>
                    <div className="flex justify-between text-body-sm mb-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium text-foreground">{progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {kpi.targets && kpi.targets.length > 0 && (
                    <div className="space-y-xs">
                      <h4 className="text-body-sm font-medium flex items-center gap-xs">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Targets
                      </h4>
                      {kpi.targets.map((target) => (
                        <div key={target.id} className="flex items-center justify-between text-body-sm p-sm bg-muted/50 rounded-lg">
                          <span className="text-muted-foreground">{target.target_name}</span>
                          <span className="font-medium text-foreground">
                            {target.current_value} / {target.target_value} {target.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {myAssignment?.notes && (
                    <div className="text-body-sm p-sm bg-accent/10 rounded-lg border border-accent/20">
                      <p className="text-muted-foreground">{myAssignment.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}