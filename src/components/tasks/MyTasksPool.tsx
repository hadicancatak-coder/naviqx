import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Calendar, ListTodo } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface MyTasksPoolProps {
  tasks: any[];
  onAddToMyTasks: (taskIds: string[]) => void;
  onTaskClick: (taskId: string) => void;
  isAdding?: boolean;
}

export function MyTasksPool({ tasks, onAddToMyTasks, onTaskClick, isAdding }: MyTasksPoolProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (taskId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === tasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tasks.map(t => t.id)));
    }
  };

  const handleAddSelected = () => {
    if (selectedIds.size > 0) {
      onAddToMyTasks(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  if (tasks.length === 0) {
    return (
      <Card className="p-lg">
        <div className="text-center text-muted-foreground">
          <ListTodo className="h-8 w-8 mx-auto mb-sm opacity-50" />
          <p className="text-body-sm">No available tasks</p>
          <p className="text-metadata">All your assigned tasks are already in My Tasks</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-sm border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <Checkbox 
            checked={selectedIds.size === tasks.length && tasks.length > 0}
            onCheckedChange={selectAll}
          />
          <span className="text-body-sm text-muted-foreground">
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : `${tasks.length} available`}
          </span>
        </div>
        <Button
          size="sm"
          onClick={handleAddSelected}
          disabled={selectedIds.size === 0 || isAdding}
          className="h-8 gap-xs"
        >
          <Plus className="h-4 w-4" />
          Add to My Tasks
        </Button>
      </div>

      {/* Task List */}
      <ScrollArea className="h-[400px]">
        <div className="divide-y divide-border">
          {tasks.map(task => (
            <div
              key={task.id}
              className={cn(
                "flex items-start gap-sm p-sm hover:bg-card-hover transition-smooth cursor-pointer",
                selectedIds.has(task.id) && "bg-primary/5"
              )}
            >
              <Checkbox
                checked={selectedIds.has(task.id)}
                onCheckedChange={() => toggleSelection(task.id)}
                onClick={e => e.stopPropagation()}
                className="mt-0.5"
              />
              <div 
                className="flex-1 min-w-0"
                onClick={() => onTaskClick(task.id)}
              >
                <div className="flex items-center gap-sm flex-wrap mb-xs">
                  <span className="text-body-sm font-medium text-foreground truncate">
                    {task.title}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-metadata px-1.5 py-0",
                      task.priority === 'High' && 'border-destructive/50 text-destructive bg-destructive/10',
                      task.priority === 'Medium' && 'border-primary/50 text-primary bg-primary/10',
                      task.priority === 'Low' && 'border-border text-muted-foreground'
                    )}
                  >
                    {task.priority}
                  </Badge>
                  <Badge variant="outline" className="text-metadata px-1.5 py-0">
                    {task.status}
                  </Badge>
                </div>
                {task.due_at && (
                  <div className="flex items-center gap-xs text-metadata text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Due: {format(new Date(task.due_at), 'MMM dd')}</span>
                  </div>
                )}
                {task.description && (
                  <p className="text-metadata text-muted-foreground line-clamp-1 mt-xs">
                    {task.description.replace(/<[^>]*>/g, '').substring(0, 80)}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToMyTasks([task.id]);
                }}
                title="Add to My Tasks"
                className="flex-shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}

// Re-export with old name for backwards compatibility
export { MyTasksPool as AgendaTaskPool };
