import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { MentionAutocomplete } from "@/components/MentionAutocomplete";
import { useTaskDetailContext } from "./TaskDetailContext";

export function TaskDetailCommentInput() {
  const { 
    newComment, 
    setNewComment, 
    isSubmittingComment, 
    addComment, 
    users 
  } = useTaskDetailContext();

  return (
    <div className="flex-shrink-0 p-md border-t border-border/50 dark:border-white/10 bg-card/30 dark:bg-white/5">
      <div className="flex flex-col gap-xs">
        <MentionAutocomplete
          value={newComment}
          onChange={setNewComment}
          users={users}
          placeholder="Write a comment... Use @ to mention"
          minRows={2}
          maxRows={3}
          noPortal
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              addComment();
            }
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-metadata text-muted-foreground">
            {newComment.trim() ? `⌘+Enter to send` : ''}
          </span>
          <Button 
            size="sm" 
            onClick={addComment}
            disabled={!newComment.trim() || isSubmittingComment}
            className="gap-xs"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
