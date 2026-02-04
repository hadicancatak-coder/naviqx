import { formatDistanceToNow } from "date-fns";
import { PublicAccessComment } from "@/hooks/usePublicAccess";
import { User, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ExternalCommentFeedProps {
  comments: PublicAccessComment[];
  resourceId?: string; // Filter to specific resource
  showEmpty?: boolean;
}

export function ExternalCommentFeed({
  comments,
  resourceId,
  showEmpty = true,
}: ExternalCommentFeedProps) {
  // Filter comments if resourceId provided
  const filteredComments = resourceId
    ? comments.filter((c) => c.resource_id === resourceId)
    : comments;

  if (filteredComments.length === 0) {
    if (!showEmpty) return null;
    
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-body-sm">No feedback yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredComments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  );
}

function CommentItem({ comment }: { comment: PublicAccessComment }) {
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });
  
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-card/50 border border-border/50">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-body-sm text-foreground">
            {comment.reviewer_name}
          </span>
          {comment.comment_type !== 'general' && (
            <Badge variant="outline" className="text-metadata">
              {formatCommentType(comment.comment_type)}
            </Badge>
          )}
          <span className="text-metadata text-muted-foreground">
            {timeAgo}
          </span>
        </div>
        
        <p className="mt-1 text-body-sm text-foreground whitespace-pre-wrap break-words">
          {comment.comment_text}
        </p>
      </div>
    </div>
  );
}

function formatCommentType(type: string): string {
  const labels: Record<string, string> = {
    entity_feedback: 'Entity Feedback',
    version_feedback: 'Version',
    ad_feedback: 'Ad Feedback',
    section_feedback: 'Section',
    lead_quality: 'Lead Quality',
    general: 'General',
  };
  return labels[type] || type;
}
