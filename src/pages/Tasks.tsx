import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Plus, ListTodo, AlertCircle, Clock, Shield, TrendingUp, X, CheckCircle2, RefreshCw, User, Layers } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { AssigneeFilterBar } from "@/components/AssigneeFilterBar";
import { TaskDateFilterBar } from "@/components/TaskDateFilterBar";
import { StatusMultiSelect } from "@/components/tasks/StatusMultiSelect";
import { FilteredTasksDialog } from "@/components/tasks/FilteredTasksDialog";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";
import { ViewSwitcher, type ViewMode, type BoardGroupBy } from "@/components/tasks/ViewSwitcher";
import { TaskListView } from "@/components/tasks/TaskListView";
import { TaskBoardView } from "@/components/tasks/TaskBoardView";
import { PageContainer, PageHeader, EmptyState, FilterBar } from "@/components/layout";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/useTasks";
import { TASK_TAGS } from "@/lib/constants";
import { TaskBulkActionsBar } from "@/components/tasks/TaskBulkActionsBar";
import { exportTasksToCSV } from "@/lib/taskExport";
import { isTaskOverdue } from "@/lib/overdueHelpers";
import { isUserAssignedToTask, taskMatchesAssigneeFilter } from "@/lib/taskFiltering";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { 
  completeTasksBulk, 
  setTasksStatusBulk, 
  deleteTasksBulk, 
  setPriorityBulk,
  addTaskComment 
} from "@/domain";

export default function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<any>(null);
  const [statusFilters, setStatusFilters] = useState<string[]>(['Backlog', 'Ongoing', 'Blocked', 'Failed']);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('tasksViewMode');
    return (saved === 'list' || saved === 'board') ? saved : 'board';
  });
  const [boardGroupBy, setBoardGroupBy] = useState<BoardGroupBy>(() => {
    const saved = localStorage.getItem('tasksBoardGroupBy');
    return (saved === 'status' || saved === 'date' || saved === 'assignee') ? saved : 'status';
  });
  
  // Side panel state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [filteredDialogOpen, setFilteredDialogOpen] = useState(false);
  const [filteredDialogType, setFilteredDialogType] = useState<'all' | 'overdue' | 'ongoing' | 'completed'>('all');
  const [hideRecurring, setHideRecurring] = useState(true);
  const [showMyTasks, setShowMyTasks] = useState(false);
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  // Persist view preferences
  useEffect(() => {
    localStorage.setItem('tasksViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('tasksBoardGroupBy', boardGroupBy);
  }, [boardGroupBy]);

  // Handle URL filter parameters
  useEffect(() => {
    const filter = searchParams.get('filter');
    if (!filter) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    setShowMyTasks(true);

    switch (filter) {
      case 'today':
        setDateFilter({ startDate: today, endDate: tomorrow, label: 'Today' });
        setStatusFilters(['Backlog', 'Ongoing', 'Blocked', 'Failed']);
        break;
      case 'overdue':
        setActiveQuickFilter('Overdue');
        break;
      case 'week':
        setDateFilter({ startDate: today, endDate: weekEnd, label: 'This Week' });
        setStatusFilters(['Backlog', 'Ongoing', 'Blocked', 'Failed']);
        break;
      case 'in-progress':
        setStatusFilters(['Ongoing']);
        break;
    }

    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const saved = localStorage.getItem('tasksItemsPerPage');
    if (saved) setItemsPerPage(Number(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('tasksItemsPerPage', String(itemsPerPage));
  }, [itemsPerPage]);

  const handleTaskClick = useCallback((taskId: string, task?: any) => {
    setSelectedTaskId(taskId);
    setSelectedTask(task || null);
  }, []);

  const handleCloseSidePanel = useCallback(() => {
    setSelectedTaskId(null);
    setSelectedTask(null);
  }, []);

  const { data, isLoading, refetch } = useTasks();

  const quickFilters = [
    { label: "Overdue", Icon: AlertCircle, filter: (task: any) => isTaskOverdue(task), clearOtherFilters: true },
    { label: "Due Soon", Icon: Clock, filter: (task: any) => { if (!task.due_at) return false; const dueDate = new Date(task.due_at); const threeDaysFromNow = addDays(new Date(), 3); return dueDate <= threeDaysFromNow && dueDate >= new Date() && task.status !== 'Completed'; }},
    { label: "Blocked", Icon: Shield, filter: (task: any) => task.status === 'Blocked' },
    { label: "High Priority", Icon: TrendingUp, filter: (task: any) => task.priority === 'High' && task.status !== 'Completed' }
  ];

  const filteredTasks = useMemo(() => {
    return (data || []).filter((task: any) => {
      if (showMyTasks && user) {
        if (!isUserAssignedToTask(task, user.id)) return false;
      }
      
      const assigneeMatch = taskMatchesAssigneeFilter(task, selectedAssignees);
      let dateMatch = true;
      if (dateFilter) {
        if (!task.due_at) { dateMatch = dateFilter.label === "Backlog"; } 
        else { const dueDate = new Date(task.due_at); dateMatch = dueDate >= dateFilter.startDate && dueDate <= dateFilter.endDate; }
      }
      const statusMatch = statusFilters.length === 0 || statusFilters.some(s => {
        if (s === 'Backlog') return task.status === 'Pending' || task.status === 'Backlog';
        return task.status === s;
      });
      const tagsMatch = selectedTags.length === 0 || selectedTags.some(tag => task.labels?.includes(tag));
      const searchMatch = debouncedSearch === "" || task.title?.toLowerCase().includes(debouncedSearch.toLowerCase()) || (task.description && task.description.toLowerCase().includes(debouncedSearch.toLowerCase()));
      const recurringMatch = !hideRecurring || task.task_type !== 'recurring';
      return assigneeMatch && dateMatch && statusMatch && tagsMatch && searchMatch && recurringMatch;
    });
  }, [data, selectedAssignees, dateFilter, statusFilters, selectedTags, debouncedSearch, hideRecurring, showMyTasks, user]);

  const finalFilteredTasks = useMemo(() => {
    if (activeQuickFilter) {
      const quickFilterDef = quickFilters.find(f => f.label === activeQuickFilter);
      if (quickFilterDef) return filteredTasks.filter(quickFilterDef.filter);
    }
    return filteredTasks;
  }, [filteredTasks, activeQuickFilter]);

  useEffect(() => { setCurrentPage(1); }, [selectedAssignees, dateFilter, statusFilters, selectedTags, debouncedSearch, activeQuickFilter]);

  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  
  const handleShiftSelect = useCallback((taskId: string, shiftKey: boolean) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedTasks = finalFilteredTasks.slice(startIndex, startIndex + itemsPerPage);
    const currentIndex = paginatedTasks.findIndex(t => t.id === taskId);
    
    if (shiftKey && lastSelectedIndex !== null && currentIndex !== -1) {
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      const rangeIds = paginatedTasks.slice(start, end + 1).map(t => t.id);
      const newSelection = Array.from(new Set([...selectedTaskIds, ...rangeIds]));
      setSelectedTaskIds(newSelection);
    } else {
      setLastSelectedIndex(currentIndex);
      if (selectedTaskIds.includes(taskId)) {
        setSelectedTaskIds(selectedTaskIds.filter(id => id !== taskId));
      } else {
        setSelectedTaskIds([...selectedTaskIds, taskId]);
      }
    }
  }, [currentPage, itemsPerPage, finalFilteredTasks, lastSelectedIndex, selectedTaskIds]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const startIndex = (currentPage - 1) * itemsPerPage;
      const paginatedTasks = finalFilteredTasks.slice(startIndex, startIndex + itemsPerPage);
      const focusedTask = focusedIndex >= 0 && focusedIndex < paginatedTasks.length 
        ? paginatedTasks[focusedIndex] 
        : null;
      
      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => Math.min(prev + 1, paginatedTasks.length - 1));
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          if (focusedTask) {
            handleTaskClick(focusedTask.id, focusedTask);
          }
          break;
        case 'Escape':
          if (selectedTaskId) {
            handleCloseSidePanel();
          } else if (selectedTaskIds.length > 0) {
            setSelectedTaskIds([]);
          } else {
            setFocusedIndex(-1);
          }
          break;
        case 'n':
          if (!selectedTaskId) {
            e.preventDefault();
            setDialogOpen(true);
          }
          break;
        case 'x':
          if (focusedTask) {
            e.preventDefault();
            handleShiftSelect(focusedTask.id, e.shiftKey);
          }
          break;
        case ' ':
          if (focusedTask && focusedTask.status !== 'Completed') {
            e.preventDefault();
            completeTasksBulk([focusedTask.id]).then(() => {
              queryClient.invalidateQueries({ queryKey: ['tasks'] });
              toast({ title: "Task completed", duration: 1500 });
            });
          }
          break;
        case 'a':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            setSelectedTaskIds(paginatedTasks.map(t => t.id));
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, finalFilteredTasks, currentPage, itemsPerPage, selectedTaskId, selectedTaskIds, handleTaskClick, handleCloseSidePanel, handleShiftSelect, queryClient, toast]);

  const tasks = data || [];
  const hasActiveFilters = selectedAssignees.length > 0 || selectedTags.length > 0 || dateFilter || statusFilters.length !== 4 || activeQuickFilter || searchQuery || showMyTasks;
  
  const myTasksCount = useMemo(() => {
    if (!user || !data) return 0;
    return data.filter((task: any) => 
      task.assignees?.some((assignee: any) => assignee.user_id === user.id) &&
      task.status !== 'Completed' && task.status !== 'Failed'
    ).length;
  }, [data, user]);

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageContainer>
    );
  }

  const clearAllFilters = () => {
    setSelectedAssignees([]); setSelectedTags([]); setDateFilter(null);
    setStatusFilters(['Backlog', 'Ongoing', 'Blocked', 'Failed']);
    setActiveQuickFilter(null); setSearchQuery(""); setSelectedTaskIds([]);
    setShowMyTasks(false);
  };

  const handleBulkComplete = async () => {
    const result = await completeTasksBulk(selectedTaskIds);
    if (result.success) {
      toast({ title: `${result.successCount} task(s) completed`, duration: 2000 });
    } else {
      toast({ 
        title: "Some tasks failed to complete", 
        description: `${result.successCount} succeeded, ${result.failedCount} failed`,
        variant: "destructive" 
      });
    }
    setSelectedTaskIds([]);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const handleBulkStatusChange = async (status: string, blockedReason?: string) => {
    const result = await setTasksStatusBulk(selectedTaskIds, status, { blocked_reason: blockedReason });
    
    if (blockedReason && user) {
      for (const id of selectedTaskIds) {
        await addTaskComment(id, user.id, `Blocked: ${blockedReason}`);
      }
    }
    
    if (result.success) {
      toast({ title: `${result.successCount} task(s) updated`, duration: 2000 });
    } else {
      toast({ 
        title: "Some tasks failed to update", 
        description: `${result.successCount} succeeded, ${result.failedCount} failed`,
        variant: "destructive" 
      });
    }
    setSelectedTaskIds([]);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const handleBulkPriorityChange = async (priority: string) => {
    const result = await setPriorityBulk(selectedTaskIds, priority as 'Low' | 'Medium' | 'High');
    if (result.success) {
      toast({ title: `${result.successCount} task(s) priority updated`, duration: 2000 });
    }
    setSelectedTaskIds([]);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const handleBulkDelete = async () => {
    const result = await deleteTasksBulk(selectedTaskIds);
    if (result.success) {
      toast({ title: `${result.successCount} task(s) deleted`, duration: 2000 });
    }
    setSelectedTaskIds([]);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const handleBulkExport = () => { 
    const selectedTasks = finalFilteredTasks.filter(t => selectedTaskIds.includes(t.id)); 
    exportTasksToCSV(selectedTasks); 
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTasks = viewMode === 'list' 
    ? finalFilteredTasks.slice(startIndex, startIndex + itemsPerPage)
    : finalFilteredTasks;
  const totalPages = Math.ceil(finalFilteredTasks.length / itemsPerPage);

  const TaskListContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto p-md space-y-md">
        <PageHeader
          icon={ListTodo}
          title="Tasks"
          description="Manage and track your team's tasks"
          actions={
            <Button 
              onClick={() => setDialogOpen(true)} 
              size="icon"
              className="rounded-full h-10 w-10 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-smooth"
            >
              <Plus className="h-5 w-5" />
            </Button>
          }
        />

        {/* Toolbar */}
        <FilterBar search={{ value: searchQuery, onChange: setSearchQuery, placeholder: "Search tasks..." }}>
          <Button
            variant={showMyTasks ? "default" : "outline"}
            onClick={() => setShowMyTasks(!showMyTasks)}
            className="gap-2"
          >
            <User className="h-4 w-4" />
            My Tasks
            {myTasksCount > 0 && (
              <Badge variant={showMyTasks ? "secondary" : "default"} className="ml-1 h-5 px-1.5 text-metadata">
                {myTasksCount}
              </Badge>
            )}
          </Button>

          <StatusMultiSelect value={statusFilters} onChange={setStatusFilters} />
          
          <Select value={selectedTags.length > 0 ? "selected" : "all"} onValueChange={(value) => { if (value === "all") setSelectedTags([]); }}>
            <SelectTrigger className="w-[110px]">
              <SelectValue>{selectedTags.length > 0 ? `${selectedTags.length} tags` : "Tags"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {TASK_TAGS.map((tag) => (
                <div key={tag.value} onClick={(e) => { e.preventDefault(); setSelectedTags(prev => prev.includes(tag.value) ? prev.filter(t => t !== tag.value) : [...prev, tag.value]); }} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted rounded-lg text-body-sm">
                  <input type="checkbox" checked={selectedTags.includes(tag.value)} onChange={() => {}} className="cursor-pointer rounded" />
                  <span>{tag.label}</span>
                </div>
              ))}
            </SelectContent>
          </Select>

          <AssigneeFilterBar selectedAssignees={selectedAssignees} onAssigneesChange={setSelectedAssignees} />
          <TaskDateFilterBar value={dateFilter ? { from: dateFilter.startDate, to: dateFilter.endDate } : null} onFilterChange={setDateFilter} onStatusChange={() => {}} selectedStatus="all" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={!hideRecurring ? "default" : "outline"} 
                size="icon"
                onClick={() => setHideRecurring(!hideRecurring)} 
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{hideRecurring ? "Show Recurring Tasks" : "Hide Recurring Tasks"}</TooltipContent>
          </Tooltip>

          <div className="ml-auto">
            <ViewSwitcher 
              viewMode={viewMode} 
              onViewModeChange={setViewMode}
              boardGroupBy={boardGroupBy}
              onBoardGroupByChange={setBoardGroupBy}
            />
          </div>
        </FilterBar>

        {/* Active filters indicator */}
        {hasActiveFilters && (
          <div className="flex items-center gap-sm">
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear All Filters
            </Button>
            <span className="text-body-sm text-muted-foreground">Showing {finalFilteredTasks.length} of {data?.length || 0} tasks</span>
          </div>
        )}

        {/* Task Content - NO WRAPPER CARDS */}
        {finalFilteredTasks.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-md" />
            <h3 className="text-heading-sm font-medium text-foreground mb-2">All Clear!</h3>
            <p className="text-body-sm text-muted-foreground mb-md">
              {tasks.length === 0 ? "You don't have any tasks yet." : "No tasks match your filters."}
            </p>
            {tasks.length === 0 && (
              <Button onClick={() => setDialogOpen(true)}>Create Your First Task</Button>
            )}
          </div>
        ) : (
          <>
            {/* Pagination info for list view */}
            {viewMode === 'list' && (
              <div className="flex items-center justify-between text-metadata text-muted-foreground">
                <span>
                  {Math.min(startIndex + 1, finalFilteredTasks.length)}-{Math.min(startIndex + itemsPerPage, finalFilteredTasks.length)} of {finalFilteredTasks.length}
                </span>
                <div className="flex items-center gap-xs">
                  <span>Per page:</span>
                  <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="w-[70px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[20, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Views - FLAT, NO CARDS */}
            {viewMode === 'list' ? (
              <TaskListView
                tasks={paginatedTasks}
                selectedIds={selectedTaskIds}
                onSelectionChange={setSelectedTaskIds}
                onTaskClick={handleTaskClick}
                onShiftSelect={handleShiftSelect}
                focusedIndex={focusedIndex}
                onRefresh={refetch}
              />
            ) : (
              <TaskBoardView 
                tasks={paginatedTasks} 
                onTaskClick={handleTaskClick} 
                groupBy={boardGroupBy} 
              />
            )}

            {/* Pagination for list view */}
            {viewMode === 'list' && totalPages > 1 && (
              <div className="flex justify-center pt-md">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                        className={cn(currentPage === 1 && "pointer-events-none opacity-50")} 
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink onClick={() => setCurrentPage(pageNum)} isActive={currentPage === pageNum}>{pageNum}</PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                        className={cn(currentPage === totalPages && "pointer-events-none opacity-50")} 
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-64px)] bg-background relative">
      <TaskBulkActionsBar
        selectedCount={selectedTaskIds.length}
        onClearSelection={() => setSelectedTaskIds([])}
        onComplete={handleBulkComplete}
        onDelete={handleBulkDelete}
        onStatusChange={handleBulkStatusChange}
        onPriorityChange={handleBulkPriorityChange}
        onExport={handleBulkExport}
      />
      
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel 
          defaultSize={selectedTaskId ? 60 : 100} 
          minSize={40}
          className="overflow-hidden"
          onClick={() => {
            if (selectedTaskId) {
              handleCloseSidePanel();
            }
          }}
        >
          <TaskListContent />
        </ResizablePanel>

        {selectedTaskId && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel 
              defaultSize={40} 
              minSize={30} 
              maxSize={50}
              className="overflow-hidden"
            >
              <TaskDetailPanel
                taskId={selectedTaskId}
                task={selectedTask}
                onClose={handleCloseSidePanel}
                onTaskDeleted={() => {
                  handleCloseSidePanel();
                  refetch();
                }}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      <CreateTaskDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      
      <FilteredTasksDialog
        open={filteredDialogOpen}
        onOpenChange={setFilteredDialogOpen}
        filterType={filteredDialogType}
        tasks={(() => {
          if (filteredDialogType === 'overdue') return tasks.filter((t: any) => t.due_at && new Date(t.due_at) < new Date() && t.status !== 'Completed');
          else if (filteredDialogType === 'ongoing') return tasks.filter((t: any) => t.status === 'Ongoing');
          else if (filteredDialogType === 'completed') return tasks.filter((t: any) => t.status === 'Completed');
          return tasks;
        })()}
        onRefresh={refetch}
      />
    </div>
  );
}
