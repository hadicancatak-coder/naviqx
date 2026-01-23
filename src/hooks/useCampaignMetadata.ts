import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CampaignMetadata {
  id: string;
  utm_campaign_id: string;
  version_code: string | null;
  image_url: string | null;
  image_file_size: number | null;
  asset_link: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export const useCampaignMetadata = () => {
  const queryClient = useQueryClient();

  // Fetch metadata for a campaign
  const useMetadata = (campaignId: string) => useQuery({
    queryKey: ["campaign-metadata", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_metadata")
        .select("*")
        .eq("utm_campaign_id", campaignId)
        .maybeSingle();
      
      if (error) throw error;
      return data as CampaignMetadata | null;
    },
    enabled: !!campaignId,
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Upsert metadata
  const upsertMetadata = useMutation({
    mutationFn: async ({
      campaignId,
      versionCode,
      imageUrl,
      imageFileSize,
      assetLink,
    }: {
      campaignId: string;
      versionCode?: string;
      imageUrl?: string;
      imageFileSize?: number;
      assetLink?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("campaign_metadata")
        .upsert({
          utm_campaign_id: campaignId,
          version_code: versionCode,
          image_url: imageUrl,
          image_file_size: imageFileSize,
          asset_link: assetLink,
          created_by: user?.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'utm_campaign_id'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-metadata"] });
      toast.success("Campaign metadata saved");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save metadata");
    },
  });

  // Upload image to storage
  const uploadImage = useMutation({
    mutationFn: async ({ file, campaignId }: { file: File; campaignId: string }) => {
      // Check file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("File size exceeds 2MB limit");
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${campaignId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("campaign-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("campaign-images")
        .getPublicUrl(filePath);

      return { publicUrl, fileSize: file.size };
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to upload image");
    },
  });

  return {
    useMetadata,
    upsertMetadata,
    uploadImage,
  };
};
