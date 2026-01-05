import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfDay, isSameDay } from 'date-fns';
import { expandRecurringTask } from '@/lib/recurrenceExpander';

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
  completions: any[];
}

export function useMyTasks({ userId, date, allTasks, completions }: UseMyTasksOptions) {
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
  });

  // Check if user is assigned to a task - strict matching
  const isUserAssigned = useCallback((task: any) => {
    if (!task.assignees || task.assignees.length === 0) return false;
    if (!effectiveUserId) return false;
    
    return task.assignees.some((a: any) => {
      // Primary check: assignee's user_id matches the effective user
      const assigneeUserId = a.user_id || a.profiles?.user_id;
      return assigneeUserId === effectiveUserId;
    });
  }, [effectiveUserId]);

  // Check if a recurring task occurs on the selected date
  // Pass empty assignees to skip working day filtering - let the task appear on all recurrence dates
  const recurringTaskOccursOnDate = useCallback((task: any, targetDate: Date) => {
    if (!task.recurrence_rrule) return false;
    
    const dateStart = startOfDay(targetDate);
    const dateEnd = new Date(dateStart);
    dateEnd.setHours(23, 59, 59, 999);
    
    try {
      // Pass empty assignees array to skip working day filtering in expansion
      // Working day filtering should happen at the UI level based on user viewing
      const occurrences = expandRecurringTask(
        task,
        dateStart,
        dateEnd,
        completions.filter(c => c.task_id === task.id),
        [] // Empty array = no working day filtering during expansion
      );
      
      return occurrences.length > 0;
    } catch (error) {
      console.error('Error expanding recurring task:', task.id, error);
      return false;
    }
  }, [completions]);

  // Auto-populate agenda based on rules
  const autoPopulateAgenda = useCallback(async () => {
    if (!effectiveUserId || !allTasks?.length || !profileId) return;

    const today = startOfDay(new Date());
    const selectedDateStart = startOfDay(date);
    const isToday = isSameDay(selectedDateStart, today);
    
    const tasksToAdd: { task_id: string; is_auto_added: boolean }[] = [];
    const existingTaskIds = new Set(agendaItems.map(item => item.task_id));

    for (const task of allTasks) {
      // Skip if already in agenda
      if (existingTaskIds.has(task.id)) continue;
      
      // Skip completed, failed, or backlog tasks
      if (task.status === 'Completed' || task.status === 'Failed' || task.status === 'Backlog') continue;
      
      // Check if user is assigned to this task
      const assigned = isUserAssigned(task);
      if (!assigned) continue;

      // RULE: Recurring tasks - check if they occur on the selected date
      // This should be checked FIRST and always auto-add if recurring on this date
      const hasRecurrence = task.task_type === 'recurring' || task.recurrence_rrule;
      if (hasRecurrence && task.recurrence_rrule) {
        const occursToday = recurringTaskOccursOnDate(task, date);
        if (occursToday) {
          tasksToAdd.push({ task_id: task.id, is_auto_added: true });
          continue;
        }
      }

      // RULE: Task due on the selected date
      if (task.due_at) {
        const taskDueDate = startOfDay(new Date(task.due_at));
        
        // If viewing today and task is overdue or due today
        if (isToday && taskDueDate <= today) {
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
      if (isToday && task.priority === 'High') {
        tasksToAdd.push({ task_id: task.id, is_auto_added: true });
        continue;
      }
    }

    // Bulk insert new auto-populated items
    if (tasksToAdd.length > 0) {
      console.log('Auto-adding tasks to agenda:', tasksToAdd.map(t => t.task_id));
      
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
        // RLS error - admin trying to add to another user's agenda
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          console.warn('RLS policy blocked agenda auto-populate for user:', effectiveUserId);
        }
      } else {
        refetch();
      }
    }
  }, [effectiveUserId, agendaDate, allTasks, agendaItems, date, profileId, isUserAssigned, recurringTaskOccursOnDate, refetch]);

  // Run auto-populate when dependencies change
  useEffect(() => {
    if (effectiveUserId && allTasks?.length > 0 && profileId) {
      autoPopulateAgenda();
    }
  }, [effectiveUserId, agendaDate, allTasks?.length, profileId]);

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
    
    // Log for each task
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
        console.error('Error adding to agenda:', error.message, error.details);
        throw new Error(error.message);
      }
      
      // Log activity
      await logAgendaActivity(taskIds, 'add', effectiveUserId);
      return taskIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['user-agenda', effectiveUserId, agendaDate] });
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
    onError: (error) => {
      console.error('Failed to add to agenda:', error);
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
      
      if (error) {
        console.error('Error removing from agenda:', error.message, error.details);
        throw error;
      }
      
      // Log activity
      await logAgendaActivity(taskIds, 'remove', effectiveUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-agenda', effectiveUserId, agendaDate] });
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });

  // Get tasks that are in the agenda (including recurring task instances)
  const agendaTasks = useMemo(() => {
    if (!allTasks) return [];
    
    const agendaTaskIds = new Set(agendaItems.map(item => item.task_id));
    const result: any[] = [];
    const addedIds = new Set<string>();
    
    // Add tasks that are in the agenda AND assigned to user (safety check for stale data)
    for (const task of allTasks) {
      if (agendaTaskIds.has(task.id) && !addedIds.has(task.id)) {
        // Only include if user is assigned (to filter out any stale agenda entries)
        if (isUserAssigned(task)) {
          result.push(task);
          addedIds.add(task.id);
        }
      }
    }
    
    // Also include recurring tasks that occur today but might not be in agenda yet
    // (for immediate display before auto-populate runs)
    for (const task of allTasks) {
      if (addedIds.has(task.id)) continue;
      if (task.status === 'Completed' || task.status === 'Failed' || task.status === 'Backlog') continue;
      if (!isUserAssigned(task)) continue;
      
      const hasRecurrence = task.task_type === 'recurring' || task.recurrence_rrule;
      if (hasRecurrence && task.recurrence_rrule) {
        const occursToday = recurringTaskOccursOnDate(task, date);
        if (occursToday) {
          result.push({ ...task, isRecurringOccurrence: true });
          addedIds.add(task.id);
        }
      }
    }
    
    return result;
  }, [allTasks, agendaItems, date, isUserAssigned, recurringTaskOccursOnDate]);

  // Get tasks available to add (assigned to user but not in agenda)
  const availableTasks = useMemo(() => {
    if (!allTasks || !effectiveUserId) return [];
    
    const agendaTaskIds = new Set(agendaTasks.map(t => t.id));
    
    return allTasks.filter(task => {
      // Not already in agenda
      if (agendaTaskIds.has(task.id)) return false;
      
      // Not completed/failed/backlog
      if (task.status === 'Completed' || task.status === 'Failed' || task.status === 'Backlog') return false;
      
      // Must be assigned to user or global/unassigned
      const assigned = isUserAssigned(task);
      const isGlobalUnassigned = task.visibility === 'global' && (!task.assignees || task.assignees.length === 0);
      
      return assigned || isGlobalUnassigned;
    });
  }, [allTasks, agendaTasks, effectiveUserId, isUserAssigned]);

  return {
    // New naming
    myTasks: agendaTasks,
    availableTasks,
    isLoading,
    addToMyTasks: addToAgenda.mutate,
    removeFromMyTasks: removeFromAgenda.mutate,
    isAdding: addToAgenda.isPending,
    isRemoving: removeFromAgenda.isPending,
    refetch,
    // Legacy naming for backwards compatibility
    agendaItems,
    agendaTasks,
    addToAgenda: addToAgenda.mutate,
    removeFromAgenda: removeFromAgenda.mutate,
  };
}

// Re-export with old name for backwards compatibility
export { useMyTasks as useUserAgenda };
