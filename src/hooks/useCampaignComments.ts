import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CampaignComment {
  id: string;
  campaign_tracking_id: string;
  comment_text: string;
  request_type: string;
  author_name: string | null;
  author_email: string | null;
  author_id: string | null;
  is_external: boolean;
  created_at: string;
  updated_at: string;
}

export const useCampaignComments = () => {
  const queryClient = useQueryClient();

  // Get all comments for a campaign tracking
  const useComments = (trackingId: string) => useQuery({
    queryKey: ["campaign-comments", trackingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_comments")
        .select("*")
        .eq("campaign_tracking_id", trackingId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data as CampaignComment[];
    },
    enabled: !!trackingId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Get all comments for a UTM campaign (campaign-level)
  const useUtmCampaignComments = (campaignId: string) => useQuery({
    queryKey: ["utm-campaign-comments", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("utm_campaign_comments")
        .select("*")
        .eq("utm_campaign_id", campaignId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Add comment
  const addComment = useMutation({
    mutationFn: async ({
      trackingId,
      commentText,
      requestType = 'Comment',
      isExternal = false,
      authorName,
      authorEmail,
    }: {
      trackingId: string;
      commentText: string;
      requestType?: string;
      isExternal?: boolean;
      authorName?: string;
      authorEmail?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("campaign_comments")
        .insert({
          campaign_tracking_id: trackingId,
          comment_text: commentText,
          request_type: requestType,
          is_external: isExternal,
          author_name: authorName || user?.email || "Anonymous",
          author_email: authorEmail || user?.email,
          author_id: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-comments"] });
      toast.success("Comment added");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add comment");
    },
  });

  // Add comment to UTM campaign
  const addUtmCampaignComment = useMutation({
    mutationFn: async ({
      campaignId,
      commentText,
      authorName,
      authorEmail,
    }: {
      campaignId: string;
      commentText: string;
      authorName?: string;
      authorEmail?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("utm_campaign_comments")
        .insert({
          utm_campaign_id: campaignId,
          comment_text: commentText,
          author_name: authorName || user?.email || "Anonymous",
          author_email: authorEmail || user?.email,
          author_id: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-campaign-comments"] });
      toast.success("Comment added");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add comment");
    },
  });

  // Delete UTM campaign comment
  const deleteUtmCampaignComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("utm_campaign_comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-campaign-comments"] });
      toast.success("Comment deleted");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete comment");
    },
  });

  // Get comment count for a tracking
  const getCommentCount = (trackingId: string) => {
    const { data: comments } = useComments(trackingId);
    return comments?.length || 0;
  };

  return {
    useComments,
    useUtmCampaignComments,
    addComment,
    addUtmCampaignComment,
    deleteUtmCampaignComment,
    getCommentCount,
  };
};
