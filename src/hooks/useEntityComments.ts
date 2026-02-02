import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EntityComment {
  id: string;
  entity: string;
  comment_text: string;
  author_name: string | null;
  author_email: string | null;
  author_id: string | null;
  is_external: boolean;
  created_at: string;
  updated_at: string;
}

export const useEntityComments = () => {
  const queryClient = useQueryClient();

  // Get all comments for an entity
  const useComments = (entity: string) => useQuery({
    queryKey: ["entity-comments", entity],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_comments")
        .select("*")
        .eq("entity", entity)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data as EntityComment[];
    },
    enabled: !!entity,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Add comment
  const addComment = useMutation({
    mutationFn: async ({
      entity,
      commentText,
      isExternal = false,
      authorName,
      authorEmail,
    }: {
      entity: string;
      commentText: string;
      isExternal?: boolean;
      authorName?: string;
      authorEmail?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("entity_comments")
        .insert({
          entity,
          comment_text: commentText,
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
      queryClient.invalidateQueries({ queryKey: ["entity-comments"] });
      toast.success("Comment added");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to add comment");
    },
  });

  // Delete single comment
  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("entity_comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-comments"] });
      toast.success("Comment deleted");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete comment");
    },
  });

  // Clear all comments for an entity
  const clearAllEntityComments = useMutation({
    mutationFn: async (entityName: string) => {
      const { error } = await supabase
        .from("entity_comments")
        .delete()
        .eq("entity", entityName);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-comments"] });
      toast.success("All entity comments cleared");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to clear comments");
    },
  });

  return {
    useComments,
    addComment,
    deleteComment,
    clearAllEntityComments,
  };
};
