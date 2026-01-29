import { useState, useMemo } from "react";
import { BookOpen, Plus, Search, FileText, ChevronRight, Home } from "lucide-react";
import { PageContainer, PageHeader, DataCard, EmptyState } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { KnowledgeTree } from "@/components/knowledge/KnowledgeTree";
import { KnowledgePageEditor } from "@/components/knowledge/KnowledgePageEditor";
import { KnowledgePageContent } from "@/components/knowledge/KnowledgePageContent";
import { useKnowledgePages, KnowledgePage } from "@/hooks/useKnowledgePages";
import { useAuth } from "@/hooks/useAuth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Knowledge() {
  const { userRole, loading: authLoading } = useAuth();
  const isAdmin = userRole === "admin";
  const { pages, pageTree, isLoading, isError, createPage, updatePage, deletePage, togglePublic, ensurePublicToken } = useKnowledgePages();

  const [selectedPage, setSelectedPage] = useState<KnowledgePage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<KnowledgePage | null>(null);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<KnowledgePage | null>(null);

  // Filter pages for search
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return pageTree;
    
    const query = searchQuery.toLowerCase();
    const filterPages = (pages: KnowledgePage[]): KnowledgePage[] => {
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
    
    const crumbs: KnowledgePage[] = [];
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

  const handleSave = (data: { title: string; content: string; parent_id: string | null; icon: string }) => {
    if (editingPage) {
      updatePage.mutate({ id: editingPage.id, ...data }, {
        onSuccess: (updatedPage) => {
          setSelectedPage(updatedPage as KnowledgePage);
          setEditorOpen(false);
        },
      });
    } else {
      createPage.mutate(data, {
        onSuccess: (newPage) => {
          setSelectedPage(newPage as KnowledgePage);
          setEditorOpen(false);
        },
      });
    }
  };

  const handleNavigate = (page: KnowledgePage | null) => {
    // Handle navigating to home (no selection)
    if (!page || !page.id) {
      setSelectedPage(null);
      return;
    }

    // Find the full page object from pages array to ensure we have full content
    const fullPage = pages?.find((p) => p.id === page.id);

    // Also attach children from pageTree
    const findWithChildren = (tree: KnowledgePage[]): KnowledgePage | undefined => {
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
      
      // Auto-generate public token if not present
      if (!fullPage.public_token) {
        ensurePublicToken.mutate(fullPage.id, {
          onSuccess: (updatedPage) => {
            if (updatedPage) {
              setSelectedPage({
                ...pageWithChildren,
                ...updatedPage,
              });
            }
          },
        });
      }
      return;
    }

    setSelectedPage(treeNode || page);
    
    // Auto-generate public token for tree node
    if (treeNode && !treeNode.public_token) {
      ensurePublicToken.mutate(treeNode.id, {
        onSuccess: (updatedPage) => {
          if (updatedPage) {
            setSelectedPage((prev) => prev ? { ...prev, ...updatedPage } : prev);
          }
        },
      });
    }
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
          <p className="text-muted-foreground">Could not load knowledge base.</p>
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
        icon={BookOpen}
        title="Knowledge Base"
        description="Documentation, processes, and guides"
        actions={
          <Button onClick={() => handleCreatePage(null)} className="rounded-full px-6 h-10 gap-2">
            <Plus className="h-4 w-4" />
            New Page
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
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto hide-scrollbar p-xs">
            <KnowledgeTree
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
            <KnowledgePageContent
              page={selectedPage}
              breadcrumbs={breadcrumbs.slice(0, -1)}
              onEdit={handleEditPage}
              onDelete={isAdmin ? handleDeletePage : undefined}
              onNavigate={handleNavigate}
              isAdmin={isAdmin}
            />
          ) : pages && pages.length > 0 ? (
            <div className="p-lg">
              <h2 className="text-heading-lg font-semibold text-foreground mb-2">
                Welcome to Knowledge Base
              </h2>
              <p className="text-muted-foreground mb-lg">
                Browse documentation, processes, and guides. Select a page to get started.
              </p>
              
              <div className="space-y-2">
                {pageTree.map((page) => (
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
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-body font-medium text-foreground truncate">
                        {page.title}
                      </h3>
                      {page.children && page.children.length > 0 && (
                        <p className="text-metadata text-muted-foreground">
                          {page.children.length} sub-page{page.children.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="Welcome to Knowledge Base"
              description="Get started by creating your first page."
              action={
                { label: "Create First Page", onClick: () => handleCreatePage(null) }
              }
            />
          )}
        </DataCard>
      </div>

      {/* Editor Dialog */}
      <KnowledgePageEditor
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
            <AlertDialogTitle>Delete Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{pageToDelete?.title}"? This action cannot be undone.
              {pageToDelete?.children && pageToDelete.children.length > 0 && (
                <span className="block mt-2 text-warning">
                  Warning: This page has {pageToDelete.children.length} sub-page(s) that will become root pages.
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
