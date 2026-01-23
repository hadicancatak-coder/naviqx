import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface KeywordList {
  id: string;
  name: string;
  entity: string;
  description: string | null;
  source_file: string | null;
  keyword_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface KeywordListItem {
  id: string;
  list_id: string;
  keyword: string;
  opportunity_score: number | null;
  clicks: number;
  impressions: number;
  ctr: number | null;
  cost: number | null;
  conversions: number | null;
  campaign: string | null;
  ad_group: string | null;
  match_type: string | null;
  action_taken: string;
  notes: string | null;
  created_at: string;
}

export interface CreateKeywordListInput {
  name: string;
  entity: string;
  description?: string;
  source_file?: string;
  items: Omit<KeywordListItem, 'id' | 'list_id' | 'created_at'>[];
}

export function useKeywordLists() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all keyword lists
  const { data: lists = [], isLoading, error } = useQuery({
    queryKey: ['keyword-lists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('keyword_lists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as KeywordList[];
    },
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Create a new keyword list with items
  const createList = useMutation({
    mutationFn: async (input: CreateKeywordListInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create the list
      const { data: list, error: listError } = await supabase
        .from('keyword_lists')
        .insert({
          name: input.name,
          entity: input.entity,
          description: input.description || null,
          source_file: input.source_file || null,
          keyword_count: input.items.length,
          created_by: user.id,
        })
        .select()
        .single();

      if (listError) throw listError;

      // Insert items in batches
      if (input.items.length > 0) {
        const itemsToInsert = input.items.map(item => ({
          list_id: list.id,
          keyword: item.keyword,
          opportunity_score: item.opportunity_score,
          clicks: item.clicks,
          impressions: item.impressions,
          ctr: item.ctr,
          cost: item.cost,
          conversions: item.conversions,
          campaign: item.campaign,
          ad_group: item.ad_group,
          match_type: item.match_type,
          action_taken: item.action_taken || 'pending',
          notes: item.notes,
        }));

        // Insert in batches of 100
        const batchSize = 100;
        for (let i = 0; i < itemsToInsert.length; i += batchSize) {
          const batch = itemsToInsert.slice(i, i + batchSize);
          const { error: itemsError } = await supabase
            .from('keyword_list_items')
            .insert(batch);

          if (itemsError) throw itemsError;
        }
      }

      return list as KeywordList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyword-lists'] });
      toast({ title: 'List saved', description: 'Your keyword analysis has been saved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error saving list', description: error.message, variant: 'destructive' });
    },
  });

  // Fetch items for a specific list
  const getListItems = async (listId: string): Promise<KeywordListItem[]> => {
    const { data, error } = await supabase
      .from('keyword_list_items')
      .select('*')
      .eq('list_id', listId)
      .order('opportunity_score', { ascending: false });

    if (error) throw error;
    return data as KeywordListItem[];
  };

  // Update list metadata
  const updateList = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<KeywordList> & { id: string }) => {
      const { data, error } = await supabase
        .from('keyword_lists')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as KeywordList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyword-lists'] });
    },
  });

  // Delete a list
  const deleteList = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('keyword_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyword-lists'] });
      toast({ title: 'List deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting list', description: error.message, variant: 'destructive' });
    },
  });

  // Update item action status
  const updateItemAction = useMutation({
    mutationFn: async ({ id, action_taken, notes }: { id: string; action_taken: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('keyword_list_items')
        .update({ action_taken, notes })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as KeywordListItem;
    },
  });

  return {
    lists,
    isLoading,
    error,
    createList,
    getListItems,
    updateList,
    deleteList,
    updateItemAction,
  };
}
