import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

export interface AppSetting {
  id: string;
  key: string;
  value: Json;
  description: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

const SETTINGS_QUERY_KEY = ['app-settings'];

export function useAppSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .order('key');
      
      if (error) throw error;
      return data as AppSetting[];
    },
    staleTime: 60000, // 1 minute
    placeholderData: (prev) => prev,
  });

  const getSetting = (key: string): Json | undefined => {
    const setting = query.data?.find(s => s.key === key);
    return setting?.value;
  };

  const updateSetting = useMutation({
    mutationFn: async ({ key, value, description }: { key: string; value: Json; description?: string }) => {
      const { data, error } = await supabase
        .from('app_settings')
        .upsert({
          key,
          value,
          description,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
      toast({
        title: "Settings updated",
        description: "Your changes have been saved.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error updating settings",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,
    getSetting,
    updateSetting,
  };
}

// Hook specifically for allowed email domains
export function useAllowedDomains() {
  const { settings, isLoading, updateSetting } = useAppSettings();
  
  const rawValue = settings?.find(s => s.key === 'allowed_email_domains')?.value;
  const allowedDomains: string[] = Array.isArray(rawValue) ? (rawValue as string[]) : ['cfi.trade'];
  
  const addDomain = async (domain: string) => {
    const normalizedDomain = domain.toLowerCase().replace(/^@/, '');
    if (allowedDomains.includes(normalizedDomain)) return;
    
    await updateSetting.mutateAsync({
      key: 'allowed_email_domains',
      value: [...allowedDomains, normalizedDomain],
      description: 'List of allowed email domains for signup',
    });
  };
  
  const removeDomain = async (domain: string) => {
    const filtered = allowedDomains.filter(d => d !== domain);
    if (filtered.length === 0) {
      throw new Error('At least one domain must be allowed');
    }
    
    await updateSetting.mutateAsync({
      key: 'allowed_email_domains',
      value: filtered,
      description: 'List of allowed email domains for signup',
    });
  };
  
  return {
    allowedDomains,
    isLoading,
    addDomain,
    removeDomain,
    isUpdating: updateSetting.isPending,
  };
}
