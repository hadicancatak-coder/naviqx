import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdElement {
  id: string;
  created_by: string;
  element_type: 'headline' | 'description' | 'sitelink' | 'callout';
  content: any;
  entity: string[];
  google_status: 'pending' | 'approved' | 'limited' | 'rejected';
  google_status_date?: string;
  google_status_notes?: string;
  tags: string[];
  is_favorite: boolean;
  use_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
  language?: string;
  platform?: string;
}

export function useAdElements(filters?: {
  elementType?: string;
  entity?: string;
  googleStatus?: string;
  tags?: string[];
  search?: string;
  language?: string;
  platform?: string;
}) {
  return useQuery({
    queryKey: ['ad-elements', filters],
    queryFn: async () => {
      let query = supabase.from('ad_elements').select('*');

      if (filters?.elementType) {
        query = query.eq('element_type', filters.elementType);
      }
      if (filters?.entity) {
        query = query.contains('entity', [filters.entity]);
      }
      if (filters?.googleStatus) {
        query = query.eq('google_status', filters.googleStatus);
      }
      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }
      // Note: search is done client-side after fetching since content is JSONB
      if (filters?.language && filters.language !== 'all') {
        query = query.eq('language', filters.language);
      }
      if (filters?.platform && filters.platform !== 'all') {
        query = query.eq('platform', filters.platform);
      }

      query = query.order('last_used_at', { ascending: false, nullsFirst: false })
                   .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      
      let results = data as AdElement[];
      
      // Client-side search filter for JSONB content
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        results = results.filter(element => {
          const content = typeof element.content === 'string' 
            ? element.content 
            : JSON.stringify(element.content);
          return content.toLowerCase().includes(searchLower);
        });
      }
      
      return results;
    },
  });
}

export function useCreateAdElement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (element: Omit<AdElement, 'id' | 'created_at' | 'updated_at' | 'use_count' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('ad_elements')
        .insert({ ...element, created_by: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-elements'] });
      toast({ title: 'Element saved successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to save element', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateAdElement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AdElement> }) => {
      const { data, error } = await supabase
        .from('ad_elements')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-elements'] });
      toast({ title: 'Element updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update element', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteAdElement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ad_elements')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-elements'] });
      toast({ title: 'Element deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete element', description: error.message, variant: 'destructive' });
    },
  });
}

export function useIncrementElementUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get current element
      const { data: element } = await supabase
        .from('ad_elements')
        .select('use_count')
        .eq('id', id)
        .single();
      
      if (!element) return;

      // Increment use_count and update last_used_at
      const { error } = await supabase
        .from('ad_elements')
        .update({ 
          use_count: (element.use_count || 0) + 1,
          last_used_at: new Date().toISOString() 
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-elements'] });
    },
  });
}
