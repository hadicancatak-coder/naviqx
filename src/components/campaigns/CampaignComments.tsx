import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { useCampaignComments } from "@/hooks/useCampaignComments";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { format, formatDistanceToNow } from "date-fns";
import { CommentText } from "@/components/CommentText";

interface UtmCampaignComment {
  id: string;
  utm_campaign_id: string;
  comment_text: string;
  request_type?: string | null;
  author_name: string | null;
  author_email: string | null;
  author_id: string | null;
  is_external?: boolean | null;
  created_at: string;
  updated_at?: string | null;
}

interface CampaignCommentsProps {
  campaignId: string;
}

export function CampaignComments({ campaignId }: CampaignCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const { useUtmCampaignComments, addUtmCampaignComment, deleteUtmCampaignComment } = useCampaignComments();
  const { data: comments = [], isLoading } = useUtmCampaignComments(campaignId);
  const { user } = useAuth();
  const { isAdmin } = useUserRole();

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    
    addUtmCampaignComment.mutate({
      campaignId,
      commentText: newComment,
    }, {
      onSuccess: () => setNewComment(""),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-xs">
          <MessageSquare className="h-5 w-5" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-md">
        <ScrollArea className="h-[300px] pr-md">
          {isLoading ? (
            <div className="text-body-sm text-muted-foreground">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="text-body-sm text-muted-foreground text-center py-lg">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            <div className="space-y-md">
              {comments.map((comment: UtmCampaignComment) => (
                <div key={comment.id} className="border-b pb-sm last:border-0 group">
                  <div className="flex items-start justify-between mb-xs">
                    <div className="flex flex-col gap-xs">
                      <span className="font-medium text-body-sm">{comment.author_name}</span>
                      {comment.is_external && comment.author_email && (
                        <span className="text-metadata text-muted-foreground">
                          {comment.author_email}
                        </span>
                      )}
                      {comment.request_type && (
                        <Badge variant="secondary" className="w-fit text-metadata">
                          {comment.request_type}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-sm">
                      <span className="text-metadata text-muted-foreground">
                        {format(new Date(comment.created_at), "MMM d, h:mm a")} ({formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })})
                      </span>
                      {/* Delete button - for own comments or admin */}
                      {(user?.id === comment.author_id || isAdmin) && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => deleteUtmCampaignComment.mutate(comment.id)}
                          className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <CommentText 
                    text={comment.comment_text}
                    className="text-body-sm text-muted-foreground"
                  />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="space-y-sm">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
          />
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || addUtmCampaignComment.isPending}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-sm" />
            Post Comment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
