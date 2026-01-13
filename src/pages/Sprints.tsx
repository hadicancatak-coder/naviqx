import { useState, useMemo } from "react";
import { useSprints } from "@/hooks/useSprints";
import { useTasks } from "@/hooks/useTasks";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { useTaskDrawer } from "@/contexts/TaskDrawerContext";
import { SprintHeader } from "@/components/sprints/SprintHeader";
import { SprintBacklog } from "@/components/sprints/SprintBacklog";
import { SprintKanban } from "@/components/sprints/SprintKanban";
import { SprintCompleteDialog } from "@/components/sprints/SprintCompleteDialog";
import { CreateSprintDialog } from "@/components/sprints/CreateSprintDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Zap, Calendar, LayoutGrid, List, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Sprints() {
  const navigate = useNavigate();
  const { openTaskDrawer } = useTaskDrawer();
  const { sprints, activeSprint, upcomingSprints, createSprint, updateSprint, isCreating, isUpdating } = useSprints();
  const { data: allTasks, isLoading: tasksLoading } = useTasks();
  const { setSprintBulk } = useTaskMutations();

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

  const handleTaskClick = (taskId: string) => {
    openTaskDrawer(taskId);
  };

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

  // No active sprint state
  if (!currentSprint && !selectedSprintId) {
    return (
      <div className="space-y-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-heading-lg font-semibold">Sprint Board</h1>
            <p className="text-body-sm text-muted-foreground">
              Plan and track work in time-boxed iterations
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Sprint
          </Button>
        </div>

        <Card className="p-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-lg">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-heading-md font-semibold mb-2">No Active Sprint</h2>
          <p className="text-body text-muted-foreground max-w-md mx-auto mb-lg">
            Create a sprint to start organizing your work into focused iterations. 
            Sprints help teams deliver value in regular, predictable cycles.
          </p>
          <div className="flex items-center justify-center gap-md">
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
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

        {/* Backlog Preview */}
        {backlogTasks.length > 0 && (
          <div>
            <h2 className="text-heading-sm font-semibold mb-md">
              Backlog ({backlogTasks.length} tasks)
            </h2>
            <p className="text-body-sm text-muted-foreground mb-md">
              These tasks will be available to add to your sprint once created.
            </p>
          </div>
        )}

        <CreateSprintDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={handleCreateSprint}
          isSubmitting={isCreating}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
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
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-success" />
                    {activeSprint.name} (Active)
                  </span>
                </SelectItem>
              )}
              {upcomingSprints.map(sprint => (
                <SelectItem key={sprint.id} value={sprint.id}>
                  <span className="flex items-center gap-2">
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
                <LayoutGrid className="h-4 w-4 mr-1.5" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="h-4 w-4 mr-1.5" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-sm">
          <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
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

        {/* Sprint Kanban */}
        <SprintKanban
          tasks={sprintTasks}
          onTaskClick={handleTaskClick}
        />
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
    </div>
  );
}
