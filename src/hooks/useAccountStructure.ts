import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TreeNode {
  id: string;
  type: 'entity' | 'campaign' | 'adgroup' | 'ad';
  name: string;
  children?: TreeNode[];
  versionCount?: number;
  status?: string;
  parentId?: string;
  languages?: string[];
}

export function useAccountStructure() {
  const entities = useQuery({
    queryKey: ['entity-presets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entity_presets')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const campaigns = useQuery({
    queryKey: ['search-campaigns-structure'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('search_campaigns')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const adGroups = useQuery({
    queryKey: ['ad-groups-structure'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_groups')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const ads = useQuery({
    queryKey: ['ads-structure'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ads')
        .select('id, name, ad_group_id, approval_status')
        .order('name');
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const versionCounts = useQuery({
    queryKey: ['version-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_versions')
        .select('ad_id');
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach(v => {
        counts[v.ad_id] = (counts[v.ad_id] || 0) + 1;
      });
      return counts;
    },
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  return {
    entities,
    campaigns,
    adGroups,
    ads,
    versionCounts,
    isLoading: entities.isLoading || campaigns.isLoading || adGroups.isLoading || ads.isLoading
  };
}
