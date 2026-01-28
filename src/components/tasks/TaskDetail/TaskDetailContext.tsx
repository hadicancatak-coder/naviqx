import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeAssignees } from "@/hooks/useRealtimeAssignees";
import { useTaskChangeLogs } from "@/hooks/useTaskChangeLogs";
import { useTask } from "@/hooks/useTask";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { useTaskComments } from "@/hooks/useTaskComments";
import { completeTask as completeTaskAction, setTaskCollaborative, getCollaborativeStatus } from "@/domain/tasks/actions";
import { TASK_QUERY_KEY, TASK_DETAIL_KEY } from "@/lib/queryKeys";

interface TaskDetailContextValue {
  // Core data (from React Query - single source of truth)
  taskId: string;
  task: any;
  loading: boolean;
  
  // Mutations (direct access for all updates)
  mutations: ReturnType<typeof useTaskMutations>;
  
  // Comments (extracted hook)
  comments: ReturnType<typeof useTaskComments>;
  
  // Assignees
  realtimeAssignees: any[];
  refetchAssignees: () => void;
  
  // Derived state
  isCompleted: boolean;
  isSubtask: boolean;
  parentTask: { id: string; title: string } | null;
  
  // Collaborative
  isCollaborative: boolean;
  setIsCollaborative: (v: boolean) => void;
  collaborativeStatus: {
    assignees: Array<{ id: string; name: string; completed: boolean; completedAt: string | null }>;
    allCompleted: boolean;
  } | null;
  currentUserCompleted: boolean;
  
  // Blocker
  blocker: any;
  blockerDialogOpen: boolean;
  setBlockerDialogOpen: (v: boolean) => void;
  fetchBlocker: () => Promise<void>;
  
  // Change logs
  changeLogs: any[];
  
  // Actions
  markComplete: () => Promise<void>;
  deleteTask: () => Promise<void>;
}

const TaskDetailContext = createContext<TaskDetailContextValue | null>(null);

export function useTaskDetailContext() {
  const context = useContext(TaskDetailContext);
  if (!context) {
    throw new Error("useTaskDetailContext must be used within TaskDetailProvider");
  }
  return context;
}

interface TaskDetailProviderProps {
  taskId: string;
  cachedTask?: any;
  children: ReactNode;
  onClose?: () => void;
  onTaskDeleted?: () => void;
}

export function TaskDetailProvider({ 
  taskId, 
  cachedTask, 
  children, 
  onClose, 
  onTaskDeleted 
}: TaskDetailProviderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // =========================================================================
  // SINGLE SOURCE OF TRUTH: React Query
  // =========================================================================
  const { data: task, isLoading: taskLoading } = useTask(taskId, cachedTask);
  const mutations = useTaskMutations();
  
  // =========================================================================
  // EXTRACTED HOOKS
  // =========================================================================
  const comments = useTaskComments(taskId, user);
  const { assignees: realtimeAssignees, refetch: refetchAssignees } = useRealtimeAssignees("task", taskId);
  const { data: changeLogs = [] } = useTaskChangeLogs(taskId);
  
  // =========================================================================
  // MINIMAL LOCAL STATE (only what's truly needed)
  // =========================================================================
  const [parentTask, setParentTask] = useState<{ id: string; title: string } | null>(null);
  const [blockerDialogOpen, setBlockerDialogOpen] = useState(false);
  const [blocker, setBlocker] = useState<any>(null);
  const [collaborativeStatus, setCollaborativeStatus] = useState<{
    assignees: Array<{ id: string; name: string; completed: boolean; completedAt: string | null }>;
    allCompleted: boolean;
  } | null>(null);
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);

  // =========================================================================
  // EFFECTS (minimal - only for derived data)
  // =========================================================================
  
  // Fetch parent task for subtasks
  useEffect(() => {
    if (task?.parent_id) {
      supabase
        .from("tasks")
        .select("id, title")
        .eq("id", task.parent_id)
        .single()
        .then(({ data }) => setParentTask(data));
    } else {
      setParentTask(null);
    }
  }, [task?.parent_id]);

  // Fetch blocker
  const fetchBlocker = useCallback(async () => {
    if (!taskId) return;
    const { data } = await supabase
      .from("blockers")
      .select("*")
      .eq("task_id", taskId)
      .eq("resolved", false)
      .maybeSingle();
    setBlocker(data);
  }, [taskId]);

  useEffect(() => {
    fetchBlocker();
  }, [taskId, fetchBlocker]);

  // Fetch collaborative status when task is collaborative
  useEffect(() => {
    if (task?.is_collaborative) {
      getCollaborativeStatus(taskId).then(status => {
        setCollaborativeStatus({
          assignees: status.assignees,
          allCompleted: status.allCompleted
        });
      });
    } else {
      setCollaborativeStatus(null);
    }
  }, [task?.is_collaborative, taskId]);

  // Get current user's profile ID for collaborative completion check
  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setCurrentUserProfileId(data.id);
        });
    }
  }, [user]);

  // =========================================================================
  // ACTIONS
  // =========================================================================
  
  // Toggle collaborative mode
  const setIsCollaborative = useCallback(async (value: boolean) => {
    const result = await setTaskCollaborative(taskId, value);
    if (result.success) {
      if (value) {
        const status = await getCollaborativeStatus(taskId);
        setCollaborativeStatus({
          assignees: status.assignees,
          allCompleted: status.allCompleted
        });
      } else {
        setCollaborativeStatus(null);
      }
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TASK_DETAIL_KEY(taskId) });
      toast({ 
        title: value ? "Collaborative mode enabled" : "Collaborative mode disabled",
        description: value ? "All assignees must complete this task" : "Any assignee can complete this task"
      });
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  }, [taskId, queryClient, toast]);

  // Mark complete (respects collaborative mode)
  const markComplete = useCallback(async () => {
    if (task?.is_collaborative && user) {
      const result = await completeTaskAction(taskId, user.id);
      if (result.success) {
        if (result.data?.partialComplete) {
          toast({ 
            title: "Marked as complete", 
            description: result.data.message 
          });
          const status = await getCollaborativeStatus(taskId);
          setCollaborativeStatus({
            assignees: status.assignees,
            allCompleted: status.allCompleted
          });
        } else {
          toast({ title: "Task completed", description: "All assignees have completed" });
        }
        queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: TASK_DETAIL_KEY(taskId) });
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } else {
      mutations.updateStatus.mutate({ id: taskId, status: 'Completed' });
    }
  }, [task?.is_collaborative, user, taskId, mutations, queryClient, toast]);

  // Delete task
  const deleteTask = useCallback(async () => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    
    if (error) {
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
    } else {
      toast({ title: "Task deleted" });
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
      onTaskDeleted?.();
      onClose?.();
    }
  }, [taskId, toast, queryClient, onTaskDeleted, onClose]);

  // =========================================================================
  // DERIVED STATE
  // =========================================================================
  const loading = taskLoading && !task;
  const isCompleted = task?.status === 'Completed';
  const isSubtask = !!task?.parent_id;
  const isCollaborative = task?.is_collaborative || false;
  const currentUserCompleted = collaborativeStatus?.assignees.find(
    a => a.id === currentUserProfileId
  )?.completed || false;

  // =========================================================================
  // CONTEXT VALUE
  // =========================================================================
  const value: TaskDetailContextValue = {
    taskId,
    task,
    loading,
    mutations,
    comments,
    realtimeAssignees,
    refetchAssignees,
    isCompleted,
    isSubtask,
    parentTask,
    isCollaborative,
    setIsCollaborative,
    collaborativeStatus,
    currentUserCompleted,
    blocker,
    blockerDialogOpen,
    setBlockerDialogOpen,
    fetchBlocker,
    changeLogs,
    markComplete,
    deleteTask,
  };

  return (
    <TaskDetailContext.Provider value={value}>
      {children}
    </TaskDetailContext.Provider>
  );
}
