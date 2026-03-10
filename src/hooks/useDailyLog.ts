import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import type { DailyLogEntry, DailyLogStatus, DailyLogPriority, RecurPattern } from "@/domain/daily-log";

const DAILY_LOG_KEY = (date: string, userId?: string) => ['daily-log-entries', date, userId ?? 'me'] as const;

export function useDailyLogEntries(logDate: string, userId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Generate recurring entries on mount for the given date
  useEffect(() => {
    if (!user) return;
    const targetUserId = userId || user.id;
    supabase.rpc('generate_recurring_log_entries', {
      p_user_id: targetUserId,
      p_date: logDate,
    }).then(({ error }) => {
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ['daily-log-entries'] });
      }
    });
  }, [user, logDate, userId, queryClient]);

  return useQuery({
    queryKey: DAILY_LOG_KEY(logDate, userId),
    queryFn: async () => {
      const targetUserId = userId || user!.id;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase
        .from('daily_log_entries') as any)
        .select('*')
        .eq('log_date', logDate)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.eq('user_id', targetUserId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as DailyLogEntry[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useAllUsersDailyLogEntries(logDate: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['daily-log-entries', logDate, 'all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_log_entries')
        .select('*')
        .eq('log_date', logDate)
        .order('user_id')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as DailyLogEntry[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useYesterdayUnresolved() {
  const { user } = useAuth();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  return useQuery({
    queryKey: ['daily-log-unresolved', yesterdayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_log_entries')
        .select('id')
        .eq('user_id', user!.id)
        .eq('log_date', yesterdayStr)
        .in('status', ['Planned', 'In Progress']);

      if (error) throw error;
      return data?.length ?? 0;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

interface CreateEntryInput {
  user_id: string;
  log_date: string;
  title: string;
  status?: DailyLogStatus;
  priority?: DailyLogPriority | null;
  due_date?: string | null;
  needs_help?: boolean;
  is_recurring?: boolean;
  recur_pattern?: RecurPattern | null;
  linked_task_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
}

export function useCreateDailyLogEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEntryInput) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase
        .from('daily_log_entries') as any)
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-log-entries'] });
    },
  });
}

export function useUpdateDailyLogEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DailyLogEntry> & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase
        .from('daily_log_entries') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-log-entries'] });
    },
  });
}

export function useDeleteDailyLogEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase
        .from('daily_log_entries') as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-log-entries'] });
    },
  });
}

export function useReorderDailyLogEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entries: { id: string; sort_order: number }[]) => {
      const promises = entries.map((e) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase
          .from('daily_log_entries') as any)
          .update({ sort_order: e.sort_order })
          .eq('id', e.id)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-log-entries'] });
    },
  });
}
