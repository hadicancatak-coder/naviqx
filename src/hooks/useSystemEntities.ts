import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface SystemEntity {
  id: string;
  name: string;
  code: string;
  emoji: string | null;
  is_active: boolean;
  display_order: number;
  website_param?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export const useSystemEntities = () => {
  return useQuery({
    queryKey: ['system-entities'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('system_entities')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        
        if (error) throw error;
        return (data as SystemEntity[]) || [];
      } catch (error: any) {
        logger.error('Error fetching system entities:', error);
        throw error;
      }
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
  });
};

export const useAllEntities = () => {
  return useQuery({
    queryKey: ['all-system-entities'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('system_entities')
          .select('*')
          .order('display_order', { ascending: true });
        
        if (error) throw error;
        return (data as SystemEntity[]) || [];
      } catch (error: any) {
        logger.error('Error fetching all entities:', error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - entities rarely change
    refetchOnWindowFocus: false,
    retry: 2,
    placeholderData: (previousData) => previousData,
  });
};

export const useCreateEntity = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (entity: Omit<SystemEntity, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>) => {
      try {
        const { data, error } = await supabase
          .from('system_entities')
          .insert(entity)
          .select()
          .single();
        
        if (error) throw error;
        return data as SystemEntity;
      } catch (error: any) {
        logger.error('Error creating entity:', error);
        throw error;
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['system-entities'] });
      await queryClient.cancelQueries({ queryKey: ['all-system-entities'] });
    },
    onSuccess: (data) => {
      // Optimistically add to cache
      queryClient.setQueryData(['system-entities'], (old: SystemEntity[] | undefined) => {
        if (!old) return [data];
        return [...old, data].sort((a, b) => a.display_order - b.display_order);
      });
      queryClient.setQueryData(['all-system-entities'], (old: SystemEntity[] | undefined) => {
        if (!old) return [data];
        return [...old, data].sort((a, b) => a.display_order - b.display_order);
      });
      toast({ title: 'Entity created successfully' });
    },
    onError: (error: any) => {
      logger.error('Entity creation failed:', error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['system-entities'] });
      queryClient.invalidateQueries({ queryKey: ['all-system-entities'] });
    }
  });
};

export const useUpdateEntity = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SystemEntity> & { id: string }) => {
      const { data, error } = await supabase
        .from('system_entities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as SystemEntity;
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['system-entities'] });
      await queryClient.cancelQueries({ queryKey: ['all-system-entities'] });
      const previousEntities = queryClient.getQueryData(['system-entities']);
      const previousAllEntities = queryClient.getQueryData(['all-system-entities']);
      // Optimistic update
      const updateFn = (old: SystemEntity[] | undefined) => {
        if (!old) return old;
        return old.map(e => e.id === id ? { ...e, ...updates } : e);
      };
      queryClient.setQueryData(['system-entities'], updateFn);
      queryClient.setQueryData(['all-system-entities'], updateFn);
      return { previousEntities, previousAllEntities };
    },
    onSuccess: () => {
      toast({ title: 'Entity updated successfully' });
    },
    onError: (error: any, _, context) => {
      if (context?.previousEntities) {
        queryClient.setQueryData(['system-entities'], context.previousEntities);
      }
      if (context?.previousAllEntities) {
        queryClient.setQueryData(['all-system-entities'], context.previousAllEntities);
      }
      toast({ 
        title: 'Failed to update entity', 
        description: error.message,
        variant: 'destructive' 
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['system-entities'] });
      queryClient.invalidateQueries({ queryKey: ['all-system-entities'] });
    }
  });
};

export const useDeleteEntity = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('system_entities')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['system-entities'] });
      await queryClient.cancelQueries({ queryKey: ['all-system-entities'] });
      const previousEntities = queryClient.getQueryData(['system-entities']);
      const previousAllEntities = queryClient.getQueryData(['all-system-entities']);
      // Optimistically remove
      const removeFn = (old: SystemEntity[] | undefined) => {
        if (!old) return old;
        return old.filter(e => e.id !== id);
      };
      queryClient.setQueryData(['system-entities'], removeFn);
      queryClient.setQueryData(['all-system-entities'], removeFn);
      return { previousEntities, previousAllEntities };
    },
    onSuccess: () => {
      toast({ title: 'Entity deleted successfully' });
    },
    onError: (error: any, _, context) => {
      if (context?.previousEntities) {
        queryClient.setQueryData(['system-entities'], context.previousEntities);
      }
      if (context?.previousAllEntities) {
        queryClient.setQueryData(['all-system-entities'], context.previousAllEntities);
      }
      toast({ 
        title: 'Failed to delete entity', 
        description: error.message,
        variant: 'destructive' 
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['system-entities'] });
      queryClient.invalidateQueries({ queryKey: ['all-system-entities'] });
    }
  });
};

export const useEntityChangeLog = (entityId?: string) => {
  return useQuery({
    queryKey: ['entity-change-log', entityId],
    queryFn: async () => {
      try {
        let query = supabase
          .from('entity_change_log')
          .select(`
            *,
            changed_by_profile:changed_by(name, email)
          `)
          .order('changed_at', { ascending: false })
          .limit(50);
        
        if (entityId) {
          query = query.eq('entity_id', entityId);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        return data || [];
      } catch (error: any) {
        logger.error('Error fetching entity change log:', error);
        // Return empty array on error to prevent crashes
        return [];
      }
    },
    enabled: !!entityId || entityId === undefined,
    retry: 1,
  });
};
