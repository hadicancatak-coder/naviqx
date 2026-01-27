import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VersionComment {
  id: string;
  version_id: string;
  campaign_id: string;
  author_id: string | null;
  author_name: string | null;
  author_email: string | null;
  comment_text: string;
  is_external: boolean;
  entity: string | null;
  created_at: string;
  updated_at: string;
}

export const useVersionComments = (versionId: string | null) => {
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["version-comments", versionId],
    queryFn: async () => {
      if (!versionId) return [];
      
      // Fetch both internal and external comments in parallel
      const [internalResult, externalResult] = await Promise.all([
        supabase
          .from("utm_campaign_version_comments")
          .select("*")
          .eq("version_id", versionId)
          .order("created_at", { ascending: false }),
        supabase
          .from("external_campaign_review_comments")
          .select("*")
          .eq("version_id", versionId)
          .order("created_at", { ascending: false })
      ]);

      if (internalResult.error) throw internalResult.error;

      // Map internal comments
      const internalComments: VersionComment[] = (internalResult.data || []).map(c => ({
        id: c.id,
        version_id: c.version_id,
        campaign_id: c.campaign_id,
        author_id: c.author_id,
        author_name: c.author_name,
        author_email: c.author_email,
        comment_text: c.comment_text,
        is_external: false,
        entity: c.entity,
        created_at: c.created_at,
        updated_at: c.updated_at,
      }));

      // Map external comments (don't throw on error, just log it)
      let externalComments: VersionComment[] = [];
      if (!externalResult.error && externalResult.data) {
        externalComments = externalResult.data.map(c => ({
          id: c.id,
          version_id: c.version_id || "",
          campaign_id: c.campaign_id || "",
          author_id: null,
          author_name: c.reviewer_name || "External Reviewer",
          author_email: c.reviewer_email,
          comment_text: c.comment_text,
          is_external: true,
          entity: c.entity,
          created_at: c.created_at,
          updated_at: c.created_at, // external comments don't have updated_at
        }));
      }

      // Merge and sort by created_at descending
      const allComments = [...internalComments, ...externalComments].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return allComments;
    },
    enabled: !!versionId,
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const createComment = useMutation({
    mutationFn: async ({
      versionId,
      campaignId,
      commentText,
      entity,
    }: {
      versionId: string;
      campaignId: string;
      commentText: string;
      entity?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("user_id", user.id)
        .single();

      const { data, error } = await supabase
        .from("utm_campaign_version_comments")
        .insert({
          version_id: versionId,
          campaign_id: campaignId,
          author_id: user.id,
          author_name: profile?.name || "Unknown",
          author_email: profile?.email || user.email,
          comment_text: commentText,
          is_external: false,
          entity: entity || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["version-comments"] });
      toast.success("Comment added");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add comment");
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      // Only delete from internal comments table
      const { error } = await supabase
        .from("utm_campaign_version_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["version-comments"] });
      toast.success("Comment deleted");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete comment");
    },
  });

  const deleteExternalComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("external_campaign_review_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["version-comments"] });
      toast.success("External comment deleted");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete external comment");
    },
  });

  const clearAllVersionComments = useMutation({
    mutationFn: async (versionId: string) => {
      // Delete internal comments
      const { error: internalError } = await supabase
        .from("utm_campaign_version_comments")
        .delete()
        .eq("version_id", versionId);
      if (internalError) throw internalError;
      
      // Delete external comments for this version
      const { error: externalError } = await supabase
        .from("external_campaign_review_comments")
        .delete()
        .eq("version_id", versionId);
      if (externalError) throw externalError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["version-comments"] });
      toast.success("All comments cleared");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to clear comments");
    },
  });

  return {
    comments,
    isLoading,
    createComment,
    deleteComment,
    deleteExternalComment,
    clearAllVersionComments,
  };
};
