import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Clock, AlertCircle, TrendingUp, TrendingDown, Users } from "lucide-react";

interface UserStats {
  userId: string;
  userName: string;
  userEmail: string;
  avatarUrl?: string;
  completedToday: number;
  completedThisWeek: number;
  completedThisMonth: number;
  pendingCount: number;
  ongoingCount: number;
  blockedCount: number;
  totalTasks: number;
  completionRate: number;
}

interface StatusDistribution {
  pending: number;
  ongoing: number;
  completed: number;
  failed: number;
  blocked: number;
  overdue: number;
}

export const TaskAnalyticsDashboard = () => {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution>({
    pending: 0,
    ongoing: 0,
    completed: 0,
    failed: 0,
    blocked: 0,
    overdue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch all users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, name, email, avatar_url")
        .order("name");

      if (profilesError) throw profilesError;

      // Fetch all tasks with assignees
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          id,
          status,
          due_at,
          created_at,
          task_assignees (
            user_id
          )
        `);

      if (tasksError) throw tasksError;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Calculate status distribution
      const distribution: StatusDistribution = {
        pending: 0,
        ongoing: 0,
        completed: 0,
        failed: 0,
        blocked: 0,
        overdue: 0,
      };

      tasks?.forEach(task => {
        const status = task.status?.toLowerCase() || 'pending';
        if (status in distribution) {
          distribution[status as keyof StatusDistribution]++;
        }
        
        // Count overdue
        if (task.due_at && new Date(task.due_at) < now && status !== 'completed' && status !== 'failed') {
          distribution.overdue++;
        }
      });

      setStatusDistribution(distribution);

      // Calculate per-user stats
      const stats: UserStats[] = profiles?.map(profile => {
        const userTasks = tasks?.filter(task => 
          task.task_assignees?.some((a: any) => a.user_id === profile.user_id)
        ) || [];

        const completedToday = userTasks.filter(t => 
          t.status === 'Completed' && 
          new Date(t.created_at) >= todayStart
        ).length;

        const completedThisWeek = userTasks.filter(t => 
          t.status === 'Completed' && 
          new Date(t.created_at) >= weekStart
        ).length;

        const completedThisMonth = userTasks.filter(t => 
          t.status === 'Completed' && 
          new Date(t.created_at) >= monthStart
        ).length;

        const pendingCount = userTasks.filter(t => t.status === 'Pending').length;
        const ongoingCount = userTasks.filter(t => t.status === 'Ongoing').length;
        const blockedCount = userTasks.filter(t => t.status === 'Blocked').length;
        const totalTasks = userTasks.length;
        const completedTotal = userTasks.filter(t => t.status === 'Completed').length;
        const completionRate = totalTasks > 0 ? (completedTotal / totalTasks) * 100 : 0;

        return {
          userId: profile.user_id,
          userName: profile.name,
          userEmail: profile.email,
          avatarUrl: profile.avatar_url,
          completedToday,
          completedThisWeek,
          completedThisMonth,
          pendingCount,
          ongoingCount,
          blockedCount,
          totalTasks,
          completionRate,
        };
      }) || [];

      // Sort by completion rate
      stats.sort((a, b) => b.completionRate - a.completionRate);
      setUserStats(stats);

    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading analytics...</div>;
  }

  const totalTasks = Object.values(statusDistribution).reduce((a, b) => a + b, 0) - statusDistribution.overdue;

  return (
    <div className="space-y-lg">
      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-md">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-metadata">Pending</p>
                <p className="text-heading-lg font-bold text-foreground">{statusDistribution.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-metadata">Ongoing</p>
                <p className="text-heading-lg font-bold text-primary">{statusDistribution.ongoing}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-metadata">Completed</p>
                <p className="text-heading-lg font-bold text-success">{statusDistribution.completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-metadata">Blocked</p>
                <p className="text-heading-lg font-bold text-destructive">{statusDistribution.blocked}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-metadata">Overdue</p>
                <p className="text-heading-lg font-bold text-orange">{statusDistribution.overdue}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-metadata">Total</p>
                <p className="text-heading-lg font-bold text-foreground">{totalTasks}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-md">
              {userStats.map((stat) => (
                <div
                  key={stat.userId}
                  className="flex items-center justify-between p-md border border-border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-md flex-1">
                    <Avatar>
                      <AvatarImage src={stat.avatarUrl} />
                      <AvatarFallback>{stat.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{stat.userName}</p>
                      <p className="text-body-sm text-muted-foreground">{stat.userEmail}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-lg">
                    <div className="text-center">
                      <p className="text-metadata">Today</p>
                      <p className="text-heading-sm font-semibold text-foreground">{stat.completedToday}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-metadata">This Week</p>
                      <p className="text-heading-sm font-semibold text-foreground">{stat.completedThisWeek}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-metadata">This Month</p>
                      <p className="text-heading-sm font-semibold text-foreground">{stat.completedThisMonth}</p>
                    </div>
                    <div className="text-center min-w-[100px]">
                      <p className="text-metadata">Completion Rate</p>
                      <p className="text-heading-sm font-semibold text-foreground">{stat.completionRate.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="flex gap-sm ml-lg">
                    <Badge variant="outline" className="status-pending">
                      {stat.pendingCount} Pending
                    </Badge>
                    <Badge variant="outline" className="status-info">
                      {stat.ongoingCount} Ongoing
                    </Badge>
                    {stat.blockedCount > 0 && (
                      <Badge variant="destructive">
                        {stat.blockedCount} Blocked
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
