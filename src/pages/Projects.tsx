import { useState, useMemo, useEffect } from "react";
import { Plus, Search, FolderKanban, ArrowLeft, Share2, Edit2, Trash2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { PageContainer, PageHeader } from "@/components/layout";
import { Project, useProjects, useProjectTimelines, useProjectAssignees } from "@/hooks/useProjects";
import { usePhaseMilestones, usePhaseTaskStats, useAllProjectMilestones } from "@/hooks/useRoadmap";
import { useTasks } from "@/hooks/useTasks";
import { 
  ProjectCard, 
  ProjectBrief, 
  ProjectBriefEditor, 
  ProjectRoadmap, 
  ProjectSummaryStats,
  ProjectPhaseEditor,
  ProjectShareDialog,
  ProjectCreateDialog,
} from "@/components/projects";
import { EmptyState } from "@/components/layout/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Status configuration
const statusConfig: Record<string, { label: string; className: string }> = {
  planning: { label: "Planning", className: "status-info" },
  active: { label: "Active", className: "status-success" },
  "on-hold": { label: "On Hold", className: "status-warning" },
  completed: { label: "Completed", className: "status-neutral" },
};

export default function Projects() {
  const { user, loading: authLoading } = useAuth();
  const { projects, isLoading, error: projectsError, createProject, updateProject, deleteProject } = useProjects();
  const { data: allTasks } = useTasks();

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isBriefEditorOpen, setIsBriefEditorOpen] = useState(false);
  const [isPhaseEditorOpen, setIsPhaseEditorOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<ReturnType<typeof useProjectTimelines>['timelines'] extends (infer T)[] ? T : never>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [phaseDeleteConfirmOpen, setPhaseDeleteConfirmOpen] = useState(false);
  const [phaseToDelete, setPhaseToDelete] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const isAdmin = true;

  // Project-specific data hooks
  const { timelines, createTimeline, updateTimeline, deleteTimeline } = useProjectTimelines(selectedProject?.id || null);
  const { assignees } = useProjectAssignees(selectedProject?.id || null);
  const phaseIds = timelines?.map((t) => t.id) || [];
  const { milestones } = useAllProjectMilestones(selectedProject?.id || null, phaseIds);
  const { taskStats } = usePhaseTaskStats(selectedProject?.id || null);

  // Keep selectedProject in sync with query data
  useEffect(() => {
    if (selectedProject && projects) {
      const freshProject = projects.find(p => p.id === selectedProject.id);
      if (freshProject) {
        setSelectedProject(freshProject);
      }
    }
  }, [projects]);

  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    if (!searchQuery.trim()) return projects;
    
    return projects.filter(project => 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.purpose?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [projects, searchQuery]);

  // Get timelines and task counts for project cards
  const projectCardData = useMemo(() => {
    const data: Record<string, { taskCount: number; completedTasks: number }> = {};
    
    if (allTasks && projects) {
      for (const project of projects) {
        const projectTasks = allTasks.filter((t) => t.project_id === project.id);
        data[project.id] = {
          taskCount: projectTasks.length,
          completedTasks: projectTasks.filter((t) => t.status === "Completed").length,
        };
      }
    }
    
    return data;
  }, [allTasks, projects]);

  // Handlers
  const handleCreateProject = async (data: Partial<Project>) => {
    const result = await createProject.mutateAsync(data as Project & { name: string });
    setSelectedProject(result as Project);
    setIsCreateDialogOpen(false);
  };

  const handleUpdateProject = async (data: Partial<Project>) => {
    if (data.id) {
      await updateProject.mutateAsync(data as Project & { id: string });
    }
    setIsBriefEditorOpen(false);
  };

  const handleDeleteProject = async () => {
    if (selectedProject) {
      await deleteProject.mutateAsync(selectedProject.id);
      setSelectedProject(null);
      setDeleteConfirmOpen(false);
    }
  };

  const handleAddPhase = () => {
    setEditingPhase(null);
    setIsPhaseEditorOpen(true);
  };

  const handleEditPhase = (phase: NonNullable<typeof timelines>[number]) => {
    setEditingPhase(phase);
    setIsPhaseEditorOpen(true);
  };

  const handleSavePhase = async (data: Parameters<typeof createTimeline.mutateAsync>[0]) => {
    if (editingPhase) {
      await updateTimeline.mutateAsync({ id: editingPhase.id, ...data });
    } else {
      await createTimeline.mutateAsync(data);
    }
    setIsPhaseEditorOpen(false);
    setEditingPhase(null);
  };

  const handleDeletePhase = (phaseId: string) => {
    setPhaseToDelete(phaseId);
    setPhaseDeleteConfirmOpen(true);
  };

  const confirmDeletePhase = async () => {
    if (phaseToDelete) {
      await deleteTimeline.mutateAsync(phaseToDelete);
      setPhaseToDelete(null);
      setPhaseDeleteConfirmOpen(false);
    }
  };

  // Loading states
  if (authLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageContainer>
    );
  }

  if (projectsError) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center h-64 gap-md">
          <p className="text-muted-foreground">Could not load projects.</p>
        </div>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageContainer>
    );
  }

  // =============================================
  // PROJECT DETAIL VIEW (Roadmap-First)
  // =============================================
  if (selectedProject) {
    const iconName = selectedProject.icon || "folder-kanban";
    const iconKey = iconName.split("-").map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
    const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconKey] || LucideIcons.FolderKanban;
    const status = statusConfig[selectedProject.status] || statusConfig.planning;

    return (
      <PageContainer size="wide">
        {/* Header */}
        <div className="flex items-center justify-between mb-lg">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedProject(null)}
            className="gap-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
          
          <div className="flex items-center gap-sm">
            <Button variant="outline" size="sm" onClick={() => setShareDialogOpen(true)} className="gap-xs">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsBriefEditorOpen(true)} className="gap-xs">
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(true)} className="gap-xs text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Project Title Bar */}
        <div className="flex items-center gap-md mb-lg">
          <div className="p-md bg-primary/10 rounded-xl">
            <IconComponent className="h-8 w-8 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-sm">
              <h1 className="text-heading-lg font-bold text-foreground">{selectedProject.name}</h1>
              <Badge className={cn("text-metadata", status.className)}>{status.label}</Badge>
            </div>
            {selectedProject.purpose && (
              <p className="text-body text-muted-foreground mt-xs">{selectedProject.purpose}</p>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mb-lg">
          <ProjectSummaryStats
            timelines={timelines || []}
            milestones={milestones || []}
            taskStats={taskStats || []}
            dueDate={selectedProject.due_date}
          />
        </div>

        {/* Brief Section */}
        <div className="mb-lg">
          <ProjectBrief
            project={selectedProject}
            assignees={assignees}
            onEdit={() => setIsBriefEditorOpen(true)}
          />
        </div>

        {/* Roadmap Timeline */}
        <ProjectRoadmap
          projectId={selectedProject.id}
          timelines={timelines || []}
          milestones={milestones || []}
          taskStats={taskStats || []}
          onAddPhase={handleAddPhase}
          onEditPhase={handleEditPhase}
          onDeletePhase={handleDeletePhase}
        />

        {/* Dialogs */}
        <ProjectBriefEditor
          open={isBriefEditorOpen}
          onOpenChange={setIsBriefEditorOpen}
          project={selectedProject}
          onSave={handleUpdateProject}
        />

        <ProjectPhaseEditor
          open={isPhaseEditorOpen}
          onOpenChange={setIsPhaseEditorOpen}
          phase={editingPhase}
          projectId={selectedProject.id}
          onSave={handleSavePhase}
        />

        <ProjectShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          project={selectedProject}
        />

        {/* Delete Project Confirmation */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedProject.name}"? This action cannot be undone.
                All phases and milestones will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Phase Confirmation */}
        <AlertDialog open={phaseDeleteConfirmOpen} onOpenChange={setPhaseDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Phase</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this phase? All milestones in this phase will also be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeletePhase} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContainer>
    );
  }

  // =============================================
  // PROJECT LIST VIEW
  // =============================================
  return (
    <PageContainer size="wide">
      <PageHeader
        title="Projects"
        description="Manage projects with roadmaps and linked tasks"
        actions={
          isAdmin ? (
            <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-xs">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          ) : undefined
        }
      />

      {/* Search Bar */}
      {projects && projects.length > 0 && (
        <div className="relative max-w-md mb-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-lg"
          />
        </div>
      )}

      {/* Project Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              taskCount={projectCardData[project.id]?.taskCount || 0}
              completedTasks={projectCardData[project.id]?.completedTasks || 0}
              onClick={() => setSelectedProject(project)}
            />
          ))}
          
          {/* Create New Project Card */}
          {isAdmin && (
            <Card
              interactive
              onClick={() => setIsCreateDialogOpen(true)}
              className="flex flex-col items-center justify-center p-lg min-h-[200px] border-dashed cursor-pointer group hover-lift"
            >
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted group-hover:bg-primary/10 transition-smooth mb-md">
                <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-smooth" />
              </div>
              <span className="text-body-sm font-medium text-muted-foreground group-hover:text-foreground transition-smooth">
                Create New Project
              </span>
            </Card>
          )}
        </div>
      ) : projects && projects.length > 0 ? (
        // Search returned no results
        <div className="text-center py-section">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-md" />
          <h2 className="text-heading-sm font-semibold text-foreground mb-xs">
            No projects found
          </h2>
          <p className="text-muted-foreground mb-md">
            Try adjusting your search query
          </p>
          <Button variant="outline" onClick={() => setSearchQuery("")}>
            Clear search
          </Button>
        </div>
      ) : (
        // Empty state - no projects at all
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to start tracking work with roadmaps and linked tasks"
          action={
            isAdmin
              ? {
                  label: "Create First Project",
                  onClick: () => setIsCreateDialogOpen(true),
                }
              : undefined
          }
        />
      )}

      {/* Create Project Dialog */}
      <ProjectCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSave={handleCreateProject}
      />
    </PageContainer>
  );
}
