import { useState, useMemo } from "react";
import { Plus, Search, FolderKanban } from "lucide-react";
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
import { ProjectTree, ProjectPageContent, ProjectPageEditor } from "@/components/projects";
import { EmptyState } from "@/components/layout/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { APP_BASE_URL } from "@/lib/constants";
import { Label } from "@/components/ui/label";

export default function Projects() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { projects, tree, isLoading, createProject, updateProject, deleteProject, ensurePublicToken, togglePublic } =
    useProjects();

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [parentIdForNew, setParentIdForNew] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // Check if user is admin
  const isAdmin = true; // You can replace with actual admin check

  // Filter tree based on search
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return tree;

    const filterNodes = (nodes: Project[]): Project[] => {
      return nodes.reduce<Project[]>((acc, node) => {
        const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase());
        const filteredChildren = node.children ? filterNodes(node.children) : [];

        if (matchesSearch || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : node.children,
          });
        }

        return acc;
      }, []);
    };

    return filterNodes(tree);
  }, [tree, searchQuery]);

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
      // Refresh selected project
      const updated = projects?.find((p) => p.id === data.id);
      if (updated) setSelectedProject({ ...updated, ...data });
    } else {
      const newProject = await createProject.mutateAsync(data as Project & { name: string });
      setSelectedProject(newProject as Project);
    }
  };

  const handleNavigate = async (project: Project) => {
    setSelectedProject(project);
    // Ensure public token exists when navigating
    if (project.is_public && !project.public_token) {
      await ensurePublicToken.mutateAsync(project.id);
    }
  };

  const handleShare = async () => {
    if (!selectedProject) return;
    setShareDialogOpen(true);
  };

  const handleTogglePublic = async (isPublic: boolean) => {
    if (!selectedProject) return;

    if (isPublic) {
      const token = await ensurePublicToken.mutateAsync(selectedProject.id);
      // Immediately update selectedProject with the returned token
      setSelectedProject({ ...selectedProject, is_public: true, public_token: token });
    } else {
      await togglePublic.mutateAsync({ id: selectedProject.id, isPublic: false });
      setSelectedProject({ ...selectedProject, is_public: false });
    }
  };

  const copyPublicLink = () => {
    if (selectedProject?.public_token) {
      const url = `${APP_BASE_URL}/projects/public/${selectedProject.public_token}`;
      navigator.clipboard.writeText(url);
      toast({ title: "Link copied to clipboard" });
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="wide">
      <PageHeader
        title="Projects"
        description="Manage projects with roadmaps and linked tasks"
        actions={
          isAdmin ? (
            <Button onClick={() => handleCreateProject()}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-12 gap-lg mt-lg">
        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-3">
          <div className="bg-card border border-border rounded-xl p-md space-y-md sticky top-20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <ProjectTree
              pages={filteredTree}
              selectedPageId={selectedProject?.id || null}
              onSelectPage={handleNavigate}
              onCreatePage={handleCreateProject}
              isAdmin={isAdmin}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="col-span-12 lg:col-span-9">
          <div className="bg-card border border-border rounded-xl p-lg min-h-[600px]">
            {selectedProject ? (
              <ProjectPageContent
                project={selectedProject}
                breadcrumbs={breadcrumbs}
                onEdit={handleEditProject}
                onDelete={handleDeleteProject}
                onShare={handleShare}
                isAdmin={isAdmin}
              />
            ) : projects && projects.length > 0 ? (
              <div className="text-center py-12">
                <FolderKanban className="h-16 w-16 text-muted-foreground mx-auto mb-md" />
                <h2 className="text-heading-md font-semibold text-foreground mb-2">
                  Select a project
                </h2>
                <p className="text-muted-foreground mb-lg">
                  Choose a project from the sidebar to view its details and roadmap
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {projects.slice(0, 5).map((p) => (
                    <Button key={p.id} variant="outline" size="sm" onClick={() => handleNavigate(p)}>
                      {p.name}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
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
          </div>
        </div>
      </div>

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

      {/* Share Dialog */}
      <AlertDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Share Project</AlertDialogTitle>
            <AlertDialogDescription>
              Control external access to this project page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-md space-y-md">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-body font-medium">Public Access</Label>
                <p className="text-metadata text-muted-foreground">
                  Anyone with the link can view this project
                </p>
              </div>
              <Switch
                checked={selectedProject?.is_public || false}
                onCheckedChange={handleTogglePublic}
              />
            </div>
            {selectedProject?.is_public && selectedProject.public_token && (
              <div className="space-y-2">
                <Label className="text-body-sm">Public Link</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${APP_BASE_URL}/projects/public/${selectedProject.public_token}`}
                    className="text-body-sm"
                  />
                  <Button variant="outline" onClick={copyPublicLink}>
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
