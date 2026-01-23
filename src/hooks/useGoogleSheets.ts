import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

export function useGoogleSheets(accessToken: string | null) {
  const queryClient = useQueryClient();

  const { data: sheets = [], isLoading } = useQuery({
    queryKey: ['google-sheets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('google_sheets_reports')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const createSheet = useMutation({
    mutationFn: async (title: string) => {
      if (!accessToken) throw new Error('Not authenticated with Google');

      // Create sheet via Google Sheets API
      const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: { title },
        }),
      });

      if (!response.ok) throw new Error('Failed to create Google Sheet');
      
      const sheet = await response.json();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Save reference in database
      const { data, error } = await supabase
        .from('google_sheets_reports')
        .insert({
          user_id: user.id,
          sheet_id: sheet.spreadsheetId,
          sheet_url: sheet.spreadsheetUrl,
          sheet_name: title,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-sheets'] });
      toast({
        title: 'Sheet Created',
        description: 'Your Google Sheet has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Creation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const saveSheet = useMutation({
    mutationFn: async ({ sheetId, sheetUrl, sheetName }: { sheetId: string; sheetUrl: string; sheetName: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('google_sheets_reports')
        .insert({
          user_id: user.id,
          sheet_id: sheetId,
          sheet_url: sheetUrl,
          sheet_name: sheetName,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-sheets'] });
      toast({
        title: 'Sheet Saved',
        description: 'Google Sheet reference saved successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Save Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteSheet = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('google_sheets_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-sheets'] });
      toast({
        title: 'Sheet Removed',
        description: 'Sheet reference has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateLastAccessed = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('google_sheets_reports')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
  });

  return {
    sheets,
    isLoading,
    createSheet: createSheet.mutate,
    saveSheet: saveSheet.mutate,
    deleteSheet: deleteSheet.mutate,
    updateLastAccessed: updateLastAccessed.mutate,
    isCreating: createSheet.isPending,
    isSaving: saveSheet.isPending,
    isDeleting: deleteSheet.isPending,
  };
}
