import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, User } from "lucide-react";

interface ExternalCommentFormProps {
  onSubmit: (params: {
    commentText: string;
    commentType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
  }) => void;
  isSubmitting: boolean;
  canComment: boolean;
  reviewerName: string;
  placeholder?: string;
  commentType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  onRequestIdentify?: () => void;
}

export function ExternalCommentForm({
  onSubmit,
  isSubmitting,
  canComment,
  reviewerName,
  placeholder = "Share your feedback...",
  commentType = "general",
  resourceId,
  metadata,
  onRequestIdentify,
}: ExternalCommentFormProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    onSubmit({
      commentText: text.trim(),
      commentType,
      resourceId,
      metadata,
    });
    setText("");
  };

  if (!canComment) {
    return (
      <button
        type="button"
        onClick={onRequestIdentify}
        className="w-full p-4 border border-dashed border-border rounded-lg text-center text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
      >
        <User className="w-5 h-5 mx-auto mb-2" />
        <span className="text-body-sm">Identify yourself to leave feedback</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2 text-metadata text-muted-foreground">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-3 h-3 text-primary" />
        </div>
        <span>Commenting as <strong className="text-foreground">{reviewerName}</strong></span>
      </div>
      
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="min-h-[80px] resize-none"
        disabled={isSubmitting}
      />
      
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={!text.trim() || isSubmitting}
        >
          <Send className="w-4 h-4 mr-2" />
          {isSubmitting ? "Sending..." : "Send Feedback"}
        </Button>
      </div>
    </form>
  );
}
