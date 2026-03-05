import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CurrentProfile {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  email: string | null;
  username: string | null;
}

/**
 * Shared hook to resolve auth.uid() → profiles row.
 * Cached for 10 minutes to avoid redundant fetches across hooks.
 */
export function useCurrentProfile() {
  const { user } = useAuth();

  const { data: profile = null } = useQuery({
    queryKey: ['currentProfile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, name, avatar_url, email, username')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data as CurrentProfile;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  return profile;
}
