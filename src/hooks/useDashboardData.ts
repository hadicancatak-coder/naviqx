import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { subDays } from "date-fns";

interface TaskCounts {
  today: number;
  overdue: number;
  thisWeek: number;
  inProgress: number;
}

interface UserPerformance {
  userId: string;
  profileId: string;
  name: string;
  avatar?: string;
  totalTasks: number;
  completedTasks: number;
  visitsLast30Days: number;
  taskScore: number;
  engagementScore: number;
  score: number;
}

interface TaskStats {
  total: number;
  completed: number;
  completedThisWeek: number;
  completionRate: number;
}

interface DashboardData {
  taskCounts: TaskCounts;
  taskStats: TaskStats;
  teamPerformance: UserPerformance[];
  profileId: string | null;
}

async function fetchDashboardData(userId: string): Promise<DashboardData> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

  // Fetch all data in parallel - ONE batch of queries
  const [
    profileRes,
    allProfilesRes,
    allAssigneesRes,
    completedAssigneesRes,
    userVisitsRes,
    totalTasksRes,
    completedTasksRes,
    completedThisWeekRes,
  ] = await Promise.all([
    // Current user's profile
    supabase.from("profiles").select("id").eq("user_id", userId).single(),
    // All profiles for team performance
    supabase.from("profiles").select("id, user_id, name, avatar_url"),
    // All task assignees
    supabase.from("task_assignees").select("user_id, task_id"),
    // Completed task assignees
    supabase
      .from("task_assignees")
      .select("user_id, task_id, tasks!inner(id, status)")
      .eq("tasks.status", "Completed"),
    // User visits for engagement
    supabase
      .from("user_visits")
      .select("user_id, visited_at")
      .gte("visited_at", thirtyDaysAgo),
    // Global task stats
    supabase.from("tasks").select("id", { count: "exact", head: true }),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "Completed"),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "Completed")
      .gte("updated_at", startOfWeek.toISOString()),
  ]);

  const profile = profileRes.data;
  const profiles = allProfilesRes.data || [];
  const allAssignees = allAssigneesRes.data || [];
  const completedAssignees = completedAssigneesRes.data || [];
  const userVisits = userVisitsRes.data || [];

  // Calculate task stats
  const total = totalTasksRes.count || 0;
  const completed = completedTasksRes.count || 0;
  const completedThisWeek = completedThisWeekRes.count || 0;

  const taskStats: TaskStats = {
    total,
    completed,
    completedThisWeek,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };

  // Default task counts
  let taskCounts: TaskCounts = { today: 0, overdue: 0, thisWeek: 0, inProgress: 0 };

  if (profile) {
    // Get user's assigned task IDs
    const userTaskIds = allAssignees
      .filter((a) => a.user_id === profile.id)
      .map((a) => a.task_id);

    if (userTaskIds.length > 0) {
      // Fetch user's tasks with counts in parallel
      const [todayRes, overdueRes, weekRes, inProgressRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .in("id", userTaskIds)
          .gte("due_at", today.toISOString())
          .lt("due_at", tomorrow.toISOString())
          .neq("status", "Completed"),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .in("id", userTaskIds)
          .lt("due_at", today.toISOString())
          .not("status", "in", "(Completed,Pending)"),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .in("id", userTaskIds)
          .gte("due_at", today.toISOString())
          .lt("due_at", weekEnd.toISOString())
          .neq("status", "Completed"),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .in("id", userTaskIds)
          .eq("status", "Ongoing"),
      ]);

      taskCounts = {
        today: todayRes.count || 0,
        overdue: overdueRes.count || 0,
        thisWeek: weekRes.count || 0,
        inProgress: inProgressRes.count || 0,
      };
    }
  }

  // Calculate team performance
  const getEngagementScore = (visits: number): number => {
    if (visits >= 20) return 10;
    if (visits >= 12) return 8;
    if (visits >= 8) return 6;
    if (visits >= 4) return 4;
    if (visits >= 1) return 2;
    return 0;
  };

  const userStats: Record<string, { total: number; completed: number; visits: number }> = {};

  profiles.forEach((p) => {
    userStats[p.id] = { total: 0, completed: 0, visits: 0 };
  });

  allAssignees.forEach((a) => {
    if (userStats[a.user_id]) {
      userStats[a.user_id].total++;
    }
  });

  completedAssignees.forEach((a) => {
    if (userStats[a.user_id]) {
      userStats[a.user_id].completed++;
    }
  });

  const profileUserIdMap = new Map(profiles.map((p) => [p.user_id, p.id]));
  userVisits.forEach((v) => {
    const profileId = profileUserIdMap.get(v.user_id);
    if (profileId && userStats[profileId]) {
      userStats[profileId].visits++;
    }
  });

  const teamPerformance: UserPerformance[] = profiles
    .map((p) => {
      const stats = userStats[p.id] || { total: 0, completed: 0, visits: 0 };
      const taskScore =
        stats.total > 0 ? Math.min(10, Math.round((stats.completed / stats.total) * 10 * 10) / 10) : 0;
      const engagementScore = getEngagementScore(stats.visits);
      const score = Math.round((taskScore * 0.7 + engagementScore * 0.3) * 10) / 10;

      return {
        userId: p.user_id,
        profileId: p.id,
        name: p.name || "Unknown",
        avatar: p.avatar_url || undefined,
        totalTasks: stats.total,
        completedTasks: stats.completed,
        visitsLast30Days: stats.visits,
        taskScore,
        engagementScore,
        score,
      };
    })
    .sort((a, b) => b.score - a.score || b.totalTasks - a.totalTasks);

  return {
    taskCounts,
    taskStats,
    teamPerformance,
    profileId: profile?.id || null,
  };
}

export function useDashboardData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: () => fetchDashboardData(user!.id),
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute cache
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnWindowFocus: false,
  });
}
