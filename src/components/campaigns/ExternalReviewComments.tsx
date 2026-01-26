import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { CommentText } from "@/components/CommentText";
import { Loader2, ExternalLink } from "lucide-react";

interface ExternalReviewCommentsProps {
  campaignId?: string;
  versionId?: string;
  entity?: string;
}

export function ExternalReviewComments({
  campaignId,
  versionId,
  entity,
}: ExternalReviewCommentsProps) {
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["external-review-comments", campaignId, versionId, entity],
    queryFn: async () => {
      let query = supabase
        .from("external_campaign_review_comments")
        .select("*")
        .order("created_at", { ascending: false });

      if (campaignId) {
        query = query.eq("campaign_id", campaignId);
      }
      if (versionId) {
        query = query.eq("version_id", versionId);
      }
      if (entity) {
        query = query.eq("entity", entity);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!(campaignId || versionId || entity),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-body-sm">
        No external feedback yet
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px] pr-md">
      <div className="space-y-sm">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-sm p-sm rounded-lg bg-muted/30 border border-border">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-metadata bg-primary/10">
                {comment.reviewer_name?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-xs">
              <div className="flex items-center gap-sm flex-wrap">
                <span className="font-medium text-body-sm">
                  {comment.reviewer_name}
                </span>
                <Badge variant="outline" className="text-metadata gap-xs">
                  <ExternalLink className="h-3 w-3" />
                  External Reviewer
                </Badge>
                <span className="text-metadata text-muted-foreground">
                  ({comment.reviewer_email})
                </span>
                <span className="text-metadata text-muted-foreground">
                  {format(new Date(comment.created_at), "MMM d, h:mm a")} ({formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })})
                </span>
              </div>
              <CommentText text={comment.comment_text} className="text-body-sm" />
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
