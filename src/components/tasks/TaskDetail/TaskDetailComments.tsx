import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, ChevronRight, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CommentText } from "@/components/CommentText";
import { useAuth } from "@/hooks/useAuth";
import { useTaskDetailContext } from "./TaskDetailContext";

export function TaskDetailComments() {
  const { user } = useAuth();
  const { comments, users, messagesEndRef } = useTaskDetailContext();
  const [commentsExpanded, setCommentsExpanded] = useState(true);

  return (
    <Collapsible open={commentsExpanded} onOpenChange={setCommentsExpanded}>
      <CollapsibleTrigger className="flex items-center gap-xs w-full py-xs hover:bg-muted/50 rounded-md -mx-xs px-xs transition-smooth">
        {commentsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <Label className="text-body-sm font-medium cursor-pointer flex items-center gap-xs">
          <MessageCircle className="h-4 w-4" />
          Comments
          {comments.length > 0 && (
            <Badge variant="secondary" className="text-metadata h-5 px-1.5">{comments.length}</Badge>
          )}
        </Label>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pt-sm space-y-sm">
        {comments.length === 0 ? (
          <div className="text-center py-md text-muted-foreground">
            <MessageCircle className="h-6 w-6 mx-auto mb-xs opacity-50" />
            <p className="text-body-sm">No comments yet</p>
            <p className="text-metadata">Start the conversation below</p>
          </div>
        ) : (
          <div className="space-y-sm">
            {comments.map((comment) => {
              const isCurrentUser = comment.author?.user_id === user?.id;
              
              return (
                <div 
                  key={comment.id} 
                  className={cn("flex gap-sm", isCurrentUser && "flex-row-reverse")}
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-metadata bg-primary/10 text-primary">
                      {comment.author?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn("flex-1 min-w-0 max-w-[85%]", isCurrentUser && "flex flex-col items-end")}>
                    <div className={cn(
                      "rounded-lg px-sm py-xs max-w-full break-words",
                      isCurrentUser 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-muted/50 rounded-tl-none"
                    )}>
                      {!isCurrentUser && (
                        <div className="text-metadata font-medium mb-xs">{comment.author?.name}</div>
                      )}
                      <CommentText 
                        text={comment.body} 
                        className={cn("text-body-sm break-words", isCurrentUser && "text-primary-foreground")}
                        linkClassName={isCurrentUser ? "text-primary-foreground underline" : "text-primary underline"}
                        enableMentions
                        profiles={users}
                        inverted={isCurrentUser}
                      />
                    </div>
                    <span className="text-metadata text-muted-foreground mt-xs">
                      {format(new Date(comment.created_at), "MMM d, h:mm a")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </CollapsibleContent>
    </Collapsible>
  );
}
