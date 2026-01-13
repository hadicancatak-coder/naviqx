import { useState } from "react";
import { useSprints, Sprint } from "@/hooks/useSprints";
import { useTasks } from "@/hooks/useTasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Zap, Calendar, CheckCircle2, Edit2, Trash2, Play, Square } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

const statusConfig = {
  planning: { label: "Planning", icon: Calendar, color: "bg-primary/15 text-primary border-primary/30" },
  active: { label: "Active", icon: Zap, color: "bg-success/15 text-success border-success/30" },
  completed: { label: "Completed", icon: CheckCircle2, color: "bg-muted text-muted-foreground border-border" },
};

export default function SprintsManagement() {
  const { sprints, activeSprint, createSprint, updateSprint, deleteSprint, isCreating, isUpdating, isDeleting } = useSprints();
  const { data: tasks } = useTasks();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [sprintToDelete, setSprintToDelete] = useState<Sprint | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    goal: "",
    start_date: "",
    end_date: "",
    status: "planning" as Sprint['status'],
  });

  const resetForm = () => {
    setFormData({ name: "", goal: "", start_date: "", end_date: "", status: "planning" });
    setEditingSprint(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (sprint: Sprint) => {
    setEditingSprint(sprint);
    setFormData({
      name: sprint.name,
      goal: sprint.goal || "",
      start_date: sprint.start_date,
      end_date: sprint.end_date,
      status: sprint.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.start_date || !formData.end_date) return;

    // Check if trying to activate when another sprint is active
    if (formData.status === 'active' && activeSprint && activeSprint.id !== editingSprint?.id) {
      // Deactivate current sprint first
      updateSprint({ id: activeSprint.id, status: 'completed' });
    }

    if (editingSprint) {
      updateSprint({ id: editingSprint.id, ...formData });
    } else {
      createSprint(formData);
    }
    
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = () => {
    if (sprintToDelete) {
      deleteSprint(sprintToDelete.id);
      setDeleteDialogOpen(false);
      setSprintToDelete(null);
    }
  };

  const getSprintStats = (sprintId: string) => {
    const sprintTasks = tasks?.filter(t => t.sprint === sprintId) || [];
    const completed = sprintTasks.filter(t => t.status === 'Completed').length;
    return { total: sprintTasks.length, completed };
  };

  return (
    <div className="space-y-lg">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-heading-md font-semibold">Sprints</h2>
          <p className="text-body-sm text-muted-foreground">Manage iteration cycles for your team</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          New Sprint
        </Button>
      </div>

      {/* Active Sprint */}
      {activeSprint && (
        <div className="space-y-sm">
          <h3 className="text-body-sm font-medium text-muted-foreground uppercase tracking-wide">Active Sprint</h3>
          <SprintCard 
            sprint={activeSprint} 
            stats={getSprintStats(activeSprint.id)}
            onEdit={() => openEditDialog(activeSprint)}
            onDelete={() => { setSprintToDelete(activeSprint); setDeleteDialogOpen(true); }}
          />
        </div>
      )}

      {/* Planning Sprints */}
      {sprints.filter(s => s.status === 'planning').length > 0 && (
        <div className="space-y-sm">
          <h3 className="text-body-sm font-medium text-muted-foreground uppercase tracking-wide">Upcoming</h3>
          <div className="grid gap-md">
            {sprints.filter(s => s.status === 'planning').map(sprint => (
              <SprintCard 
                key={sprint.id}
                sprint={sprint}
                stats={getSprintStats(sprint.id)}
                onEdit={() => openEditDialog(sprint)}
                onDelete={() => { setSprintToDelete(sprint); setDeleteDialogOpen(true); }}
                onActivate={() => {
                  if (activeSprint) {
                    updateSprint({ id: activeSprint.id, status: 'completed' });
                  }
                  updateSprint({ id: sprint.id, status: 'active' });
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Sprints */}
      {sprints.filter(s => s.status === 'completed').length > 0 && (
        <div className="space-y-sm">
          <h3 className="text-body-sm font-medium text-muted-foreground uppercase tracking-wide">Completed</h3>
          <div className="grid gap-md">
            {sprints.filter(s => s.status === 'completed').slice(0, 5).map(sprint => (
              <SprintCard 
                key={sprint.id}
                sprint={sprint}
                stats={getSprintStats(sprint.id)}
                onEdit={() => openEditDialog(sprint)}
                onDelete={() => { setSprintToDelete(sprint); setDeleteDialogOpen(true); }}
              />
            ))}
          </div>
        </div>
      )}

      {sprints.length === 0 && (
        <Card className="p-xl text-center">
          <Zap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-md" />
          <h3 className="text-heading-sm font-medium mb-2">No sprints yet</h3>
          <p className="text-body-sm text-muted-foreground mb-md">
            Create your first sprint to organize work into iterations
          </p>
          <Button onClick={openCreateDialog}>Create Sprint</Button>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSprint ? "Edit Sprint" : "Create Sprint"}</DialogTitle>
            <DialogDescription>
              {editingSprint ? "Update sprint details" : "Create a new sprint iteration"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-md py-md">
            <div className="space-y-xs">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Sprint 1"
              />
            </div>
            
            <div className="space-y-xs">
              <Label htmlFor="goal">Goal (optional)</Label>
              <Textarea
                id="goal"
                value={formData.goal}
                onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value }))}
                placeholder="What should we accomplish this sprint?"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-md">
              <div className="space-y-xs">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-xs">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-xs">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v: Sprint['status']) => setFormData(prev => ({ ...prev, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.name || !formData.start_date || !formData.end_date || isCreating || isUpdating}
            >
              {editingSprint ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sprint?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete "{sprintToDelete?.name}". Tasks in this sprint will be moved to backlog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SprintCard({ 
  sprint, 
  stats, 
  onEdit, 
  onDelete,
  onActivate 
}: { 
  sprint: Sprint; 
  stats: { total: number; completed: number };
  onEdit: () => void;
  onDelete: () => void;
  onActivate?: () => void;
}) {
  const config = statusConfig[sprint.status];
  const Icon = config.icon;
  const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const duration = differenceInDays(new Date(sprint.end_date), new Date(sprint.start_date));

  return (
    <Card className="p-md hover:shadow-soft transition-smooth">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-sm">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.color.split(' ')[0])}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{sprint.name}</h4>
              <Badge variant="outline" className={cn("text-metadata", config.color)}>
                {config.label}
              </Badge>
            </div>
            <p className="text-metadata text-muted-foreground">
              {format(new Date(sprint.start_date), 'MMM d')} - {format(new Date(sprint.end_date), 'MMM d')} ({duration} days)
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-xs">
          {onActivate && sprint.status === 'planning' && (
            <Button variant="ghost" size="icon" onClick={onActivate} title="Start Sprint">
              <Play className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      
      {stats.total > 0 && (
        <div className="mt-md">
          <div className="flex items-center justify-between text-metadata mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span>{stats.completed}/{stats.total} tasks</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}
      
      {sprint.goal && (
        <p className="text-body-sm text-muted-foreground mt-sm line-clamp-1">{sprint.goal}</p>
      )}
    </Card>
  );
}
