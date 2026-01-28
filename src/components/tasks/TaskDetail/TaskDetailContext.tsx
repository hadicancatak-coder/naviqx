import { createContext, useContext, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeAssignees } from "@/hooks/useRealtimeAssignees";
import { useTaskChangeLogs } from "@/hooks/useTaskChangeLogs";
import { useTask } from "@/hooks/useTask";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { useTaskComments } from "@/hooks/useTaskComments";
import { useParentTask } from "@/hooks/useParentTask";
import { useTaskBlocker } from "@/hooks/useTaskBlocker";
import { useCollaborativeTask } from "@/hooks/useCollaborativeTask";
import { completeTask as completeTaskAction } from "@/domain/tasks/actions";
import { TASK_QUERY_KEY, TASK_DETAIL_KEY } from "@/lib/queryKeys";

interface TaskDetailContextValue {
  taskId: string;
  task: any;
  loading: boolean;
  mutations: ReturnType<typeof useTaskMutations>;
  comments: ReturnType<typeof useTaskComments>;
  realtimeAssignees: any[];
  refetchAssignees: () => void;
  isCompleted: boolean;
  isSubtask: boolean;
  parentTask: { id: string; title: string } | null;
  isCollaborative: boolean;
  setIsCollaborative: (v: boolean) => void;
  collaborativeStatus: {
    assignees: Array<{ id: string; name: string; completed: boolean; completedAt: string | null }>;
    allCompleted: boolean;
  } | null;
  currentUserCompleted: boolean;
  blocker: any;
  blockerDialogOpen: boolean;
  setBlockerDialogOpen: (v: boolean) => void;
  fetchBlocker: () => Promise<void>;
  changeLogs: any[];
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
  
  // Single source of truth: React Query
  const { data: task, isLoading } = useTask(taskId, cachedTask);
  const mutations = useTaskMutations();
  
  // Extracted hooks
  const comments = useTaskComments(taskId, user);
  const { assignees: realtimeAssignees, refetch: refetchAssignees } = useRealtimeAssignees("task", taskId);
  const { data: changeLogs = [] } = useTaskChangeLogs(taskId);
  const parentTask = useParentTask(task?.parent_id);
  const { blocker, blockerDialogOpen, setBlockerDialogOpen, fetchBlocker } = useTaskBlocker(taskId);
  const { collaborativeStatus, setIsCollaborative, currentUserCompleted, refreshCollaborativeStatus } = 
    useCollaborativeTask(taskId, task?.is_collaborative || false, user?.id);

  // Mark complete (respects collaborative mode)
  const markComplete = useCallback(async () => {
    if (task?.is_collaborative && user) {
      const result = await completeTaskAction(taskId, user.id);
      if (result.success) {
        if (result.data?.partialComplete) {
          toast({ title: "Marked as complete", description: result.data.message });
          await refreshCollaborativeStatus();
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
  }, [task?.is_collaborative, user, taskId, mutations, queryClient, toast, refreshCollaborativeStatus]);

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

  // Derived state
  const loading = isLoading && !task;
  const isCompleted = task?.status === 'Completed';
  const isSubtask = !!task?.parent_id;
  const isCollaborative = task?.is_collaborative || false;

  return (
    <TaskDetailContext.Provider value={{
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
    }}>
      {children}
    </TaskDetailContext.Provider>
  );
}
