import { useState, useMemo } from "react";
import { Server, Plus, Search, ChevronRight } from "lucide-react";
import { PageContainer, PageHeader, DataCard, EmptyState } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TechStackTree } from "@/components/techstack/TechStackTree";
import { TechStackPageEditor } from "@/components/techstack/TechStackPageEditor";
import { TechStackPageContent } from "@/components/techstack/TechStackPageContent";
import { useTechStackPages, TechStackPage } from "@/hooks/useTechStackPages";
import { useAuth } from "@/hooks/useAuth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import * as LucideIcons from "lucide-react";

export default function TechStack() {
  const { userRole, loading: authLoading } = useAuth();
  const isAdmin = userRole === "admin";
  const { pages, pageTree, isLoading, isError, createPage, updatePage, deletePage } = useTechStackPages();

  const [selectedPage, setSelectedPage] = useState<TechStackPage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<TechStackPage | null>(null);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<TechStackPage | null>(null);

  // Filter pages for search
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return pageTree;
    
    const query = searchQuery.toLowerCase();
    const filterPages = (pages: TechStackPage[]): TechStackPage[] => {
      return pages
        .map(page => ({
          ...page,
          children: page.children ? filterPages(page.children) : [],
        }))
        .filter(page => 
          page.title.toLowerCase().includes(query) ||
          page.content?.toLowerCase().includes(query) ||
          (page.children && page.children.length > 0)
        );
    };
    
    return filterPages(pageTree);
  }, [pageTree, searchQuery]);

  // Build breadcrumbs for selected page
  const breadcrumbs = useMemo(() => {
    if (!selectedPage || !pages) return [];
    
    const crumbs: TechStackPage[] = [];
    let currentId = selectedPage.parent_id;
    
    while (currentId) {
      const parent = pages.find(p => p.id === currentId);
      if (parent) {
        crumbs.unshift(parent);
        currentId = parent.parent_id;
      } else {
        break;
      }
    }
    
    crumbs.push(selectedPage);
    return crumbs;
  }, [selectedPage, pages]);

  const handleCreatePage = (parentId: string | null) => {
    setEditingPage(null);
    setCreateParentId(parentId);
    setEditorOpen(true);
  };

  const handleEditPage = () => {
    if (selectedPage) {
      setEditingPage(selectedPage);
      setCreateParentId(null);
      setEditorOpen(true);
    }
  };

  const handleDeletePage = () => {
    if (selectedPage) {
      setPageToDelete(selectedPage);
      setDeleteDialogOpen(true);
    }
  };

  const confirmDelete = () => {
    if (pageToDelete) {
      deletePage.mutate(pageToDelete.id);
      setSelectedPage(null);
      setPageToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleSave = (data: { 
    title: string; 
    content: string; 
    parent_id: string | null; 
    icon: string;
    integrated_at: string | null;
    status: string | null;
    owner_id: string | null;
  }) => {
    if (editingPage) {
      updatePage.mutate({ id: editingPage.id, ...data }, {
        onSuccess: (updatedPage) => {
          setSelectedPage(updatedPage as TechStackPage);
          setEditorOpen(false);
        },
      });
    } else {
      createPage.mutate(data, {
        onSuccess: (newPage) => {
          setSelectedPage(newPage as TechStackPage);
          setEditorOpen(false);
        },
      });
    }
  };

  const handleNavigate = (page: TechStackPage | null) => {
    if (!page || !page.id) {
      setSelectedPage(null);
      return;
    }

    const fullPage = pages?.find((p) => p.id === page.id);

    const findWithChildren = (tree: TechStackPage[]): TechStackPage | undefined => {
      for (const node of tree) {
        if (node.id === page.id) return node;
        if (node.children) {
          const found = findWithChildren(node.children);
          if (found) return found;
        }
      }
      return undefined;
    };

    const treeNode = findWithChildren(pageTree);

    if (fullPage) {
      const pageWithChildren = {
        ...fullPage,
        children: treeNode?.children || fullPage.children,
      };
      setSelectedPage(pageWithChildren);
      return;
    }

    setSelectedPage(treeNode || page);
  };

  // Wait for auth to resolve first
  if (authLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageContainer>
    );
  }

  // Handle error state
  if (isError) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center h-96 gap-md">
          <p className="text-muted-foreground">Could not load tech stack.</p>
        </div>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="wide">
      <PageHeader
        icon={Server}
        title="Tech Stack"
        description="Services, tools, and technologies we use"
        actions={
          <Button onClick={() => handleCreatePage(null)} className="rounded-full px-lg h-10 gap-xs">
            <Plus className="h-4 w-4" />
            Add Tech
          </Button>
        }
      />

      <div className="grid grid-cols-[280px_1fr] gap-lg min-h-[600px]">
        {/* Sidebar */}
        <DataCard className="h-fit max-h-[calc(100vh-200px)] overflow-hidden flex flex-col">
          <div className="p-sm border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tech stack..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto hide-scrollbar p-xs">
            <TechStackTree
              pages={filteredTree}
              selectedPageId={selectedPage?.id || null}
              onSelectPage={handleNavigate}
              onCreatePage={handleCreatePage}
              isAdmin={isAdmin}
            />
          </div>
        </DataCard>

        {/* Content */}
        <DataCard className="min-h-[600px]">
          {selectedPage ? (
            <TechStackPageContent
              page={selectedPage}
              breadcrumbs={breadcrumbs.slice(0, -1)}
              onEdit={handleEditPage}
              onDelete={isAdmin ? handleDeletePage : undefined}
              onNavigate={handleNavigate}
              isAdmin={isAdmin}
            />
          ) : pages && pages.length > 0 ? (
            <div className="p-lg">
              <h2 className="text-heading-lg font-semibold text-foreground mb-xs">
                Our Tech Stack
              </h2>
              <p className="text-muted-foreground mb-lg">
                Browse the technologies, services, and tools we use. Select an item to learn more.
              </p>
              
              <div className="space-y-xs">
                {pageTree.map((page) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const IconComponent = (LucideIcons as any)[
                    (page.icon || 'server').split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('')
                  ] || Server;
                  
                  return (
                    <button
                      key={page.id}
                      onClick={() => handleNavigate(page)}
                      className={cn(
                        "w-full flex items-center gap-sm p-md rounded-xl",
                        "bg-card hover:bg-card-hover border border-border",
                        "text-left transition-smooth hover-lift"
                      )}
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-body font-medium text-foreground truncate">
                          {page.title}
                        </h3>
                        {page.children && page.children.length > 0 && (
                          <p className="text-metadata text-muted-foreground">
                            {page.children.length} item{page.children.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Server}
              title="No Tech Stack Items"
              description="Add technologies and services you use to document your tech stack."
              action={
                { label: "Add First Item", onClick: () => handleCreatePage(null) }
              }
            />
          )}
        </DataCard>
      </div>

      {/* Editor Dialog */}
      <TechStackPageEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        page={editingPage}
        parentId={createParentId}
        allPages={pages || []}
        onSave={handleSave}
        isLoading={createPage.isPending || updatePage.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{pageToDelete?.title}"? This action cannot be undone.
              {pageToDelete?.children && pageToDelete.children.length > 0 && (
                <span className="block mt-xs text-warning">
                  Warning: This item has {pageToDelete.children.length} sub-item(s) that will become root items.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
