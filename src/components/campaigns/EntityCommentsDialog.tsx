import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useEntityComments } from "@/hooks/useEntityComments";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { CommentText } from "@/components/CommentText";
import { ExternalLink } from "lucide-react";

interface EntityCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string;
  isExternal?: boolean;
  externalReviewerName?: string;
  externalReviewerEmail?: string;
}

export function EntityCommentsDialog({
  open,
  onOpenChange,
  entityName,
  isExternal = false,
  externalReviewerName,
  externalReviewerEmail,
}: EntityCommentsDialogProps) {
  const [newComment, setNewComment] = useState("");
  const { useComments, addComment } = useEntityComments();
  const { data: internalComments = [], isLoading: loadingInternal } = useComments(entityName);
  
  // Fetch external comments
  const { data: externalComments = [], isLoading: loadingExternal } = useQuery({
    queryKey: ["external-entity-comments", entityName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("external_campaign_review_comments")
        .select("*")
        .eq("entity", entityName)
        .eq("comment_type", "entity_feedback")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 1000,
  });

  // Merge and sort all comments
  const allComments = [
    ...internalComments.map(c => ({ ...c, isExternal: c.is_external || false })),
    ...externalComments.map(c => ({ 
      id: c.id,
      entity: c.entity,
      comment_text: c.comment_text,
      author_name: c.reviewer_name,
      author_email: c.reviewer_email,
      created_at: c.created_at,
      isExternal: true,
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const isLoading = loadingInternal || loadingExternal;

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await addComment.mutateAsync({
        entity: entityName,
        commentText: newComment,
        isExternal,
        authorName: isExternal ? externalReviewerName : undefined,
        authorEmail: isExternal ? externalReviewerEmail : undefined,
      });
      setNewComment("");
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] p-lg">
        <DialogHeader className="space-y-sm">
          <DialogTitle>Entity Comments</DialogTitle>
          <DialogDescription>
            Overall comments for {entityName}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-md">
          <div className="space-y-md">
            {isLoading ? (
              <div className="text-center text-body-sm text-muted-foreground py-xl">
                Loading comments...
              </div>
            ) : allComments.length === 0 ? (
              <div className="text-center text-body-sm text-muted-foreground py-xl">
                No comments yet. Be the first to add one!
              </div>
            ) : (
              allComments.map((comment) => (
                <div key={comment.id} className="flex gap-sm p-sm rounded-lg bg-muted/50">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-metadata">
                      {comment.author_name?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-xs">
                    <div className="flex items-center gap-sm flex-wrap">
                      <span className="font-medium text-body-sm">
                        {comment.author_name || "Anonymous"}
                      </span>
                      {comment.isExternal && (
                        <Badge variant="outline" className="text-metadata gap-xs">
                          <ExternalLink className="h-3 w-3" />
                          External
                        </Badge>
                      )}
                      {comment.isExternal && comment.author_email && (
                        <span className="text-metadata text-muted-foreground">
                          ({comment.author_email})
                        </span>
                      )}
                      <span className="text-metadata text-muted-foreground">
                        {format(new Date(comment.created_at), "MMM d, h:mm a")} ({formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })})
                      </span>
                    </div>
                    <CommentText text={comment.comment_text} className="text-body-sm" />
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="space-y-sm pt-md border-t">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px]"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim() || addComment.isPending}
            >
              {addComment.isPending ? "Adding..." : "Add Comment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
