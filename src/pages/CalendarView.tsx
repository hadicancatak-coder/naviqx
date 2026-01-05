import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { completeTask, setTaskStatus, completeTasksBulk } from "@/domain";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useQueryClient } from "@tanstack/react-query";
import { UnifiedTaskDialog } from "@/components/UnifiedTaskDialog";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { Checkbox } from "@/components/ui/checkbox";
import { format, addDays, addWeeks, startOfWeek, isSameDay } from "date-fns";
import { isDateWorkingDay } from "@/lib/workingDaysHelper";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, GripVertical, RotateCcw, Plus, AlertTriangle, Check, Table, LayoutGrid, GanttChart, ChevronDown, ChevronRight, ChevronLeft, Users, ExternalLink, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ListSkeleton } from "@/components/skeletons/ListSkeleton";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import { cn } from "@/lib/utils";
import { getRecurrenceLabel, expandRecurringTask } from "@/lib/recurrenceExpander";
import { useToast } from "@/hooks/use-toast";
import { isTaskOverdue } from "@/lib/overdueHelpers";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DayBrief } from "@/components/calendar/DayBrief";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

// Sortable Task Item Component
function SortableTaskItem({ task, onTaskClick, onTaskComplete, onMarkExternalDependency, isManualMode = false }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id,
    disabled: !isManualMode
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue = task.due_at && new Date(task.due_at) < new Date() && task.status !== 'Completed';
  const isCompleted = task.status === 'Completed';
  const isExternalDep = task.is_external_dependency;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-sm py-sm px-md transition-smooth cursor-pointer group border-b border-border last:border-0",
        "hover:bg-card-hover",
        isDragging && "z-overlay bg-card shadow-lg rounded-xl border-2 border-dashed border-primary",
        isOverdue && !isCompleted && !isExternalDep && "border-l-4 border-l-destructive",
        isExternalDep && "border-l-4 border-l-warning bg-warning/5",
        isCompleted && "opacity-60"
      )}
      onClick={() => onTaskClick(task.id, task)}
    >
      {isManualMode && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing opacity-40 hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      
      {/* Single completion checkbox */}
      <Checkbox
        checked={isCompleted}
        onCheckedChange={(checked) => onTaskComplete(task.id, checked as boolean)}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "border-border",
          isCompleted && "bg-success border-success"
        )}
      />
      
      <div className="flex-1 min-w-0 flex items-center gap-sm">
        <span className={cn(
          "text-body-sm font-medium text-foreground truncate",
          isCompleted && "line-through text-muted-foreground"
        )}>
          {task.title}
        </span>
        <Badge variant="outline" className={cn(
          "text-metadata px-1.5 py-0 flex-shrink-0 rounded-full",
          task.priority === 'High' && 'border-destructive/50 text-destructive bg-destructive/10',
          task.priority === 'Medium' && 'border-primary/50 text-primary bg-primary/10',
          task.priority === 'Low' && 'border-border text-muted-foreground bg-muted'
        )}>
          {task.priority}
        </Badge>
        {(task.isRecurringOccurrence || task.task_type === 'recurring' || task.recurrence_rrule) && (
          <Badge variant="outline" className="text-metadata px-1.5 py-0 bg-primary/10 border-primary/30 text-primary flex-shrink-0 rounded-full">
            <RotateCcw className="h-2.5 w-2.5 mr-1" />
            {getRecurrenceLabel(task)}
          </Badge>
        )}
        {isExternalDep && (
          <Badge variant="outline" className="text-metadata px-1.5 py-0 bg-warning/15 border-warning/30 text-warning flex-shrink-0 rounded-full">
            <ExternalLink className="h-2.5 w-2.5 mr-1" />
            External
          </Badge>
        )}
        {task.due_at && (
          <span className={cn(
            "text-metadata flex-shrink-0",
            isOverdue && !isExternalDep ? "text-destructive" : "text-muted-foreground"
          )}>
            {isOverdue && !isExternalDep ? "Overdue: " : ""}{format(new Date(task.due_at), 'MMM d')}
          </span>
        )}
      </div>
      
      {/* Mark as External Dependency button for overdue non-completed tasks */}
      {isOverdue && !isCompleted && !isExternalDep && onMarkExternalDependency && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => {
            e.stopPropagation();
            onMarkExternalDependency(task.id);
          }}
          className="opacity-0 group-hover:opacity-100"
          title="Mark as External Dependency"
        >
          <ExternalLink className="h-3.5 w-3.5 text-warning hover:text-warning" />
        </Button>
      )}
    </div>
  );
}

// Kanban Card Component
function KanbanCard({ task, onTaskClick }: any) {
  const isOverdue = task.due_at && new Date(task.due_at) < new Date() && task.status !== 'Completed';
  const isExternalDep = task.is_external_dependency;

  return (
    <div
      className={cn(
        "p-3 rounded-lg border border-border bg-card hover:bg-card-hover cursor-pointer transition-smooth",
        isOverdue && !isExternalDep && "border-l-4 border-l-destructive",
        isExternalDep && "border-l-4 border-l-warning bg-warning/5"
      )}
      onClick={() => onTaskClick(task.id, task)}
    >
      <p className="text-body-sm font-medium text-foreground line-clamp-2">{task.title}</p>
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="outline" className={cn(
          "text-[10px] px-1.5 py-0",
          task.priority === 'High' && 'border-destructive/50 text-destructive',
          task.priority === 'Medium' && 'border-primary/50 text-primary',
          task.priority === 'Low' && 'border-border text-muted-foreground'
        )}>
          {task.priority}
        </Badge>
        {task.due_at && (
          <span className={cn(
            "text-[10px]",
            isOverdue && !isExternalDep ? "text-destructive" : "text-muted-foreground"
          )}>
            {format(new Date(task.due_at), 'MMM d')}
          </span>
        )}
      </div>
    </div>
  );
}

export default function CalendarView() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tasks, isLoading: tasksLoading } = useTasks();

  // View state
  const [dateView, setDateView] = useState<"today" | "tomorrow" | "week" | "custom">("today");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  
  // Task selection - now opens side panel instead of modal
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'gantt'>('table');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [sortOption, setSortOption] = useState<string>('priority');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  
  const currentDate = useMemo(() => new Date(), []);
  const targetUserId = selectedUserId || user?.id;
  
  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('user_id, name, email, working_days');
      if (data) setAllUsers(data);
    };
    fetchUsers();
  }, []);
  
  // Compute agenda date
  const agendaDate = useMemo(() => {
    if (dateView === 'tomorrow') return addDays(currentDate, 1);
    if (dateView === 'custom' && dateRange?.from) return dateRange.from;
    return currentDate;
  }, [dateView, currentDate, dateRange]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // User task order state
  const [userTaskOrder, setUserTaskOrder] = useState<any[]>([]);
  
  const fetchUserTaskOrder = async () => {
    if (!targetUserId) return;
    const { data } = await supabase
      .from('user_task_order')
      .select('*')
      .eq('user_id', targetUserId);
    if (data) setUserTaskOrder(data);
  };
  
  useEffect(() => {
    fetchUserTaskOrder();
  }, [targetUserId]);

  // Helper function to check if a user is assigned to a task
  const isTaskAssignedToUser = useCallback((task: any, userId: string | undefined) => {
    if (!userId || !task.assignees || task.assignees.length === 0) return false;
    return task.assignees.some((a: any) => {
      const assigneeUserId = a.user_id || a.profiles?.user_id;
      return assigneeUserId === userId;
    });
  }, []);

  // Computed: Filter tasks for current view - tasks due on agenda date
  const { activeTasks, completedTasks, allDayTasks } = useMemo(() => {
    if (!tasks || !targetUserId) return { activeTasks: [], completedTasks: [], allDayTasks: [] };

    // Filter tasks due on the agenda date or overdue
    // If admin has selected a specific user, filter by that user's assignments
    const relevantTasks = tasks.filter(t => {
      const isAssigned = selectedUserId 
        ? isTaskAssignedToUser(t, selectedUserId) 
        : (userRole === 'admin' || isTaskAssignedToUser(t, targetUserId));
      if (!isAssigned) return false;
      
      // Include tasks due on agenda date
      if (t.due_at && isSameDay(new Date(t.due_at), agendaDate)) return true;
      
      // Include overdue tasks (not completed, not backlog)
      if (isTaskOverdue(t) && t.status !== 'Completed' && t.status !== 'Failed' && t.status !== 'Backlog') return true;
      
      // Include recurring tasks that occur on this date
      if (t.recurrence_rrule) {
        const dateStart = new Date(agendaDate);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(agendaDate);
        dateEnd.setHours(23, 59, 59, 999);
        const occurrences = expandRecurringTask(t, dateStart, dateEnd, [], []);
        if (occurrences.length > 0) return true;
      }
      
      return false;
    });
    
    // Sort by priority then by order
    const sorted = relevantTasks.sort((a, b) => {
      const orderA = userTaskOrder.find((o: any) => o.task_id === a.id)?.order_index ?? 999;
      const orderB = userTaskOrder.find((o: any) => o.task_id === b.id)?.order_index ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      
      const priorityOrder = { High: 0, Medium: 1, Low: 2 };
      return (priorityOrder[a.priority as keyof typeof priorityOrder] || 1) - 
             (priorityOrder[b.priority as keyof typeof priorityOrder] || 1);
    });
    
    const active = sorted.filter(t => t.status !== 'Completed' && t.status !== 'Failed');
    const completed = sorted.filter(t => t.status === 'Completed');

    return { activeTasks: active, completedTasks: completed, allDayTasks: relevantTasks };
  }, [tasks, targetUserId, selectedUserId, agendaDate, userTaskOrder, userRole, isTaskAssignedToUser]);

  // Get selected user's working days
  const selectedUserWorkingDays = useMemo(() => {
    if (!targetUserId) return null;
    const userProfile = allUsers.find(u => u.user_id === targetUserId);
    return userProfile?.working_days || null;
  }, [targetUserId, allUsers]);

  // Kanban columns for weekly view
  const weeklyKanbanColumns = useMemo(() => {
    const baseDate = addWeeks(currentDate, weekOffset);
    const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return days.map((day, i) => {
      const date = addDays(weekStart, i);
      const isWorkingDay = isDateWorkingDay(date, selectedUserWorkingDays);
      
      const dayTasks: any[] = [];
      const addedTaskIds = new Set<string>();
      
      tasks?.forEach(t => {
        if (t.status === 'Completed' || t.status === 'Failed') return;
        // If admin selected a specific user, filter by that user; otherwise use targetUserId
        const isAssigned = selectedUserId 
          ? isTaskAssignedToUser(t, selectedUserId)
          : isTaskAssignedToUser(t, targetUserId);
        if (!isAssigned) return;
        
        if (t.recurrence_rrule) {
          const dateStart = new Date(date);
          dateStart.setHours(0, 0, 0, 0);
          const dateEnd = new Date(date);
          dateEnd.setHours(23, 59, 59, 999);
          
          const occurrences = expandRecurringTask(t, dateStart, dateEnd, [], []);
          if (occurrences.length > 0 && !addedTaskIds.has(t.id)) {
            dayTasks.push({ ...t, isRecurringOccurrence: true, occurrenceDate: date });
            addedTaskIds.add(t.id);
          }
        } else if (t.due_at && isSameDay(new Date(t.due_at), date) && !addedTaskIds.has(t.id)) {
          dayTasks.push(t);
          addedTaskIds.add(t.id);
        }
      });
      
      return { day, date, tasks: dayTasks, isWorkingDay };
    });
  }, [tasks, currentDate, weekOffset, selectedUserWorkingDays, targetUserId, selectedUserId, isTaskAssignedToUser]);

  // Kanban columns for daily view (by priority)
  const dailyKanbanColumns = useMemo(() => {
    return [
      { priority: 'High', tasks: activeTasks.filter(t => t.priority === 'High') },
      { priority: 'Medium', tasks: activeTasks.filter(t => t.priority === 'Medium') },
      { priority: 'Low', tasks: activeTasks.filter(t => t.priority === 'Low' || !t.priority) }
    ];
  }, [activeTasks]);

  const isManualMode = userTaskOrder.length > 0;

  // Handle task completion toggle
  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    if (taskId.includes('::')) {
      toast({ title: "Recurring task", description: "Individual occurrences cannot be marked complete" });
      return;
    }

    const result = completed 
      ? await completeTask(taskId)
      : await setTaskStatus(taskId, 'Backlog');

    if (!result.success) {
      toast({ title: "Error", description: result.error || "Failed to update task", variant: "destructive" });
    } else {
      toast({ title: completed ? "Task completed" : "Task reopened" });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  };

  // Mark task as external dependency
  const handleMarkExternalDependency = async (taskId: string) => {
    const reason = prompt("Enter reason for external dependency (what/who are you waiting for?):");
    if (!reason) return;
    
    const { error } = await supabase
      .from('tasks')
      .update({ 
        is_external_dependency: true, 
        external_dependency_reason: reason 
      })
      .eq('id', taskId);

    if (error) {
      toast({ title: "Error", description: "Failed to mark as external dependency", variant: "destructive" });
    } else {
      toast({ title: "Marked as external dependency" });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !targetUserId) return;

    const oldIndex = activeTasks.findIndex(t => t.id === active.id);
    const newIndex = activeTasks.findIndex(t => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedTasks = [...activeTasks];
    const [movedTask] = reorderedTasks.splice(oldIndex, 1);
    reorderedTasks.splice(newIndex, 0, movedTask);

    let dateScope: string = dateView;
    if (dateView === 'custom' && dateRange?.from) {
      dateScope = `custom-${format(dateRange.from, 'yyyy-MM-dd')}`;
    }

    const orderPromises = reorderedTasks.map((task, index) => 
      supabase
        .from('user_task_order')
        .upsert({
          user_id: targetUserId,
          task_id: task.id,
          date_scope: dateScope,
          order_index: index,
        }, { onConflict: 'user_id,task_id,date_scope' })
    );

    try {
      await Promise.all(orderPromises);
      await fetchUserTaskOrder();
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
      console.error('Error saving task order:', error);
    }
  };

  // Bulk actions
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
    if (selectedIds.size === activeTasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(activeTasks.map(t => t.id)));
    }
  };

  const handleBulkComplete = async () => {
    const taskIds = Array.from(selectedIds).filter(id => !id.includes('::'));
    const result = await completeTasksBulk(taskIds);
    
    if (!result.success) {
      toast({ 
        title: "Some tasks failed", 
        description: `${result.successCount} completed, ${result.failedCount} failed`,
        variant: "destructive" 
      });
    } else {
      toast({ title: `${result.successCount} task(s) completed` });
    }
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  // Get date label
  const getDateLabel = () => {
    switch (dateView) {
      case "today": return format(currentDate, 'EEEE, MMMM d');
      case "tomorrow": return format(addDays(currentDate, 1), 'EEEE, MMMM d');
      case "week": return `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')}`;
      case "custom": return dateRange?.from ? format(dateRange.from, 'MMMM d, yyyy') : 'Select date';
      default: return format(currentDate, 'EEEE, MMMM d');
    }
  };

  // Open task in side panel (not modal)
  const handleTaskClick = (taskId: string, task?: any) => {
    const originalId = taskId.includes('::') ? taskId.split('::')[0] : taskId;
    const foundTask = task || tasks?.find(t => t.id === originalId);
    setSelectedTask(foundTask || null);
    setSelectedTaskId(originalId);
  };

  // Close side panel
  const handleClosePanel = () => {
    setSelectedTaskId(null);
    setSelectedTask(null);
  };

  // Handle task deletion - close panel and refresh
  const handleTaskDeleted = () => {
    handleClosePanel();
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  // Render main content
  const renderMainContent = () => (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8 pt-8 pb-8">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-[24px] font-semibold text-foreground tracking-tight">My Agenda</h1>
              <p className="text-[14px] text-muted-foreground mt-1">{getDateLabel()}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Admin User Filter */}
              {userRole === 'admin' && (
                <Select value={selectedUserId || user?.id || ''} onValueChange={(v) => setSelectedUserId(v === user?.id ? null : v)}>
                  <SelectTrigger className="w-[200px] h-10 rounded-xl bg-card border-border text-[14px]">
                    <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="View user agenda" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl bg-popover border-border shadow-lg">
                    {allUsers.map(u => (
                      <SelectItem key={u.user_id} value={u.user_id} className="rounded-lg">
                        {u.name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button onClick={() => setCreateTaskOpen(true)} className="rounded-full px-6 h-10 gap-2 shadow-sm text-[14px] font-medium">
                <Plus className="h-4 w-4" />
                New Task
              </Button>
            </div>
          </div>

          {/* Date Tabs + View Options */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Tabs value={dateView} onValueChange={(v) => {
                setDateView(v as typeof dateView);
                if (v !== "custom") setDateRange(null);
              }}>
                <TabsList className="h-10 rounded-xl bg-muted p-1">
                  <TabsTrigger value="today" className="h-8 px-4 rounded-lg text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm">Today</TabsTrigger>
                  <TabsTrigger value="tomorrow" className="h-8 px-4 rounded-lg text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm">Tomorrow</TabsTrigger>
                  <TabsTrigger value="week" className="h-8 px-4 rounded-lg text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm">Week</TabsTrigger>
                  <TabsTrigger value="custom" className="h-8 px-4 rounded-lg text-[13px] data-[state=active]:bg-card data-[state=active]:shadow-sm">Custom</TabsTrigger>
                </TabsList>
              </Tabs>

              {dateView === "custom" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-10 px-4 rounded-xl text-[13px] border-border">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Pick date
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl shadow-lg border-border" align="start">
                    <DateRangePicker
                      value={dateRange}
                      onChange={(range) => {
                        setDateRange(range);
                        if (range) setDateView("custom");
                      }}
                      presets="full"
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('table')}
                title="Table view"
                className={cn("h-8 w-8 rounded-lg", viewMode !== 'table' && "text-muted-foreground")}
              >
                <Table className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('kanban')}
                title="Kanban view"
                className={cn("h-8 w-8 rounded-lg", viewMode !== 'kanban' && "text-muted-foreground")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'gantt' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('gantt')}
                title="Gantt view"
                className={cn("h-8 w-8 rounded-lg", viewMode !== 'gantt' && "text-muted-foreground")}
              >
                <GanttChart className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Day Brief - Only show for non-week views */}
        {dateView !== 'week' && !tasksLoading && (
          <DayBrief tasks={allDayTasks} allUsers={allUsers} targetDate={agendaDate} />
        )}

        {/* Main Content */}
        {viewMode === 'kanban' ? (
          // Kanban View
          <div className="space-y-4">
          {dateView === 'week' ? (
              // Weekly Kanban
              <div className="space-y-4">
                {/* Week Navigation Header */}
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => w - 1)} className="h-8 w-8">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-center">
                    <span className="text-body-sm font-medium">
                      {format(startOfWeek(addWeeks(currentDate, weekOffset), { weekStartsOn: 1 }), 'MMM d')} - {format(addDays(startOfWeek(addWeeks(currentDate, weekOffset), { weekStartsOn: 1 }), 6), 'MMM d, yyyy')}
                    </span>
                    {weekOffset !== 0 && (
                      <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)} className="ml-2 text-xs text-primary">
                        Today
                      </Button>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => w + 1)} className="h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Week Grid */}
                <div className="grid grid-cols-7 gap-3">
                  {weeklyKanbanColumns.map(col => (
                    <Card key={col.day} className={cn("min-h-[500px]", !col.isWorkingDay && "opacity-50 bg-muted/30")}>
                      <div className={cn(
                        "p-3 border-b border-border",
                        isSameDay(col.date, currentDate) && "bg-primary/10",
                        !col.isWorkingDay && "bg-muted/50"
                      )}>
                        <h3 className="font-semibold text-body-sm">{col.day}</h3>
                        <p className="text-metadata text-muted-foreground">{format(col.date, 'MMM d')}</p>
                        {!col.isWorkingDay && <Badge variant="outline" className="text-[10px] mt-1 text-warning">Off</Badge>}
                      </div>
                      <ScrollArea className="h-[420px] p-3">
                        <div className="space-y-2">
                          {col.tasks.length === 0 ? (
                            <p className="text-metadata text-muted-foreground text-center py-4">
                              {!col.isWorkingDay ? "Not working" : "No tasks"}
                            </p>
                          ) : (
                            col.tasks.map(task => <KanbanCard key={task.id} task={task} onTaskClick={handleTaskClick} />)
                          )}
                        </div>
                      </ScrollArea>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              // Daily Kanban
              <div className="grid grid-cols-3 gap-4">
                {dailyKanbanColumns.map(col => (
                  <Card key={col.priority} className="min-h-[400px]">
                    <div className={cn(
                      "p-3 border-b border-border",
                      col.priority === 'High' && "bg-destructive/10",
                      col.priority === 'Medium' && "bg-primary/10",
                      col.priority === 'Low' && "bg-muted/50"
                    )}>
                      <h3 className="font-semibold text-body-sm">{col.priority} Priority</h3>
                      <p className="text-metadata text-muted-foreground">{col.tasks.length} tasks</p>
                    </div>
                    <ScrollArea className="h-[350px] p-3">
                      <div className="space-y-2">
                        {col.tasks.length === 0 ? (
                          <p className="text-metadata text-muted-foreground text-center py-4">No tasks</p>
                        ) : (
                          col.tasks.map(task => <KanbanCard key={task.id} task={task} onTaskClick={handleTaskClick} />)
                        )}
                      </div>
                    </ScrollArea>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : viewMode === 'gantt' ? (
          // Gantt View Placeholder
          <Card className="p-8 text-center">
            <GanttChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-heading-sm font-semibold mb-2">Gantt View</h3>
            <p className="text-muted-foreground">Gantt chart visualization coming soon</p>
          </Card>
        ) : (
          // Table View (Default)
          <Card className="bg-card border-border rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <Checkbox 
                  checked={selectedIds.size === activeTasks.length && activeTasks.length > 0}
                  onCheckedChange={selectAll}
                  className="border-border"
                />
                <span className="text-[14px] text-muted-foreground">
                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : `${activeTasks.length} tasks`}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <Button variant="outline" size="sm" onClick={handleBulkComplete} className="rounded-lg h-8 text-[13px]">
                    <Check className="h-4 w-4 mr-1.5" />
                    Complete
                  </Button>
                )}
                
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="h-8 px-3 text-[13px] bg-muted border-0 rounded-lg text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="priority">Priority</option>
                  <option value="due_time">Due Date</option>
                  <option value="status">Status</option>
                  <option value="alphabetical">A-Z</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
            </div>

            {/* Task List */}
            {tasksLoading ? (
              <div className="p-4">
                <ListSkeleton items={5} />
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={activeTasks.map(t => t.id)} strategy={verticalListSortingStrategy} disabled={sortOption !== "manual"}>
                  <div>
                    {activeTasks.length === 0 ? (
                      <div className="p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                          <CalendarIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-[16px] font-medium text-foreground mb-1">No tasks due</p>
                        <p className="text-[14px] text-muted-foreground">
                          Create a new task to get started
                        </p>
                      </div>
                    ) : (
                      activeTasks.map((task) => (
                        <SortableTaskItem
                          key={task.id}
                          task={task}
                          onTaskClick={handleTaskClick}
                          onTaskComplete={handleTaskComplete}
                          onMarkExternalDependency={handleMarkExternalDependency}
                          isManualMode={sortOption === "manual"}
                          isSelected={selectedIds.has(task.id)}
                          onSelect={toggleSelection}
                        />
                      ))
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Completed Section */}
            {completedTasks.length > 0 && (
              <Collapsible open={completedExpanded} onOpenChange={setCompletedExpanded}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-smooth">
                    {completedExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-[14px] font-medium text-muted-foreground">
                      Completed ({completedTasks.length})
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="bg-muted/10">
                    {completedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 py-3 px-4 border-b border-border last:border-0 cursor-pointer hover:bg-muted/20 transition-smooth"
                        onClick={() => handleTaskClick(task.id, task)}
                      >
                        <Checkbox checked disabled className="opacity-50 border-border" />
                        <span className="text-[14px] text-muted-foreground line-through">{task.title}</span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </Card>
        )}
      </div>

      {/* Create Task Dialog - Keep modal for creation */}
      <UnifiedTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        mode="create"
      />
    </div>
  );

  return (
    <>
      {selectedTaskId ? (
        // Resizable layout with side panel
        <ResizablePanelGroup direction="horizontal" className="min-h-screen">
          <ResizablePanel defaultSize={65} minSize={40}>
            {renderMainContent()}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
            <TaskDetail
              taskId={selectedTaskId}
              task={selectedTask}
              onClose={handleClosePanel}
              onTaskDeleted={handleTaskDeleted}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        // No panel open - full width content
        renderMainContent()
      )}
    </>
  );
}
