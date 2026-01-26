import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send } from "lucide-react";
import { useCampaignComments } from "@/hooks/useCampaignComments";
import { format, formatDistanceToNow } from "date-fns";
import { CommentText } from "@/components/CommentText";

interface CampaignCommentsProps {
  campaignId: string;
}

export function CampaignComments({ campaignId }: CampaignCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const { useUtmCampaignComments, addUtmCampaignComment } = useCampaignComments();
  const { data: comments = [], isLoading } = useUtmCampaignComments(campaignId);

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
        <CardTitle className="flex items-center gap-2">
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
              {comments.map((comment: any) => (
                <div key={comment.id} className="border-b pb-sm last:border-0">
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
                    <span className="text-metadata text-muted-foreground">
                      {format(new Date(comment.created_at), "MMM d, h:mm a")} ({formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })})
                    </span>
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
