import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { setTaskCollaborative, getCollaborativeStatus } from "@/domain/tasks/actions";
import { TASK_QUERY_KEY, TASK_DETAIL_KEY } from "@/lib/queryKeys";

interface CollaborativeStatus {
  assignees: Array<{ id: string; name: string; completed: boolean; completedAt: string | null }>;
  allCompleted: boolean;
}

export function useCollaborativeTask(
  taskId: string, 
  isCollaborative: boolean, 
  userId: string | undefined
) {
  const [status, setStatus] = useState<CollaborativeStatus | null>(null);
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch collaborative status when task is collaborative
  useEffect(() => {
    if (isCollaborative && taskId) {
      getCollaborativeStatus(taskId).then(result => {
        setStatus({
          assignees: result.assignees,
          allCompleted: result.allCompleted
        });
      });
    } else {
      setStatus(null);
    }
  }, [isCollaborative, taskId]);

  // Fetch current user's profile ID
  useEffect(() => {
    if (userId) {
      supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single()
        .then(({ data }) => {
          if (data) setCurrentUserProfileId(data.id);
        });
    }
  }, [userId]);

  // Toggle collaborative mode
  const setIsCollaborative = useCallback(async (value: boolean) => {
    const result = await setTaskCollaborative(taskId, value);
    if (result.success) {
      if (value) {
        const newStatus = await getCollaborativeStatus(taskId);
        setStatus({
          assignees: newStatus.assignees,
          allCompleted: newStatus.allCompleted
        });
      } else {
        setStatus(null);
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

  // Check if current user has completed their part
  const currentUserCompleted = status?.assignees.find(
    a => a.id === currentUserProfileId
  )?.completed || false;

  return { 
    collaborativeStatus: status, 
    setIsCollaborative, 
    currentUserCompleted,
    refreshCollaborativeStatus: async () => {
      if (taskId) {
        const newStatus = await getCollaborativeStatus(taskId);
        setStatus({
          assignees: newStatus.assignees,
          allCompleted: newStatus.allCompleted
        });
      }
    }
  };
}
