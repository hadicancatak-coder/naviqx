import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCampaignComments } from "@/hooks/useCampaignComments";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Send } from "lucide-react";
import { CommentText } from "@/components/CommentText";

interface CampaignCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackingId: string;
  campaignName: string;
  entityName: string;
  isExternal?: boolean;
  externalReviewerName?: string;
  externalReviewerEmail?: string;
}

export function CampaignCommentsDialog({
  open,
  onOpenChange,
  trackingId,
  campaignName,
  entityName,
  isExternal = false,
  externalReviewerName,
  externalReviewerEmail,
}: CampaignCommentsDialogProps) {
  const { useComments, addComment } = useCampaignComments();
  const { data: comments = [], isLoading } = useComments(trackingId);
  const [newComment, setNewComment] = useState("");
  const [requestType, setRequestType] = useState<'Comment' | 'Optimize' | 'Boost' | 'Remove'>('Comment');

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await addComment.mutateAsync({
        trackingId,
        commentText: newComment,
        requestType: requestType,
        isExternal,
        authorName: externalReviewerName,
        authorEmail: externalReviewerEmail,
      });
      setNewComment("");
      setRequestType('Comment');
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] p-6">
        <DialogHeader className="space-y-sm">
          <DialogTitle>Campaign Comments</DialogTitle>
          <DialogDescription>
            {campaignName} in {entityName}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-80 border rounded-lg p-sm">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 group">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-metadata">
                      {comment.author_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-body-sm font-semibold">
                        {comment.author_name}
                      </span>
                      {comment.is_external && comment.author_email && (
                        <span className="text-metadata text-muted-foreground">
                          ({comment.author_email})
                        </span>
                      )}
                      <span className="text-metadata text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                      {comment.is_external && (
                        <Badge variant="outline" className="text-metadata">External</Badge>
                      )}
                      {comment.request_type !== 'Comment' && (
                        <Badge 
                          variant={
                            comment.request_type === 'Optimize' ? 'default' :
                            comment.request_type === 'Boost' ? 'secondary' :
                            'destructive'
                          }
                          className="text-metadata"
                        >
                          {comment.request_type === 'Optimize' && '🎯 '}
                          {comment.request_type === 'Boost' && '🚀 '}
                          {comment.request_type === 'Remove' && '🗑️ '}
                          {comment.request_type}
                        </Badge>
                      )}
                    </div>
                    <p className="text-body-sm text-foreground whitespace-pre-wrap">
                      {comment.comment_text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No comments yet</p>
          )}
        </ScrollArea>

        <div className="space-y-sm mt-md pt-md border-t">
          {isExternal && (
            <div className="space-y-sm">
              <Label className="text-body-sm">Request Type</Label>
              <Select value={requestType} onValueChange={(value: any) => setRequestType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Comment">💬 Comment</SelectItem>
                  <SelectItem value="Optimize">🎯 Optimize</SelectItem>
                  <SelectItem value="Boost">🚀 Boost</SelectItem>
                  <SelectItem value="Remove">🗑️ Remove</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="flex gap-sm">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="text-metadata">
                {isExternal ? (externalReviewerName?.charAt(0) || "?") : "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder={isExternal ? "Explain your request..." : "Add a comment..."}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px] mb-2"
              />
              <Button 
                onClick={handleAddComment} 
                disabled={!newComment.trim() || addComment.isPending}
                size="sm"
              >
                {addComment.isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-3 w-3 mr-2" />
                    {isExternal ? "Submit Request" : "Comment"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
