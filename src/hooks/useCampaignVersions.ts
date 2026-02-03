import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ACCOUNT_STRUCTURE_KEYS } from "@/lib/queryKeys";
import { toast } from "sonner";

export interface CampaignVersion {
  id: string;
  utm_campaign_id: string;
  version_number: number;
  name: string;
  landing_page: string | null;
  description: string | null;
  image_url: string | null;
  image_file_size: number | null;
  asset_link: string | null;
  version_notes: string | null;
  created_by: string | null;
  created_at: string;
  creator_name?: string | null;
}

export const useCampaignVersions = () => {
  const queryClient = useQueryClient();

  // Fetch versions for a campaign
  const useVersions = (campaignId: string) => useQuery({
    queryKey: ["campaign-versions", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("utm_campaign_versions")
        .select("*")
        .eq("utm_campaign_id", campaignId)
        .order("version_number", { ascending: false });
      
      if (error) throw error;
      
      // Fetch profiles for creators
      const creatorIds = [...new Set((data || []).map(v => v.created_by).filter(Boolean))] as string[];
      let profileMap = new Map<string, string>();

      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", creatorIds);
        
        profileMap = new Map((profiles || []).map(p => [p.user_id, p.name]));
      }

      return (data || []).map(version => ({
        ...version,
        creator_name: profileMap.get(version.created_by) || null,
      })) as CampaignVersion[];
    },
    enabled: !!campaignId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Create new version
  const createVersion = useMutation({
    mutationFn: async ({
      campaignId,
      name,
      landingPage,
      description,
      imageUrl,
      imageFileSize,
      assetLink,
      versionNotes,
    }: {
      campaignId: string;
      name: string;
      landingPage?: string;
      description?: string;
      imageUrl?: string;
      imageFileSize?: number;
      assetLink?: string;
      versionNotes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get current highest version number
      const { data: versions } = await supabase
        .from("utm_campaign_versions")
        .select("version_number")
        .eq("utm_campaign_id", campaignId)
        .order("version_number", { ascending: false })
        .limit(1);
      
      const nextVersion = (versions?.[0]?.version_number || 0) + 1;
      
      const { data, error } = await supabase
        .from("utm_campaign_versions")
        .insert({
          utm_campaign_id: campaignId,
          version_number: nextVersion,
          name,
          landing_page: landingPage,
          description,
          image_url: imageUrl,
          image_file_size: imageFileSize,
          asset_link: assetLink,
          version_notes: versionNotes,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-versions"] });
      queryClient.invalidateQueries({ queryKey: ACCOUNT_STRUCTURE_KEYS.versionCounts });
      toast.success("Campaign version saved");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to save version");
    },
  });

  // Update version
  const updateVersion = useMutation({
    mutationFn: async ({
      versionId,
      versionNotes,
      imageUrl,
      imageFileSize,
      assetLink,
    }: {
      versionId: string;
      versionNotes?: string;
      imageUrl?: string;
      imageFileSize?: number;
      assetLink?: string;
    }) => {
      const { data, error } = await supabase
        .from("utm_campaign_versions")
        .update({
          version_notes: versionNotes,
          image_url: imageUrl,
          image_file_size: imageFileSize,
          asset_link: assetLink,
        })
        .eq("id", versionId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-versions"] });
      queryClient.invalidateQueries({ queryKey: ACCOUNT_STRUCTURE_KEYS.versionCounts });
      toast.success("Version updated");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to update version");
    },
  });

  // Delete version
  const deleteVersion = useMutation({
    mutationFn: async (versionId: string) => {
      const { error } = await supabase
        .from("utm_campaign_versions")
        .delete()
        .eq("id", versionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-versions"] });
      queryClient.invalidateQueries({ queryKey: ACCOUNT_STRUCTURE_KEYS.versionCounts });
      toast.success("Version deleted");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete version");
    },
  });

  return {
    useVersions,
    createVersion,
    updateVersion,
    deleteVersion,
  };
};
