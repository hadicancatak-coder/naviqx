import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapStatusToUi } from '@/domain';

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
  working_days: string | null;  // Plain string like "mon-fri" or "sun-thu"
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
      
      // working_days is a plain string like "mon-fri", NOT JSON - just pass it through
      return {
        ...data,
        teams: data.teams as string[] | null,
        working_days: data.working_days,
      } as ProfileData;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev, // Keeps previous data during refetch
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

      // Define task row shape from query
      interface TaskAssigneeRow {
        user_id: string;
        profiles: { id: string; user_id: string; name: string; avatar_url: string | null; teams: string[] | null } | null;
      }
      interface TaskRow {
        id: string;
        status: string;
        visibility?: string;
        teams?: string[] | string | null;
        task_assignees?: TaskAssigneeRow[];
        task_comment_counts?: Array<{ comment_count: number }>;
        [key: string]: unknown;
      }
      interface MappedTask extends Record<string, unknown> {
        id: string;
        status: string;
        assignees: Array<{ id: string; user_id: string; name: string; avatar_url: string | null; teams: string[] | null }>;
        comments_count: number;
        visibility?: string;
        teams?: string[] | null;
      }

      // Map tasks
      const mappedTasks: MappedTask[] = (allTasksData as TaskRow[]).map((task) => {
        // Normalize teams to string[] | null
        const normalizedTeams = Array.isArray(task.teams) 
          ? task.teams 
          : typeof task.teams === 'string' 
            ? JSON.parse(task.teams) as string[]
            : null;
        
        return {
          ...task,
          teams: normalizedTeams,
          status: mapStatusToUi(task.status),
          assignees: task.task_assignees?.map((ta) => ta.profiles).filter((p): p is NonNullable<typeof p> => p !== null) || [],
          comments_count: task.task_comment_counts?.[0]?.comment_count || 0,
        };
      });

      // Filter to only tasks assigned to this user
      const visibleTasks = mappedTasks.filter((task) => {
        const isDirectAssignee = task.assignees?.some((a) => a.user_id === userId);
        const taskTeams = task.teams || [];
        const isTeamMember = (userTeams || []).some((team: string) => taskTeams.includes(team));

        if (!isDirectAssignee && !isTeamMember) return false;
        if (task.visibility === "private" && !isDirectAssignee && !isTeamMember) return false;

        return true;
      });

      return {
        all: visibleTasks,
        ongoing: visibleTasks.filter((t) => t.status === "Ongoing"),
        completed: visibleTasks.filter((t) => t.status === "Completed"),
        pending: visibleTasks.filter((t) => t.status === "Pending"),
        blocked: visibleTasks.filter((t) => t.status === "Blocked"),
        failed: visibleTasks.filter((t) => t.status === "Failed"),
      };
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
};
