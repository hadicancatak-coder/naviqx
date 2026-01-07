import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Search, Download, Trash, CheckCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilteredTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterType: 'all' | 'overdue' | 'ongoing' | 'completed';
  tasks: any[];
  onRefresh: () => void;
}

export const FilteredTasksDialog = ({ 
  open, 
  onOpenChange, 
  filterType, 
  tasks,
  onRefresh 
}: FilteredTasksDialogProps) => {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("due_date");
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const getFilterTitle = () => {
    switch(filterType) {
      case 'overdue': return '🔥 Overdue Tasks';
      case 'ongoing': return '⚡ In Progress Tasks';
      case 'completed': return '✅ Completed Tasks';
      default: return '📋 All Tasks';
    }
  };

  const filteredAndSorted = useMemo(() => {
    let filtered = [...tasks];

    // Search filter
    if (search) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch(sortBy) {
        case 'priority':
          const priorityOrder = { High: 0, Medium: 1, Low: 2 };
          return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default: // due_date
          if (!a.due_at) return 1;
          if (!b.due_at) return -1;
          return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      }
    });

    return filtered;
  }, [tasks, search, sortBy]);

  const handleBulkComplete = async () => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'Completed' })
      .in('id', selectedTasks);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `${selectedTasks.length} tasks marked as completed` });
      setSelectedTasks([]);
      onRefresh();
    }
  };

  const handleBulkDelete = async () => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .in('id', selectedTasks);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `${selectedTasks.length} tasks deleted` });
      setSelectedTasks([]);
      onRefresh();
    }
  };

  const exportToCSV = () => {
    const headers = ['Title', 'Status', 'Priority', 'Due Date', 'Created'];
    const rows = filteredAndSorted.map(task => [
      task.title,
      task.status,
      task.priority,
      task.due_at ? format(new Date(task.due_at), 'yyyy-MM-dd') : 'N/A',
      format(new Date(task.created_at), 'yyyy-MM-dd')
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-${filterType}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const priorityColors = {
    High: "bg-destructive text-destructive-foreground",
    Medium: "bg-warning text-warning-foreground",
    Low: "bg-info text-info-foreground"
  };

  const statusColors = {
    Pending: "bg-pending text-pending-foreground",
    Ongoing: "bg-info text-info-foreground",
    Completed: "bg-success text-success-foreground",
    Failed: "bg-destructive text-destructive-foreground",
    Blocked: "bg-warning text-warning-foreground"
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTasks.length === filteredAndSorted.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredAndSorted.map(t => t.id));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-heading-lg flex items-center justify-between">
            <span>{getFilterTitle()} ({filteredAndSorted.length})</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-md">
          {/* Filters & Actions Bar */}
          <div className="flex flex-wrap items-center gap-sm">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due_date">Due Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="created_at">Created Date</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>

            {selectedTasks.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={handleBulkComplete}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete ({selectedTasks.length})
                </Button>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash className="h-4 w-4 mr-2" />
                  Delete ({selectedTasks.length})
                </Button>
              </>
            )}
          </div>

          {/* Select All */}
          <div className="flex items-center gap-sm border-b pb-sm">
            <Checkbox 
              checked={selectedTasks.length === filteredAndSorted.length && filteredAndSorted.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-body-sm text-muted-foreground">Select All</span>
          </div>

          {/* Tasks List */}
          <div className="space-y-sm max-h-[50vh] overflow-y-auto">
            {filteredAndSorted.map(task => (
              <div
                key={task.id}
                className="flex items-center gap-sm p-md border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedTasks.includes(task.id)}
                  onCheckedChange={() => toggleTaskSelection(task.id)}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-sm mb-xs">
                    <h4 
                      className="font-medium line-clamp-1 cursor-pointer hover:text-primary hover:underline transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/tasks?taskId=${task.id}`;
                      }}
                    >
                      {task.title}
                    </h4>
                    <div className="flex gap-1 flex-shrink-0">
                      <Badge className={priorityColors[task.priority as keyof typeof priorityColors]} variant="secondary">
                        {task.priority}
                      </Badge>
                      <Badge className={statusColors[task.status as keyof typeof statusColors]} variant="secondary">
                        {task.status}
                      </Badge>
                    </div>
                  </div>
                  
                  {task.description && (
                    <p className="text-body-sm text-muted-foreground line-clamp-1 mb-sm">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center gap-md text-metadata text-muted-foreground">
                    {task.due_at && (
                      <span>📅 {format(new Date(task.due_at), 'MMM d, yyyy')}</span>
                    )}
                    {task.assignees && task.assignees.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <div className="flex -space-x-2">
                          {task.assignees.slice(0, 3).map((assignee: any) => (
                            <Avatar key={assignee.user_id} className="h-5 w-5 border-2 border-background">
                              <AvatarImage src={assignee.avatar_url} />
                              <AvatarFallback className="text-[10px]">
                                {assignee.name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {task.assignees.length > 3 && (
                            <div className="h-5 w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[8px]">
                              +{task.assignees.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredAndSorted.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No tasks found</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
