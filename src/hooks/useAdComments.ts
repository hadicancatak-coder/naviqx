import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdComment {
  id: string;
  ad_id: string;
  author_id: string;
  body: string;
  parent_id?: string;
  created_at: string;
}

export function useAdComments(adId: string) {
  return useQuery({
    queryKey: ['ad-comments', adId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_comments')
        .select('*, profiles:author_id(name, avatar_url)')
        .eq('ad_id', adId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!adId,
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateAdComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (comment: { ad_id: string; body: string; parent_id?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('ad_comments')
        .insert({ ...comment, author_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-comments'] });
      toast({ title: 'Comment added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add comment', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateAdComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      const { data, error } = await supabase
        .from('ad_comments')
        .update({ body })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-comments'] });
      toast({ title: 'Comment updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update comment', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteAdComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ad_comments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-comments'] });
      toast({ title: 'Comment deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete comment', description: error.message, variant: 'destructive' });
    },
  });
}
