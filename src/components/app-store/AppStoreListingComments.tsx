import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, User, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Comment {
  id: string;
  reviewer_name: string;
  reviewer_email: string;
  comment_text: string;
  comment_type: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface Props {
  listingId: string;
}

export function AppStoreListingComments({ listingId }: Props) {
  // First find the active public access link for this listing
  const { data: accessLink } = useQuery({
    queryKey: ["app-store-access-link", listingId],
    queryFn: async () => {
      const { data } = await supabase
        .from("public_access_links")
        .select("id")
        .eq("resource_type", "app_store")
        .eq("resource_id", listingId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Then fetch comments for all access links for this listing
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["app-store-listing-comments", listingId, accessLink?.id],
    queryFn: async () => {
      // Get all access link IDs for this listing (active + inactive)
      const { data: links } = await supabase
        .from("public_access_links")
        .select("id")
        .eq("resource_type", "app_store")
        .eq("resource_id", listingId);

      if (!links?.length) return [];

      const linkIds = links.map((l) => l.id);

      const { data, error } = await supabase
        .from("public_access_comments")
        .select("*")
        .in("access_link_id", linkIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Comment[];
    },
    enabled: true,
  });

  const typeColor: Record<string, string> = {
    approval: "status-success",
    changes_requested: "status-warning",
    general: "status-info",
    translation: "status-purple",
  };

  const typeLabel: Record<string, string> = {
    approval: "Approved",
    changes_requested: "Changes Requested",
    general: "Comment",
    translation: "Translation",
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-body-sm">
        Loading comments…
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-md text-center p-lg">
        <div className="w-12 h-12 rounded-full bg-subtle flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-heading-sm font-semibold text-foreground">No comments yet</p>
          <p className="text-body-sm text-muted-foreground mt-xs">
            External reviewers' feedback will appear here once they comment via the shared link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-md space-y-sm">
        <p className="text-metadata text-muted-foreground font-medium mb-md">
          {comments.length} comment{comments.length !== 1 ? "s" : ""} from external reviewers
        </p>

        {comments.map((comment) => {
          const type = comment.comment_type || "general";
          return (
            <div
              key={comment.id}
              className="bg-card border border-border rounded-lg p-md transition-smooth hover:bg-card-hover"
            >
              <div className="flex items-start justify-between gap-sm mb-xs">
                <div className="flex items-center gap-xs min-w-0">
                  <div className="w-7 h-7 rounded-full bg-subtle flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium text-foreground truncate">
                      {comment.reviewer_name}
                    </p>
                    <p className="text-metadata text-muted-foreground truncate">
                      {comment.reviewer_email}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={`${typeColor[type] || ""} text-metadata flex-shrink-0`}>
                  {typeLabel[type] || type}
                </Badge>
              </div>

              <p className="text-body-sm text-foreground mt-sm whitespace-pre-wrap">
                {comment.comment_text}
              </p>

              <div className="flex items-center gap-xs mt-sm">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-metadata text-muted-foreground cursor-default">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {format(new Date(comment.created_at), "PPpp")}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
