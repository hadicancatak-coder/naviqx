import { useState, useMemo, useCallback } from "react";
import { useSprints } from "@/hooks/useSprints";
import { useTasks } from "@/hooks/useTasks";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { useAuth } from "@/hooks/useAuth";
import { SprintHeader } from "@/components/sprints/SprintHeader";
import { SprintBacklog } from "@/components/sprints/SprintBacklog";
import { UnifiedTaskBoard } from "@/components/tasks/UnifiedTaskBoard";
import { TaskListView } from "@/components/tasks/TaskListView";
import { SprintCompleteDialog } from "@/components/sprints/SprintCompleteDialog";
import { CreateSprintDialog } from "@/components/sprints/CreateSprintDialog";
import { PageContainer } from "@/components/layout/PageContainer";
import { LoadingState } from "@/components/layout/LoadingState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Zap, Calendar, LayoutGrid, List, Settings, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTaskDrawer } from "@/contexts/TaskDrawerContext";
const priorityColors: Record<string, string> = {
  urgent: 'status-destructive',
  high: 'status-warning',
  medium: 'status-info',
  low: 'status-neutral',
};

export default function Sprints() {
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const { sprints, activeSprint, upcomingSprints, createSprint, updateSprint, isCreating, isUpdating } = useSprints();
  const { data: allTasks, isLoading: tasksLoading, isError: tasksError, refetch } = useTasks();
  const { setSprintBulk } = useTaskMutations();
  const { openTaskDrawer } = useTaskDrawer();

  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [selectedBacklogTasks, setSelectedBacklogTasks] = useState<string[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');

  // Determine which sprint to show
  const currentSprint = selectedSprintId 
    ? sprints.find(s => s.id === selectedSprintId) 
    : activeSprint;

  // Filter tasks
  const sprintTasks = useMemo(() => 
    allTasks?.filter(t => t.sprint === currentSprint?.id) || [],
    [allTasks, currentSprint?.id]
  );

  const backlogTasks = useMemo(() => 
    allTasks?.filter(t => !t.sprint && t.status !== 'Completed') || [],
    [allTasks]
  );

  // Calculate stats
  const taskStats = useMemo(() => ({
    total: sprintTasks.length,
    completed: sprintTasks.filter(t => t.status === 'Completed').length,
    inProgress: sprintTasks.filter(t => t.status === 'Ongoing').length,
    blocked: sprintTasks.filter(t => t.status === 'Blocked').length,
  }), [sprintTasks]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTaskClick = useCallback((taskId: string, task?: any) => {
    openTaskDrawer(taskId, task || allTasks?.find(t => t.id === taskId));
  }, [openTaskDrawer, allTasks]);

  const handleBacklogTaskSelect = (taskId: string) => {
    setSelectedBacklogTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleAddToSprint = () => {
    if (!currentSprint || selectedBacklogTasks.length === 0) return;
    setSprintBulk(selectedBacklogTasks, currentSprint.id);
    setSelectedBacklogTasks([]);
  };

  const handleCreateSprint = (data: Parameters<typeof createSprint>[0]) => {
    createSprint(data);
  };

  const handleCompleteSprint = (moveToNextSprint: boolean) => {
    if (!currentSprint) return;
    
    const incompleteTasks = sprintTasks.filter(t => t.status !== 'Completed');
    const nextSprint = upcomingSprints[0];
    
    // Move incomplete tasks
    if (incompleteTasks.length > 0) {
      const targetSprintId = moveToNextSprint && nextSprint ? nextSprint.id : null;
      setSprintBulk(incompleteTasks.map(t => t.id), targetSprintId);
    }
    
    // Mark sprint as completed
    updateSprint({ id: currentSprint.id, status: 'completed' });
    
    // If there's a next sprint, activate it
    if (nextSprint) {
      updateSprint({ id: nextSprint.id, status: 'active' });
      setSelectedSprintId(nextSprint.id);
    } else {
      setSelectedSprintId(null);
    }
  };

  // Wait for auth to resolve first
  if (authLoading) {
    return (
      <PageContainer size="wide">
        <LoadingState variant="section" minHeight="h-96" />
      </PageContainer>
    );
  }

  // Handle error state
  if (tasksError) {
    return (
      <PageContainer size="wide">
        <LoadingState 
          variant="section" 
          isError 
          errorMessage="Could not load sprints data."
          minHeight="h-96"
        />
      </PageContainer>
    );
  }

  // No active sprint state
  if (!currentSprint && !selectedSprintId) {
    return (
      <PageContainer size="wide">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-lg">
          <div>
            <h1 className="text-heading-lg font-semibold">Sprint Board</h1>
            <p className="text-body-sm text-muted-foreground mt-xs">
              Plan and track work in time-boxed iterations
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-xs">
            <Plus className="h-4 w-4" />
            Create Sprint
          </Button>
        </div>

        {/* Empty State Card */}
        <Card className="liquid-glass-elevated p-2xl text-center border-0">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/15 to-primary/5 flex items-center justify-center mx-auto mb-lg shadow-lg shadow-primary/10">
            <Zap className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-heading-md font-semibold mb-xs">No Active Sprint</h2>
          <p className="text-body text-muted-foreground max-w-md mx-auto mb-lg">
            Create a sprint to start organizing your work into focused iterations. 
            Sprints help teams deliver value in regular, predictable cycles.
          </p>
          <div className="flex items-center justify-center gap-md">
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-xs">
              <Plus className="h-4 w-4" />
              Create Your First Sprint
            </Button>
            {sprints.length > 0 && (
              <Select onValueChange={setSelectedSprintId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="View past sprint" />
                </SelectTrigger>
                <SelectContent>
                  {sprints.map(sprint => (
                    <SelectItem key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </Card>

        {/* Backlog Preview with Task Cards */}
        {backlogTasks.length > 0 && (
          <Card className="p-md">
            <div className="flex items-center justify-between mb-md">
              <h2 className="text-heading-sm font-semibold">Backlog</h2>
              <Badge variant="secondary">{backlogTasks.length} tasks</Badge>
            </div>
            <p className="text-body-sm text-muted-foreground mb-lg">
              These tasks will be available to add to your sprint once created.
            </p>
            
            {/* Preview grid of backlog tasks */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
              {backlogTasks.slice(0, 6).map(task => (
                <div 
                  key={task.id}
                  className="p-sm rounded-lg border border-border bg-card hover:bg-card-hover transition-smooth cursor-pointer"
                  onClick={() => handleTaskClick(task.id)}
                >
                  <p className="text-body-sm font-medium truncate">{task.title}</p>
                  <div className="flex items-center gap-xs mt-xs">
                    {task.priority && (
                      <Badge variant="outline" className={priorityColors[task.priority] || 'status-neutral'}>
                        {task.priority}
                      </Badge>
                    )}
                    {task.status === 'Blocked' && (
                      <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {backlogTasks.length > 6 && (
              <p className="text-metadata text-muted-foreground mt-md text-center">
                +{backlogTasks.length - 6} more tasks in backlog
              </p>
            )}
          </Card>
        )}

        <CreateSprintDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={handleCreateSprint}
          isSubmitting={isCreating}
        />
      </PageContainer>
    );
  }

  const SprintContent = () => (
    <PageContainer size="wide" className="flex flex-col h-full">
      {/* Header with Sprint Selector */}
      <div className="flex items-center justify-between mb-md">
        <div className="flex items-center gap-md">
          <Select 
            value={currentSprint?.id || ''} 
            onValueChange={(v) => setSelectedSprintId(v || null)}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select sprint" />
            </SelectTrigger>
            <SelectContent>
              {activeSprint && (
                <SelectItem value={activeSprint.id}>
                  <span className="flex items-center gap-xs">
                    <Zap className="h-4 w-4 text-success" />
                    {activeSprint.name} (Active)
                  </span>
                </SelectItem>
              )}
              {upcomingSprints.map(sprint => (
                <SelectItem key={sprint.id} value={sprint.id}>
                  <span className="flex items-center gap-xs">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {sprint.name}
                  </span>
                </SelectItem>
              ))}
              {sprints.filter(s => s.status === 'completed').slice(0, 5).map(sprint => (
                <SelectItem key={sprint.id} value={sprint.id}>
                  <span className="text-muted-foreground">{sprint.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Tabs value={view} onValueChange={(v) => setView(v as 'kanban' | 'list')}>
            <TabsList>
              <TabsTrigger value="kanban">
                <LayoutGrid className="h-4 w-4 mr-xs" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="h-4 w-4 mr-xs" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-sm">
          <Button variant="outline" onClick={() => setCreateDialogOpen(true)} className="gap-xs">
            <Plus className="h-4 w-4" />
            New Sprint
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/sprints')}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sprint Header */}
      {currentSprint && (
        <SprintHeader
          sprint={currentSprint}
          taskStats={taskStats}
          onComplete={currentSprint.status === 'active' ? () => setCompleteDialogOpen(true) : undefined}
          onSettings={() => navigate('/admin/sprints')}
        />
      )}

      {/* Main Content: Backlog + Kanban */}
      <div className="flex-1 min-h-0 grid grid-cols-[320px_1fr] gap-lg">
        {/* Backlog Panel */}
        <SprintBacklog
          tasks={backlogTasks}
          selectedTasks={selectedBacklogTasks}
          onTaskSelect={handleBacklogTaskSelect}
          onAddToSprint={handleAddToSprint}
          onTaskClick={handleTaskClick}
        />

        {/* Sprint Board/List */}
        {view === 'list' ? (
          <TaskListView
            tasks={sprintTasks}
            selectedIds={[]}
            onSelectionChange={() => {}}
            onTaskClick={handleTaskClick}
            onShiftSelect={() => {}}
            focusedIndex={-1}
            onRefresh={refetch}
          />
        ) : (
          <UnifiedTaskBoard
            tasks={sprintTasks}
            onTaskClick={handleTaskClick}
            groupBy="status"
          />
        )}
      </div>

      {/* Dialogs */}
      <CreateSprintDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateSprint}
        isSubmitting={isCreating}
      />

      {currentSprint && (
        <SprintCompleteDialog
          open={completeDialogOpen}
          onOpenChange={setCompleteDialogOpen}
          sprint={currentSprint}
          incompleteTasks={sprintTasks.filter(t => t.status !== 'Completed')}
          completedTasks={sprintTasks.filter(t => t.status === 'Completed')}
          nextSprint={upcomingSprints[0]}
          onComplete={handleCompleteSprint}
        />
      )}
    </PageContainer>
  );

  return (
    <div className="h-[calc(100vh-64px)] bg-background overflow-auto">
      <SprintContent />
    </div>
  );
}
