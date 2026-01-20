import { useState, useRef, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface InlineTaskCreatorProps {
  onTaskCreated?: () => void;
  className?: string;
}

export function InlineTaskCreator({ onTaskCreated, className }: InlineTaskCreatorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSubmit = async () => {
    if (!title.trim() || !user) return;
    
    const taskTitle = title.trim();
    
    // Clear input immediately for snappy UX
    setTitle("");
    setIsEditing(false);
    
    try {
      const { error } = await supabase.from("tasks").insert({
        title: taskTitle,
        status: "Pending" as const,
        priority: "Medium" as const,
        created_by: user.id,
      } as any);
      
      if (error) throw error;
      
      // Simple: just invalidate to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: "Task created", duration: 2000 });
      onTaskCreated?.();
    } catch (error: any) {
      toast({ 
        title: "Failed to create task", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setTitle("");
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className={cn(
          "flex items-center gap-2 w-full h-row-compact px-sm text-body-sm text-muted-foreground",
          "hover:text-foreground hover:bg-card-hover transition-smooth rounded-md cursor-pointer",
          className
        )}
      >
        <Plus className="h-4 w-4" />
        <span>Add task</span>
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 h-row-compact px-sm", className)}>
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!title.trim()) {
            setIsEditing(false);
          }
        }}
        placeholder="Task name..."
        disabled={isSubmitting}
        className="h-7 text-body-sm border-border flex-1"
      />
      {isSubmitting && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  );
}
