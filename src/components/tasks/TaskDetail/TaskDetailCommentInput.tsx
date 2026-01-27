import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Send, Paperclip, Link2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MentionAutocomplete } from "@/components/MentionAutocomplete";
import { useTaskDetailContext } from "./TaskDetailContext";

interface PendingAttachment {
  type: 'file' | 'link';
  name: string;
  file?: File;
  url?: string;
  size_bytes?: number;
}

export function TaskDetailCommentInput() {
  const { 
    newComment, 
    setNewComment, 
    isSubmittingComment, 
    addComment, 
    users,
    selectedAssignees,
    pendingAttachments,
    setPendingAttachments
  } = useTaskDetailContext();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');

  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.warning("File too large", {
        description: `${file.name} exceeds 2MB. Please add as a link instead.`
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setPendingAttachments((prev: PendingAttachment[]) => [...prev, {
      type: 'file',
      name: file.name,
      file,
      size_bytes: file.size
    }]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddLink = () => {
    if (!linkUrl.trim()) return;

    setPendingAttachments((prev: PendingAttachment[]) => [...prev, {
      type: 'link',
      name: linkName.trim() || linkUrl.trim(),
      url: linkUrl.trim()
    }]);

    setLinkUrl('');
    setLinkName('');
    setShowLinkDialog(false);
  };

  const removeAttachment = (index: number) => {
    setPendingAttachments((prev: PendingAttachment[]) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    await addComment();
  };

  return (
    <div className="flex-shrink-0 p-md border-t border-border/30 dark:border-white/10">
      <div className="flex flex-col gap-xs">
        <MentionAutocomplete
          value={newComment}
          onChange={setNewComment}
          users={users}
          assigneeIds={selectedAssignees}
          placeholder="Write a comment... Use @ to mention"
          minRows={2}
          maxRows={3}
          noPortal
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />

        {/* Pending Attachments Preview */}
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-xs">
            {pendingAttachments.map((att: PendingAttachment, i: number) => (
              <div
                key={i}
                className={cn(
                  "inline-flex items-center gap-xs px-sm py-xs rounded-md text-metadata",
                  "bg-muted/50 border border-border"
                )}
              >
                {att.type === 'file' ? (
                  <Paperclip className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <Link2 className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="truncate max-w-[120px]">{att.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-xs">
            <span className="text-metadata text-muted-foreground">
              {newComment.trim() || pendingAttachments.length > 0 ? `⌘+Enter to send` : ''}
            </span>
          </div>
          <div className="flex items-center gap-xs">
            {/* File Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="*/*"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file (max 2MB)"
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            {/* Link Dialog */}
            <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Add link"
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Link</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-md py-sm">
                  <div className="flex flex-col gap-xs">
                    <Label htmlFor="link-url">URL</Label>
                    <Input
                      id="link-url"
                      type="url"
                      placeholder="https://..."
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-xs">
                    <Label htmlFor="link-name">Display Name (optional)</Label>
                    <Input
                      id="link-name"
                      placeholder="e.g., Design file, Documentation..."
                      value={linkName}
                      onChange={(e) => setLinkName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleAddLink} disabled={!linkUrl.trim()}>
                    Add Link
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button 
              size="sm" 
              onClick={handleSubmit}
              disabled={(!newComment.trim() && pendingAttachments.length === 0) || isSubmittingComment}
              className="gap-xs"
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
