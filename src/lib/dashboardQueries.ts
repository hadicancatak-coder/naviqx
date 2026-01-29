import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export const getDashboardStats = async (userId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get user's profile.id from auth user_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!profile) return { today: 0, overdue: 0, inProgress: 0, completedThisWeek: 0 };

  // Get task IDs assigned to this user
  const { data: assignedTasks } = await supabase
    .from("task_assignees")
    .select("task_id")
    .eq("user_id", profile.id);

  const taskIds = assignedTasks?.map(a => a.task_id) || [];

  // If no tasks assigned, return zeros
  if (taskIds.length === 0) {
    return { today: 0, overdue: 0, inProgress: 0, completedThisWeek: 0 };
  }

  const [todayRes, overdueRes, inProgressRes, completedThisWeekRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .in("id", taskIds)
      .gte("due_at", today.toISOString())
      .lt("due_at", tomorrow.toISOString())
      .neq("status", "Completed"),
    
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .in("id", taskIds)
      .lt("due_at", today.toISOString())
      .neq("status", "Completed"),
    
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .in("id", taskIds)
      .eq("status", "Ongoing"),
    
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .in("id", taskIds)
      .eq("status", "Completed")
      .gte("updated_at", new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
  ]);

  return {
    today: todayRes.count || 0,
    overdue: overdueRes.count || 0,
    inProgress: inProgressRes.count || 0,
    completedThisWeek: completedThisWeekRes.count || 0,
  };
};

export const getRecentActivity = async (limit = 10) => {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("Error fetching activity:", error);
    return [];
  }

  // Fetch user profiles separately
  if (data && data.length > 0) {
    const userIds = [...new Set(data.map(log => log.user_id).filter(Boolean))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url")
      .in("user_id", userIds);
    
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    
    return data.map(log => ({
      ...log,
      user: profileMap.get(log.user_id)
    }));
  }

  return data || [];
};

export const getUpcomingTasks = async (userId: string, limit = 5) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get user's profile with working days
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, working_days")
    .eq("user_id", userId)
    .single();

  if (!profile) return [];

  // Get task IDs assigned to this user
  const { data: assignedTasks } = await supabase
    .from("task_assignees")
    .select("task_id")
    .eq("user_id", profile.id);

  const taskIds = assignedTasks?.map(a => a.task_id) || [];
  if (taskIds.length === 0) return [];

  // Fetch ALL tasks (recurring and non-recurring)
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .in("id", taskIds)
    .not("status", "in", '("Completed","Failed","Blocked")');

  if (!tasks || tasks.length === 0) return [];

  // Filter tasks based on recurrence and due date
  const todayDayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  const todayDayOfMonth = today.getDate();
  
  // Check if today is a working day for this user
  const isWorkingDay = (profile.working_days === 'mon-fri' && todayDayOfWeek >= 1 && todayDayOfWeek <= 5) ||
                       (profile.working_days === 'sun-thu' && (todayDayOfWeek === 0 || (todayDayOfWeek >= 1 && todayDayOfWeek <= 4)));

  const relevantTasks = tasks.filter(task => {
    // If task has recurrence rule
    if (task.recurrence_rrule) {
      // Only show recurring tasks on working days
      if (!isWorkingDay) return false;
      
      if (task.recurrence_rrule.includes('FREQ=DAILY')) {
        return true; // Show daily tasks every working day
      }
      if (task.recurrence_rrule.includes('FREQ=WEEKLY') && task.recurrence_day_of_week !== null) {
        return todayDayOfWeek === task.recurrence_day_of_week && isWorkingDay;
      }
      if (task.recurrence_rrule.includes('FREQ=MONTHLY') && task.recurrence_day_of_month !== null) {
        return todayDayOfMonth === task.recurrence_day_of_month && isWorkingDay;
      }
      return false;
    }
    
    // Non-recurring tasks: show if due today or overdue
    if (task.due_at) {
      const dueDate = new Date(task.due_at);
      return dueDate <= tomorrow;
    }
    
    return false;
  });

  // Sort: overdue first, then by priority
  const sortedTasks = relevantTasks.sort((a, b) => {
    if (a.due_at && b.due_at) {
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    }
    if (a.due_at && !b.due_at) return -1;
    if (!a.due_at && b.due_at) return 1;
    
    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    return (priorityOrder[a.priority as keyof typeof priorityOrder] || 1) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 1);
  }).slice(0, limit);

  // Define type for task assignee row
  interface TaskAssigneeProfile {
    user_id: string;
    name: string | null;
    avatar_url: string | null;
  }
  interface TaskAssigneeRow {
    task_id: string;
    profiles: TaskAssigneeProfile;
  }

  // Get task assignees with profiles
  const { data: taskAssigneesData } = await supabase
    .from("task_assignees")
    .select(`
      task_id,
      profiles:user_id (
        user_id,
        name,
        avatar_url
      )
    `)
    .in("task_id", sortedTasks.map(t => t.id));

  // Map assignees to tasks
  const assigneeMap = new Map<string, TaskAssigneeProfile[]>();
  const typedAssignees = taskAssigneesData as unknown as TaskAssigneeRow[] | null;
  typedAssignees?.forEach((ta) => {
    if (!assigneeMap.has(ta.task_id)) {
      assigneeMap.set(ta.task_id, []);
    }
    assigneeMap.get(ta.task_id)!.push(ta.profiles);
  });
  
  return sortedTasks.map(task => ({
    ...task,
    assignees: assigneeMap.get(task.id) || []
  }));
};

export const getNeedsAttention = async (userId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get user's profile.id from auth user_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!profile) {
    return {
      overdueTasks: [],
      blockers: [],
      pendingApprovals: [],
    };
  }

  // Get task IDs assigned to this user
  const { data: assignedTasks } = await supabase
    .from("task_assignees")
    .select("task_id")
    .eq("user_id", profile.id);

  const taskIds = assignedTasks?.map(a => a.task_id) || [];

  const [overdueTasksRes, blockersRes, pendingApprovalsRes] = await Promise.all([
    taskIds.length > 0
      ? supabase
          .from("tasks")
          .select("*")
          .in("id", taskIds)
          .lt("due_at", today.toISOString())
          .neq("status", "Completed")
          .limit(5)
      : Promise.resolve({ data: [] }),
    
    taskIds.length > 0
      ? supabase
          .from("blockers")
          .select("*, task:tasks(title)")
          .in("task_id", taskIds)
          .eq("resolved", false)
          .limit(5)
      : Promise.resolve({ data: [] }),
    
    supabase
      .from("tasks")
      .select("*")
      .eq("pending_approval", true)
      .limit(5)
  ]);

  return {
    overdueTasks: overdueTasksRes.data || [],
    blockers: blockersRes.data || [],
    pendingApprovals: pendingApprovalsRes.data || [],
  };
};
