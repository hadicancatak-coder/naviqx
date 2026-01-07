import { useState, useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Subtask } from "@/hooks/useSubtasks";

interface SubtaskRowProps {
  subtask: Subtask;
  onComplete: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onTitleChange?: (id: string, title: string) => void;
  isProcessing?: boolean;
}

export function SubtaskRow({ 
  subtask, 
  onComplete, 
  onDelete, 
  onTitleChange,
  isProcessing 
}: SubtaskRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(subtask.title);
  const [openDropdown, setOpenDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCompleted = subtask.status === 'Completed';

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveTitle = () => {
    if (editValue.trim() && editValue !== subtask.title) {
      onTitleChange?.(subtask.id, editValue.trim());
    } else {
      setEditValue(subtask.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    }
    if (e.key === 'Escape') {
      setEditValue(subtask.title);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-xxs h-row-compact pl-lg pr-sm transition-smooth group",
        "hover:bg-card-hover border-b border-border/50 last:border-0",
        isCompleted && "opacity-60"
      )}
    >
      {/* Completion Checkbox */}
      <Checkbox
        checked={isCompleted}
        onCheckedChange={(checked) => onComplete(subtask.id, checked as boolean)}
        disabled={isProcessing}
        className={cn(
          "border-border flex-shrink-0",
          isCompleted && "bg-success border-success"
        )}
      />

      {/* Title */}
      {isEditing ? (
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSaveTitle}
          onKeyDown={handleKeyDown}
          className="h-6 text-body-sm flex-1 border-border"
        />
      ) : (
        <span
          onDoubleClick={() => setIsEditing(true)}
          className={cn(
            "flex-1 text-body-sm text-foreground truncate min-w-0 cursor-text",
            isCompleted && "line-through text-muted-foreground"
          )}
        >
          {subtask.title}
        </span>
      )}

      {/* Assignee Avatar (smaller) */}
      {subtask.assignees && subtask.assignees.length > 0 && (
        <div className="flex -space-x-1 flex-shrink-0">
          {subtask.assignees.slice(0, 1).map((assignee: any) => (
            <Avatar key={assignee.user_id || assignee.id} className="h-4 w-4 border border-background">
              <AvatarImage src={assignee.avatar_url} />
              <AvatarFallback className="text-[7px] bg-muted text-muted-foreground">
                {assignee.name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      )}

      {/* Due Date */}
      {subtask.due_at && (
        <span className="text-metadata text-muted-foreground flex-shrink-0">
          {format(new Date(subtask.due_at), 'MMM d')}
        </span>
      )}

      {/* Actions Menu */}
      <DropdownMenu open={openDropdown} onOpenChange={setOpenDropdown}>
        <DropdownMenuTrigger
          className="opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 p-0.5 rounded hover:bg-muted"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          ) : (
            <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem
            onClick={() => {
              onDelete(subtask.id);
              setOpenDropdown(false);
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-3 w-3" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
