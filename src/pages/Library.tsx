import { useState, useMemo } from "react";
import { Library as LibraryIcon, Plus, Search, ChevronRight, Filter } from "lucide-react";
import { lazy, Suspense } from "react";
import { PageContainer, PageHeader, DataCard, EmptyState } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { LibraryTree, LibraryPageEditor, LibraryPageContent } from "@/components/library";
import { useLibraryPages, LibraryPage, LibraryCategory, LIBRARY_CATEGORIES } from "@/hooks/useLibraryPages";
import { useAuth } from "@/hooks/useAuth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import dynamicIconImports from "lucide-react/dynamicIconImports";

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const iconName = name as keyof typeof dynamicIconImports;
  if (!dynamicIconImports[iconName]) {
    const FallbackIcon = lazy(dynamicIconImports['file-text']);
    return (
      <Suspense fallback={<div className={cn("h-5 w-5", className)} />}>
        <FallbackIcon className={className} />
      </Suspense>
    );
  }
  const LucideIcon = lazy(dynamicIconImports[iconName]);
  return (
    <Suspense fallback={<div className={cn("h-5 w-5", className)} />}>
      <LucideIcon className={className} />
    </Suspense>
  );
}

const categoryColors: Record<LibraryCategory, string> = {
  knowledge: "bg-info/10 text-info-text border-info/30",
  service: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  project: "bg-primary/10 text-primary border-primary/30",
  rules: "bg-warning/10 text-warning-text border-warning/30",
  process: "bg-success/10 text-success-text border-success/30",
};

export default function Library() {
  const { userRole, loading: authLoading } = useAuth();
  const isAdmin = userRole === "admin";
  
  const [activeCategory, setActiveCategory] = useState<LibraryCategory | 'all'>('all');
  const { pages, pageTree, isLoading, isError, createPage, updatePage, deletePage, ensurePublicToken } = useLibraryPages(
    activeCategory === 'all' ? null : activeCategory
  );

  const [selectedPage, setSelectedPage] = useState<LibraryPage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<LibraryPage | null>(null);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<LibraryPage | null>(null);

  // Filter pages for search
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return pageTree;
    
    const query = searchQuery.toLowerCase();
    const filterPages = (pages: LibraryPage[]): LibraryPage[] => {
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
    
    const crumbs: LibraryPage[] = [];
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
    category: LibraryCategory;
    project_id: string | null;
  }) => {
    if (editingPage) {
      updatePage.mutate({ id: editingPage.id, ...data }, {
        onSuccess: (updatedPage) => {
          setSelectedPage(updatedPage as LibraryPage);
          setEditorOpen(false);
        },
      });
    } else {
      createPage.mutate(data, {
        onSuccess: (newPage) => {
          setSelectedPage(newPage as LibraryPage);
          setEditorOpen(false);
        },
      });
    }
  };

  const handleNavigate = (page: LibraryPage | null) => {
    if (!page || !page.id) {
      setSelectedPage(null);
      return;
    }

    const fullPage = pages?.find((p) => p.id === page.id);

    const findWithChildren = (tree: LibraryPage[]): LibraryPage | undefined => {
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

  if (authLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center h-96 gap-md">
          <p className="text-muted-foreground">Could not load library.</p>
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
        icon={LibraryIcon}
        title="Library"
        description="Knowledge, services, projects, rules, and processes"
        actions={
          <Button onClick={() => handleCreatePage(null)} className="rounded-full px-lg h-10 gap-xs">
            <Plus className="h-4 w-4" />
            New Page
          </Button>
        }
      />

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as LibraryCategory | 'all')} className="mb-lg">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all" className="gap-xs">
            <Filter className="h-4 w-4" />
            All
          </TabsTrigger>
          {LIBRARY_CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value} className="gap-xs">
              <DynamicIcon name={cat.icon} className="h-4 w-4" />
              <span className="hidden sm:inline">{cat.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-[280px_1fr] gap-lg min-h-[600px]">
        {/* Sidebar */}
        <DataCard className="h-fit max-h-[calc(100vh-280px)] overflow-hidden flex flex-col">
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
            <LibraryTree
              pages={filteredTree}
              selectedPageId={selectedPage?.id || null}
              onSelectPage={handleNavigate}
              onCreatePage={handleCreatePage}
              isAdmin={isAdmin}
              showCategory={activeCategory === 'all'}
            />
          </div>
        </DataCard>

        {/* Content */}
        <DataCard className="min-h-[600px]">
          {selectedPage ? (
            <LibraryPageContent
              page={selectedPage}
              breadcrumbs={breadcrumbs}
              onEdit={handleEditPage}
              onDelete={isAdmin ? handleDeletePage : undefined}
              onNavigate={handleNavigate}
              isAdmin={isAdmin}
            />
          ) : pages && pages.length > 0 ? (
            <div className="p-lg">
              <h2 className="text-heading-lg font-semibold text-foreground mb-xs">
                Welcome to the Library
              </h2>
              <p className="text-muted-foreground mb-lg">
                Browse documentation, services, projects, rules, and processes. Select a page to get started.
              </p>
              
              {/* Category Cards */}
              <div className="grid grid-cols-2 gap-md mb-lg">
                {LIBRARY_CATEGORIES.map((cat) => {
                  const count = pages?.filter(p => p.category === cat.value).length || 0;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => setActiveCategory(cat.value)}
                      className={cn(
                        "flex items-center gap-md p-md rounded-xl border transition-smooth hover-lift text-left",
                        categoryColors[cat.value]
                      )}
                    >
                      <DynamicIcon name={cat.icon} className="h-8 w-8" />
                      <div>
                        <h3 className="text-body font-semibold">{cat.label}</h3>
                        <p className="text-metadata opacity-80">{count} pages</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {/* Recent pages */}
              <h3 className="text-heading-sm font-semibold text-foreground mb-sm">All Pages</h3>
              <div className="space-y-xs">
                {pageTree.slice(0, 10).map((page) => (
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
                      <DynamicIcon name={page.icon || 'file-text'} className="h-5 w-5 text-primary" />
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
                    <Badge variant="outline" className={cn("text-metadata shrink-0", categoryColors[page.category])}>
                      {LIBRARY_CATEGORIES.find(c => c.value === page.category)?.label}
                    </Badge>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={LibraryIcon}
              title="Welcome to the Library"
              description="Get started by creating your first page."
              action={
                { label: "Create First Page", onClick: () => handleCreatePage(null) }
              }
            />
          )}
        </DataCard>
      </div>

      {/* Editor Dialog */}
      <LibraryPageEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        page={editingPage}
        parentId={createParentId}
        defaultCategory={activeCategory === 'all' ? 'knowledge' : activeCategory}
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
                <span className="block mt-xs text-warning">
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
