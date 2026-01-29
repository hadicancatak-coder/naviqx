import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Calendar, MoreVertical, CheckCircle, Copy, Trash2, Loader2, ChevronDown, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { getDaysOverdue } from "@/lib/overdueHelpers";
import { useTaskMutations } from "@/hooks/useTaskMutations";

interface TaskCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  task: any;
  onClick: () => void;
}

export const TaskCard = ({ task, onClick }: TaskCardProps) => {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { completeTask, updateStatus, updatePriority } = useTaskMutations();
  const [openDropdown, setOpenDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [processingAction, setProcessingAction] = useState<'complete' | 'duplicate' | 'delete' | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  
  // PHASE 1 FIX: Truncate description for readability
  const truncateText = (text: string | null, maxLength: number) => {
    if (!text) return '';
    // Strip HTML tags for length calculation
    const stripped = text.replace(/<[^>]*>/g, '');
    if (stripped.length <= maxLength) return text;
    // Find a good breaking point
    const truncated = stripped.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    const breakPoint = lastSpace > maxLength * 0.8 ? lastSpace : maxLength;
    // Return original HTML up to break point (approximate)
    return text.substring(0, breakPoint) + '...';
  };
  
  const sanitizeAndTruncateHtml = (html: string | null) => {
    if (!html) return '';
    const truncated = truncateText(html, 150);
    return DOMPurify.sanitize(truncated, { 
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'span'],
      ALLOWED_ATTR: ['href', 'target']
    });
  };
  
  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'Completed' || status === 'Backlog') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dueDate) < today;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'hsl(var(--destructive))';
      case 'Medium': return 'hsl(45 93% 47%)';
      case 'Low': return 'hsl(142 71% 45%)';
      default: return 'hsl(var(--muted))';
    }
  };

  const statusColors = {
    Backlog: "bg-pending/15 text-pending border-pending/30",
    Ongoing: "bg-primary/15 text-primary border-primary/30",
    Completed: "bg-success/15 text-success border-success/30",
    Failed: "bg-muted/15 text-muted-foreground border-muted/30",
    Blocked: "bg-destructive/15 text-destructive border-destructive/30",
  };

  const priorityColors = {
    High: "bg-destructive/15 text-destructive border-destructive/30",
    Medium: "bg-warning/15 text-warning border-warning/30",
    Low: "bg-success/15 text-success border-success/30",
  };

  const handleComplete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    completeTask.mutate(task.id, {
      onSuccess: () => {
        setOpenDropdown(false);
      }
    });
  };

  const handleStatusChange = (newStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateStatus.mutate({ id: task.id, status: newStatus }, {
      onSuccess: () => {
        setStatusOpen(false);
      }
    });
  };

  const handlePriorityChange = (newPriority: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updatePriority.mutate({ id: task.id, priority: newPriority }, {
      onSuccess: () => {
        setPriorityOpen(false);
      }
    });
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.preventDefault();
    setProcessingAction('duplicate');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data: duplicatedTask, error } = await supabase
        .from('tasks')
        .insert({
          ...task,
          id: undefined,
          title: `${task.title} (Copy)`,
          created_by: user.id,
          created_at: undefined,
          updated_at: undefined,
        })
        .select()
        .single();

      if (error) throw error;

      if (task.assignees?.length > 0 && duplicatedTask) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const assigneeInserts = task.assignees.map((assignee: any) => ({
          task_id: duplicatedTask.id,
          user_id: assignee.user_id,
          assigned_by: user.id,
        }));

        await supabase.from('task_assignees').insert(assigneeInserts);
      }

      toast({
        title: "Success",
        description: "Task duplicated successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(null);
      setOpenDropdown(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setProcessingAction('delete');
    try {
      if (userRole === 'admin') {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', task.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Task deleted successfully",
        });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No user found");

        const { error } = await supabase
          .from('tasks')
          .update({
            delete_requested_by: user.id,
            delete_requested_at: new Date().toISOString(),
          })
          .eq('id', task.id);

        if (error) throw error;

        toast({
          title: "Delete Request Sent",
          description: "Admin will review your request",
        });
      }

      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowDeleteConfirm(false);
      setOpenDropdown(false);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(null);
    }
  };

  return (
    <Card 
      className={cn(
        "p-card hover:shadow-lg hover:-translate-y-0.5 transition-smooth border-l-4 relative group",
        isOverdue(task.due_at, task.status) && "bg-destructive/5"
      )}
      style={{ borderLeftColor: getPriorityColor(task.priority) }}
    >
      {/* Priority and Status badges */}
      <div className="flex items-start justify-between mb-sm">
        <div className="flex items-center gap-sm flex-wrap">
          {/* Priority Dropdown */}
          <DropdownMenu open={priorityOpen} onOpenChange={setPriorityOpen}>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Badge variant="outline" className={cn(
                "text-body-sm px-sm py-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity",
                priorityColors[task.priority as keyof typeof priorityColors]
              )}>
                {task.priority}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={(e) => handlePriorityChange('High', e)}>High</DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handlePriorityChange('Medium', e)}>Medium</DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handlePriorityChange('Low', e)}>Low</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status Dropdown */}
          <DropdownMenu open={statusOpen} onOpenChange={setStatusOpen}>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Badge variant="outline" className={cn(
                "text-body-sm px-sm py-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity",
                statusColors[task.status as keyof typeof statusColors]
              )}>
                {task.status}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={(e) => handleStatusChange('Backlog', e)}>Backlog</DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleStatusChange('Ongoing', e)}>Ongoing</DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleStatusChange('Blocked', e)}>Blocked</DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleStatusChange('Completed', e)}>Completed</DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleStatusChange('Failed', e)}>Failed</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {task.visibility && (
            <Badge variant={task.visibility === 'global' ? 'default' : 'secondary'} className="text-metadata">
              {task.visibility === 'global' ? 'Global' : 'Private'}
            </Badge>
          )}

          {isOverdue(task.due_at, task.status) && (
            <Badge variant="destructive" className="text-metadata">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {getDaysOverdue(task.due_at)} day{getDaysOverdue(task.due_at) !== 1 ? 's' : ''} overdue
            </Badge>
          )}
        </div>

        <DropdownMenu open={openDropdown} onOpenChange={setOpenDropdown}>
          <DropdownMenuTrigger 
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleComplete} disabled={processingAction !== null}>
              {processingAction === 'complete' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Mark Completed
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDuplicate} disabled={processingAction !== null}>
              {processingAction === 'duplicate' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }} 
              disabled={processingAction !== null} 
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {userRole === 'admin' ? 'Delete' : 'Request Delete'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Task title */}
      <h3 className="font-semibold text-heading-sm mb-sm line-clamp-2 cursor-pointer" onClick={onClick}>
        {task.title}
      </h3>
      
      {/* Task description - PHASE 1 FIX: Truncated to 150 chars with HTML rendering */}
      {task.description && (
        <div 
          className="text-body-sm text-muted-foreground mb-md line-clamp-3 cursor-pointer prose prose-invert prose-sm max-w-none"
          onClick={onClick}
          dangerouslySetInnerHTML={{ __html: sanitizeAndTruncateHtml(task.description) }}
        />
      )}
      
      {/* Footer with metadata */}
      <div className="flex items-center justify-between mt-md pt-md border-t cursor-pointer" onClick={onClick}>
        <div className="flex items-center -space-x-2">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {task.assignees?.slice(0, 3).map((assignee: any) => (
            <Avatar key={assignee.user_id} className="h-6 w-6 border-2 border-background">
              <AvatarImage src={assignee.avatar_url} />
              <AvatarFallback className="text-metadata">{assignee.name?.[0]}</AvatarFallback>
            </Avatar>
          ))}
          {task.assignees?.length > 3 && (
            <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
              <span className="text-metadata font-medium">+{task.assignees.length - 3}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-sm text-metadata text-muted-foreground">
          {task.comments_count > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {task.comments_count}
            </div>
          )}
          {task.due_at && (
            <div className={cn(
              "flex items-center gap-1",
              isOverdue(task.due_at, task.status) && "text-destructive font-medium"
            )}>
              <Calendar className="h-3 w-3" />
              {format(new Date(task.due_at), 'MMM d')}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="z-overlay" onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {userRole === 'admin' 
                ? 'This will permanently delete this task. This action cannot be undone.'
                : 'This will send a delete request to an admin for review.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={processingAction === 'delete'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={processingAction === 'delete'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processingAction === 'delete' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {userRole === 'admin' ? 'Deleting...' : 'Requesting...'}
                </>
              ) : (
                userRole === 'admin' ? 'Delete Task' : 'Request Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
