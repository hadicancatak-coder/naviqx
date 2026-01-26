import { useState } from "react";
import { MessageSquare, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useVersionComments } from "@/hooks/useVersionComments";
import { useAuth } from "@/hooks/useAuth";
import { CommentText } from "@/components/CommentText";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface VersionCommentsProps {
  versionId: string;
  campaignId: string;
  entity?: string;
}

export function VersionComments({ versionId, campaignId, entity }: VersionCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const { user } = useAuth();
  const { comments, isLoading, createComment, deleteComment } = useVersionComments(versionId);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    await createComment.mutateAsync({
      versionId,
      campaignId,
      commentText: newComment,
      entity,
    });
    setNewComment("");
  };

  return (
    <div className="space-y-md">
      <div className="flex items-center gap-sm">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-body font-medium text-foreground">Comments</h4>
        <span className="text-metadata text-muted-foreground">({comments.length})</span>
      </div>

      {/* Comment input */}
      <div className="space-y-sm">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment on this version..."
          className="min-h-[80px]"
        />
        <Button
          onClick={handleSubmit}
          disabled={!newComment.trim() || createComment.isPending}
          size="sm"
        >
          {createComment.isPending ? "Posting..." : "Post Comment"}
        </Button>
      </div>

      {/* Comments list */}
      {isLoading ? (
        <p className="text-metadata text-muted-foreground">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-metadata text-muted-foreground">No comments yet. Be the first to comment!</p>
      ) : (
        <div className="space-y-sm">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={cn(
                "bg-card border rounded-lg p-sm space-y-xs",
                comment.is_external 
                  ? "border-primary/30 bg-primary/5" 
                  : "border-border"
              )}
            >
              <div className="flex items-start justify-between gap-sm">
                <div className="flex-1">
                  <div className="flex items-center gap-xs flex-wrap">
                    <span className="text-body-sm font-medium text-foreground">
                      {comment.author_name || "Unknown User"}
                    </span>
                    {comment.is_external && (
                      <Badge variant="outline" className="text-metadata bg-primary/10 text-primary border-primary/30">
                        <ExternalLink className="size-3 mr-1" />
                        External
                      </Badge>
                    )}
                    {comment.entity && (
                      <span className="text-metadata text-muted-foreground">• {comment.entity}</span>
                    )}
                  </div>
                  <p className="text-metadata text-muted-foreground">
                    {format(new Date(comment.created_at), "MMM d, h:mm a")} ({formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })})
                  </p>
                </div>
                {/* Only show delete for own internal comments */}
                {!comment.is_external && user?.id === comment.author_id && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => deleteComment.mutate(comment.id)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
              <CommentText text={comment.comment_text} className="text-body-sm text-foreground" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
