import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapStatusToUi } from "@/lib/taskStatusMapper";

export interface ProfileData {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  title: string | null;
  phone_number: string | null;
  tagline: string | null;
  teams: string[] | null;
  working_days: string[] | null;
}

export interface TeamMember {
  user_id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
  title: string | null;
}

export const useProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      
      // Parse working_days if it's a string
      const profile = data as Record<string, unknown>;
      return {
        ...profile,
        teams: profile.teams as string[] | null,
        working_days: typeof profile.working_days === 'string' 
          ? JSON.parse(profile.working_days) 
          : profile.working_days,
      } as ProfileData;
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useTeamMembers = (teams: string[] | null | undefined) => {
  return useQuery({
    queryKey: ["team-members", teams],
    queryFn: async () => {
      if (!teams || teams.length === 0) return [];

      const { data, error } = await supabase
        .from("public_profiles")
        .select("user_id, name, username, avatar_url, title")
        .contains("teams", teams);

      if (error) throw error;
      return (data || []) as TeamMember[];
    },
    enabled: !!teams && teams.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: (previousData) => previousData,
  });
};

export const useUserTasks = (userId: string | undefined, userTeams: string[] | null | undefined) => {
  return useQuery({
    queryKey: ["user-tasks", userId],
    queryFn: async () => {
      if (!userId) return { all: [], ongoing: [], completed: [], pending: [], blocked: [], failed: [] };

      const { data: allTasksData, error } = await supabase
        .from("tasks")
        .select(`
          *,
          task_assignees(
            user_id,
            profiles!task_assignees_user_id_fkey(id, user_id, name, avatar_url, teams)
          ),
          task_comment_counts(comment_count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!allTasksData) return { all: [], ongoing: [], completed: [], pending: [], blocked: [], failed: [] };

      // Map tasks
      const mappedTasks = allTasksData.map((task: any) => ({
        ...task,
        status: mapStatusToUi(task.status),
        assignees: task.task_assignees?.map((ta: any) => ta.profiles).filter(Boolean) || [],
        comments_count: task.task_comment_counts?.[0]?.comment_count || 0,
      }));

      // Filter to only tasks assigned to this user
      const visibleTasks = mappedTasks.filter((task: any) => {
        const isDirectAssignee = task.assignees?.some((a: any) => a.user_id === userId);
        const taskTeams = Array.isArray(task.teams)
          ? task.teams
          : typeof task.teams === "string"
          ? JSON.parse(task.teams)
          : [];
        const isTeamMember = (userTeams || []).some((team: string) => taskTeams.includes(team));

        if (!isDirectAssignee && !isTeamMember) return false;
        if (task.visibility === "private" && !isDirectAssignee && !isTeamMember) return false;

        return true;
      });

      return {
        all: visibleTasks,
        ongoing: visibleTasks.filter((t: any) => t.status === "Ongoing"),
        completed: visibleTasks.filter((t: any) => t.status === "Completed"),
        pending: visibleTasks.filter((t: any) => t.status === "Pending"),
        blocked: visibleTasks.filter((t: any) => t.status === "Blocked"),
        failed: visibleTasks.filter((t: any) => t.status === "Failed"),
      };
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: (previousData) => previousData,
  });
};
