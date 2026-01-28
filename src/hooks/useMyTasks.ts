import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfDay, isSameDay, isToday } from 'date-fns';

interface AgendaItem {
  id: string;
  user_id: string;
  task_id: string;
  agenda_date: string;
  is_auto_added: boolean;
  added_at: string;
  created_at: string;
}

interface UseMyTasksOptions {
  userId?: string;
  date: Date;
  allTasks: any[];
  completions?: any[];
}

export function useMyTasks({ userId, date, allTasks, completions = [] }: UseMyTasksOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const effectiveUserId = userId || user?.id;
  const agendaDate = format(date, 'yyyy-MM-dd');
  const [profileId, setProfileId] = useState<string | null>(null);

  // Fetch user's profile ID once
  useEffect(() => {
    if (!effectiveUserId) return;
    
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', effectiveUserId)
        .single();
      
      if (data) {
        setProfileId(data.id);
      }
    };
    
    fetchProfile();
  }, [effectiveUserId]);

  // Fetch agenda items for user on specific date
  const { data: agendaItems = [], isLoading, refetch } = useQuery({
    queryKey: ['user-agenda', effectiveUserId, agendaDate],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      
      const { data, error } = await supabase
        .from('user_agenda')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('agenda_date', agendaDate);
      
      if (error) {
        console.error('Error fetching agenda:', error);
        return [];
      }
      
      return data as AgendaItem[];
    },
    enabled: !!effectiveUserId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Check if user is assigned to a task - strict matching
  const isUserAssigned = useCallback((task: any) => {
    if (!task.assignees || task.assignees.length === 0) return false;
    if (!effectiveUserId) return false;
    
    return task.assignees.some((a: any) => {
      const assigneeUserId = a.user_id || a.profiles?.user_id;
      return assigneeUserId === effectiveUserId;
    });
  }, [effectiveUserId]);

  // Check if a recurring task instance occurs on the selected date
  const taskOccursOnDate = useCallback((task: any, targetDate: Date) => {
    // For new template-based instances, check occurrence_date
    if (task.occurrence_date) {
      return isSameDay(new Date(task.occurrence_date), targetDate);
    }
    
    // For regular tasks or legacy recurring, check due_at
    if (task.due_at) {
      return isSameDay(new Date(task.due_at), targetDate);
    }
    
    return false;
  }, []);

  // Auto-populate agenda based on rules
  const autoPopulateAgenda = useCallback(async () => {
    if (!effectiveUserId || !allTasks?.length || !profileId) return;

    const today = startOfDay(new Date());
    const selectedDateStart = startOfDay(date);
    const isTodayDate = isSameDay(selectedDateStart, today);
    
    const tasksToAdd: { task_id: string; is_auto_added: boolean }[] = [];
    const existingTaskIds = new Set(agendaItems.map(item => item.task_id));

    for (const task of allTasks) {
      // Skip if already in agenda
      if (existingTaskIds.has(task.id)) continue;
      
      // Skip completed, failed, or backlog tasks
      if (task.status === 'Completed' || task.status === 'Failed' || task.status === 'Backlog') continue;
      
      // Skip templates - they shouldn't appear in agenda
      if (task.is_recurrence_template) continue;
      
      // Check if user is assigned to this task
      const assigned = isUserAssigned(task);
      if (!assigned) continue;

      // RULE: Recurring task instances - check if they occur on the selected date
      const isRecurringInstance = !!task.template_task_id;
      if (isRecurringInstance) {
        const occursOnDate = taskOccursOnDate(task, date);
        if (occursOnDate) {
          tasksToAdd.push({ task_id: task.id, is_auto_added: true });
          continue;
        }
      }

      // RULE: Task due on the selected date
      if (task.due_at) {
        const taskDueDate = startOfDay(new Date(task.due_at));
        
        // If viewing today and task is overdue or due today
        if (isTodayDate && taskDueDate <= today) {
          tasksToAdd.push({ task_id: task.id, is_auto_added: true });
          continue;
        }
        
        // If task is due on the selected date (future dates)
        if (isSameDay(taskDueDate, selectedDateStart)) {
          tasksToAdd.push({ task_id: task.id, is_auto_added: true });
          continue;
        }
      }

      // RULE: High priority tasks - auto add to today only
      if (isTodayDate && task.priority === 'High') {
        tasksToAdd.push({ task_id: task.id, is_auto_added: true });
        continue;
      }
    }

    // Bulk insert new auto-populated items
    if (tasksToAdd.length > 0) {
      const { error } = await supabase
        .from('user_agenda')
        .upsert(
          tasksToAdd.map(item => ({
            user_id: effectiveUserId,
            task_id: item.task_id,
            agenda_date: agendaDate,
            is_auto_added: item.is_auto_added,
          })),
          { onConflict: 'user_id,task_id,agenda_date' }
        );
      
      if (error) {
        console.error('Error auto-populating agenda:', error.message, error.details);
      } else {
        refetch();
      }
    }
  }, [effectiveUserId, agendaDate, allTasks, agendaItems, date, profileId, isUserAssigned, taskOccursOnDate, refetch]);

  // Run auto-populate when dependencies change - debounced to prevent excessive calls
  useEffect(() => {
    if (effectiveUserId && allTasks?.length > 0 && profileId) {
      // Debounce auto-populate to prevent rapid successive calls
      const timeoutId = setTimeout(() => {
        autoPopulateAgenda();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [effectiveUserId, agendaDate, profileId]); // Removed allTasks?.length - only run on date/user change

  // Get user display name for activity logging
  const getUserDisplayName = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('user_id', userId)
      .single();
    return data?.name || data?.email || 'User';
  }, []);

  // Log activity when adding/removing from agenda
  const logAgendaActivity = useCallback(async (taskIds: string[], action: 'add' | 'remove', targetUserId: string) => {
    const currentUser = user?.id;
    if (!currentUser) return;
    
    const userName = await getUserDisplayName(currentUser);
    const targetUserName = targetUserId === currentUser ? 'their' : await getUserDisplayName(targetUserId);
    
    const actionText = action === 'add' 
      ? `${userName} added task to ${targetUserName === 'their' ? 'their' : `${targetUserName}'s`} agenda`
      : `${userName} moved task to Pool from ${targetUserName === 'their' ? 'their' : `${targetUserName}'s`} agenda`;
    
    for (const taskId of taskIds) {
      await supabase.from('comments').insert({
        task_id: taskId,
        author_id: currentUser,
        body: `📅 ${actionText}`,
      });
    }
  }, [user?.id, getUserDisplayName]);

  // Add tasks to agenda
  const addToAgenda = useMutation({
    mutationFn: async (taskIds: string[]) => {
      if (!effectiveUserId) throw new Error('No user');
      
      const items = taskIds.map(task_id => ({
        user_id: effectiveUserId,
        task_id,
        agenda_date: agendaDate,
        is_auto_added: false,
      }));
      
      const { error } = await supabase
        .from('user_agenda')
        .upsert(items, { onConflict: 'user_id,task_id,agenda_date' });
      
      if (error) {
        throw new Error(error.message);
      }
      
      await logAgendaActivity(taskIds, 'add', effectiveUserId);
      return taskIds.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-agenda', effectiveUserId, agendaDate] });
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });

  // Remove from agenda (move to pool)
  const removeFromAgenda = useMutation({
    mutationFn: async (taskIds: string[]) => {
      if (!effectiveUserId) throw new Error('No user');
      
      const { error } = await supabase
        .from('user_agenda')
        .delete()
        .eq('user_id', effectiveUserId)
        .eq('agenda_date', agendaDate)
        .in('task_id', taskIds);
      
      if (error) throw error;
      
      await logAgendaActivity(taskIds, 'remove', effectiveUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-agenda', effectiveUserId, agendaDate] });
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });

  // Get tasks that are in the agenda
  const agendaTasks = useMemo(() => {
    if (!allTasks) return [];
    
    const agendaTaskIds = new Set(agendaItems.map(item => item.task_id));
    const result: any[] = [];
    const addedIds = new Set<string>();
    
    for (const task of allTasks) {
      if (agendaTaskIds.has(task.id) && !addedIds.has(task.id)) {
        if (isUserAssigned(task)) {
          result.push(task);
          addedIds.add(task.id);
        }
      }
    }
    
    // Also include recurring instances due today that aren't in agenda yet
    for (const task of allTasks) {
      if (addedIds.has(task.id)) continue;
      if (task.status === 'Completed' || task.status === 'Failed' || task.status === 'Backlog') continue;
      if (task.is_recurrence_template) continue;
      if (!isUserAssigned(task)) continue;
      
      const isRecurringInstance = !!task.template_task_id;
      if (isRecurringInstance && taskOccursOnDate(task, date)) {
        result.push({ ...task, isRecurringOccurrence: true });
        addedIds.add(task.id);
      }
    }
    
    return result;
  }, [allTasks, agendaItems, date, isUserAssigned, taskOccursOnDate]);

  // Get tasks available to add
  const availableTasks = useMemo(() => {
    if (!allTasks || !effectiveUserId) return [];
    
    const agendaTaskIds = new Set(agendaTasks.map(t => t.id));
    
    return allTasks.filter(task => {
      if (agendaTaskIds.has(task.id)) return false;
      if (task.status === 'Completed' || task.status === 'Failed' || task.status === 'Backlog') return false;
      if (task.is_recurrence_template) return false;
      
      const assigned = isUserAssigned(task);
      const isGlobalUnassigned = task.visibility === 'global' && (!task.assignees || task.assignees.length === 0);
      
      return assigned || isGlobalUnassigned;
    });
  }, [allTasks, agendaTasks, effectiveUserId, isUserAssigned]);

  return {
    myTasks: agendaTasks,
    availableTasks,
    isLoading,
    addToMyTasks: addToAgenda.mutate,
    removeFromMyTasks: removeFromAgenda.mutate,
    isAdding: addToAgenda.isPending,
    isRemoving: removeFromAgenda.isPending,
    refetch,
    agendaItems,
    agendaTasks,
    addToAgenda: addToAgenda.mutate,
    removeFromAgenda: removeFromAgenda.mutate,
  };
}

export { useMyTasks as useUserAgenda };
