import { useState, useMemo, useEffect } from "react";
import { Plus, Search, FolderKanban, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Project, useProjects } from "@/hooks/useProjects";
import { ProjectPageContent, ProjectPageEditor, ProjectCard } from "@/components/projects";
import { ProjectShareDialog } from "@/components/projects/ProjectShareDialog";
import { EmptyState } from "@/components/layout/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";

export default function Projects() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { projects, tree, isLoading, error: projectsError, createProject, updateProject, deleteProject, ensurePublicToken, togglePublic } =
    useProjects();

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const isAdmin = true;

  // Keep selectedProject in sync with query data
  useEffect(() => {
    if (selectedProject && projects) {
      const freshProject = projects.find(p => p.id === selectedProject.id);
      if (freshProject && (
        freshProject.is_public !== selectedProject.is_public ||
        freshProject.public_token !== selectedProject.public_token ||
        freshProject.name !== selectedProject.name ||
        freshProject.status !== selectedProject.status
      )) {
        setSelectedProject(freshProject);
      }
    }
  }, [projects, selectedProject]);

  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    if (!searchQuery.trim()) return projects;
    
    return projects.filter(project => 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.purpose?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [projects, searchQuery]);

  // Build breadcrumbs for selected project
  const breadcrumbs = useMemo(() => {
    if (!selectedProject || !projects) return [];

    const crumbs: Project[] = [];
    let current: Project | undefined = selectedProject;

    while (current) {
      crumbs.unshift(current);
      current = projects.find((p) => p.id === current!.parent_id);
    }

    return crumbs;
  }, [selectedProject, projects]);

  const handleCreateProject = (parentId: string | null = null) => {
    setEditingProject(null);
    setParentIdForNew(parentId);
    setIsEditorOpen(true);
  };

  const handleEditProject = () => {
    if (selectedProject) {
      setEditingProject(selectedProject);
      setParentIdForNew(null);
      setIsEditorOpen(true);
    }
  };

  const handleDeleteProject = () => {
    if (selectedProject) {
      setProjectToDelete(selectedProject);
      setDeleteConfirmOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (projectToDelete) {
      await deleteProject.mutateAsync(projectToDelete.id);
      setSelectedProject(null);
      setProjectToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  const handleSave = async (data: Partial<Project>) => {
    if (data.id) {
      await updateProject.mutateAsync(data as Project & { id: string });
      const updated = projects?.find((p) => p.id === data.id);
      if (updated) setSelectedProject({ ...updated, ...data });
    } else {
      const newProject = await createProject.mutateAsync(data as Project & { name: string });
      setSelectedProject(newProject as Project);
    }
  };

  const handleNavigate = async (project: Project) => {
    setSelectedProject(project);
    if (project.is_public && !project.public_token) {
      await ensurePublicToken.mutateAsync(project.id);
    }
  };

  const handleBackToList = () => {
    setSelectedProject(null);
  };

  const handleShare = async () => {
    if (!selectedProject) return;
    setShareDialogOpen(true);
  };

  // Share dialog is now handled by ProjectShareDialog component

  // Wait for auth to resolve first
  if (authLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageContainer>
    );
  }

  // Handle error state
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

  // PROJECT DETAIL VIEW
  if (selectedProject) {
    return (
      <PageContainer size="wide">
        {/* Back button header */}
        <div className="flex items-center gap-md mb-lg">
          <Button 
            variant="ghost" 
            onClick={handleBackToList}
            className="gap-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        </div>

        <ProjectPageContent
          project={selectedProject}
          breadcrumbs={breadcrumbs}
          onEdit={handleEditProject}
          onDelete={handleDeleteProject}
          onShare={handleShare}
          isAdmin={isAdmin}
        />

        {/* Editor Dialog */}
        <ProjectPageEditor
          open={isEditorOpen}
          onOpenChange={setIsEditorOpen}
          project={editingProject}
          parentId={parentIdForNew}
          onSave={handleSave}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone.
                Any child projects will become top-level projects.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Share Dialog - Using unified system */}
        {selectedProject && (
          <ProjectShareDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            project={selectedProject}
          />
        )}
      </PageContainer>
    );
  }

  // PROJECT LIST VIEW
  return (
    <PageContainer size="wide">
      <PageHeader
        title="Projects"
        description="Manage projects with roadmaps and linked tasks"
        actions={
          isAdmin ? (
            <Button onClick={() => handleCreateProject()} className="gap-xs">
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
              onClick={() => handleNavigate(project)}
            />
          ))}
          
          {/* Create New Project Card */}
          {isAdmin && (
            <Card
              interactive
              onClick={() => handleCreateProject()}
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
                  onClick: () => handleCreateProject(),
                }
              : undefined
          }
        />
      )}

      {/* Editor Dialog */}
      <ProjectPageEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        project={editingProject}
        parentId={parentIdForNew}
        onSave={handleSave}
      />
    </PageContainer>
  );
}
