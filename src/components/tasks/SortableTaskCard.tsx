import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, CheckCircle, Copy, Trash2, Loader2, MessageCircle } from "lucide-react";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableTaskCardProps {
  task: any;
  onTaskClick: (taskId: string) => void;
  onComplete: (task: any, e: React.MouseEvent) => void;
  onDuplicate: (task: any, e: React.MouseEvent) => void;
  onDelete: (taskId: string) => void;
  processingAction: { taskId: string; action: 'complete' | 'duplicate' | 'delete' } | null;
  openDropdown: string | null;
  setOpenDropdown: (id: string | null) => void;
  userRole: string | null;
  priorityColors: Record<string, string>;
}

export function SortableTaskCard({
  task,
  onTaskClick,
  onComplete,
  onDuplicate,
  onDelete,
  processingAction,
  openDropdown,
  setOpenDropdown,
  userRole,
  priorityColors,
}: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'Completed') return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className="p-sm group cursor-grab active:cursor-grabbing hover-lift transition-smooth" 
      onClick={() => onTaskClick(task.id)}
      {...attributes} 
      {...listeners}
    >
      <div className="flex items-start justify-between mb-sm">
        <Badge 
          variant="outline"
          className={cn(priorityColors[task.priority as keyof typeof priorityColors])}
        >
          {task.priority}
        </Badge>

        <DropdownMenu open={openDropdown === task.id} onOpenChange={(open) => setOpenDropdown(open ? task.id : null)}>
          <DropdownMenuTrigger 
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem 
              onClick={(e) => onComplete(task, e)} 
              disabled={processingAction !== null}
            >
              {processingAction?.taskId === task.id && processingAction?.action === 'complete' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Mark Completed
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => onDuplicate(task, e)} 
              disabled={processingAction !== null}
            >
              {processingAction?.taskId === task.id && processingAction?.action === 'duplicate' ? (
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
                onDelete(task.id);
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

      <p className="font-medium mt-sm text-body-sm line-clamp-2">
        {task.title}
      </p>
      <div className="flex items-center justify-between mt-sm">
        <div className="flex -space-x-2">
          {task.assignees?.slice(0, 3).map((assignee: any) => (
            <Avatar key={assignee.user_id} className="h-5 w-5 border-2 border-background">
              <AvatarImage src={assignee.avatar_url} />
              <AvatarFallback className="text-[10px]">
                {assignee.name?.[0]}
              </AvatarFallback>
            </Avatar>
          ))}
          {task.assignees?.length > 3 && (
            <div className="h-5 w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center">
              <span className="text-[8px] font-medium">+{task.assignees.length - 3}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {task.comments_count > 0 && (
            <span className="text-metadata text-muted-foreground flex items-center gap-0.5">
              <MessageCircle className="h-3 w-3" />
              {task.comments_count}
            </span>
          )}
          {task.due_at && (
            <span className={cn(
              "text-metadata",
              isOverdue(task.due_at, task.status) && "text-destructive font-medium"
            )}>
              {format(new Date(task.due_at), 'MMM d')}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
