import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LpExternalComment {
  id: string;
  lp_map_id: string;
  section_id: string | null;
  reviewer_name: string;
  reviewer_email: string;
  comment_text: string;
  access_token: string;
  created_at: string;
}

export const useLpExternalComments = (mapId: string | null) => {
  return useQuery({
    queryKey: ["lp-comments", mapId],
    queryFn: async () => {
      if (!mapId) return [];

      const { data, error } = await supabase
        .from("lp_external_comments")
        .select("*")
        .eq("lp_map_id", mapId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching LP comments:", error);
        throw error;
      }

      return (data || []) as LpExternalComment[];
    },
    enabled: !!mapId,
  });
};

export const useAddLpComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mapId,
      sectionId,
      reviewerName,
      reviewerEmail,
      commentText,
      accessToken,
    }: {
      mapId: string;
      sectionId?: string;
      reviewerName: string;
      reviewerEmail: string;
      commentText: string;
      accessToken: string;
    }) => {
      const { data, error } = await supabase
        .from("lp_external_comments")
        .insert({
          lp_map_id: mapId,
          section_id: sectionId || null,
          reviewer_name: reviewerName,
          reviewer_email: reviewerEmail,
          comment_text: commentText,
          access_token: accessToken,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lp-comments", variables.mapId] });
      toast.success("Comment submitted successfully");
    },
    onError: (error) => {
      console.error("Error adding comment:", error);
      toast.error("Failed to submit comment");
    },
  });
};
