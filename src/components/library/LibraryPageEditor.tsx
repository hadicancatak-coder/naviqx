import { useState, useEffect, lazy, Suspense } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { LibraryPage, LibraryCategory, LIBRARY_CATEGORIES } from "@/hooks/useLibraryPages";
import { useProjects } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import dynamicIconImports from "lucide-react/dynamicIconImports";

// Popular icons for quick selection
const POPULAR_ICONS = [
  "file-text", "book-open", "folder", "server", "database", "code", "terminal",
  "globe", "link", "settings", "shield", "lock", "key", "users", "user",
  "building-2", "briefcase", "chart-bar", "trending-up", "target",
  "lightbulb", "zap", "star", "heart", "flag", "bookmark",
  "check-circle", "alert-circle", "info", "help-circle",
  "file-code", "file-json", "git-branch", "github", "package",
  "cloud", "cpu", "hard-drive", "wifi", "smartphone",
  "mail", "message-circle", "bell", "calendar", "clock",
  "map", "compass", "navigation", "home", "layers",
  "image", "video", "music", "camera", "mic",
  "search", "filter", "list", "grid", "table",
  "pen-tool", "edit", "trash-2", "copy", "clipboard",
  "download", "upload", "share-2", "external-link", "arrow-right",
  "workflow", "git-merge", "scale", "scroll", "book-marked",
];

// Dynamic icon component
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

interface LibraryPageEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page?: LibraryPage | null;
  parentId?: string | null;
  defaultCategory?: LibraryCategory;
  allPages: LibraryPage[];
  onSave: (data: { 
    title: string; 
    content: string; 
    parent_id: string | null; 
    icon: string; 
    category: LibraryCategory;
    project_id: string | null;
  }) => void;
  isLoading?: boolean;
}

export function LibraryPageEditor({
  open,
  onOpenChange,
  page,
  parentId,
  defaultCategory = 'knowledge',
  allPages,
  onSave,
  isLoading,
}: LibraryPageEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [icon, setIcon] = useState("file-text");
  const [category, setCategory] = useState<LibraryCategory>(defaultCategory);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [iconSearch, setIconSearch] = useState("");

  const { projects } = useProjects();

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    (async () => {
      if (!page?.id) {
        setTitle("");
        setContent("");
        setSelectedParentId(parentId || null);
        setIcon("file-text");
        setCategory(defaultCategory);
        setProjectId(null);
        return;
      }

      const { data, error } = await supabase
        .from("knowledge_pages")
        .select("title, content, parent_id, icon, category, project_id")
        .eq("id", page.id)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        toast.error("Failed to load page content");
        setTitle(page.title || "");
        setContent(page.content || "");
        setSelectedParentId(page.parent_id || null);
        setIcon(page.icon || "file-text");
        setCategory((page.category as LibraryCategory) || "knowledge");
        setProjectId(page.project_id || null);
        return;
      }

      setTitle(data.title || "");
      setContent(data.content || "");
      setSelectedParentId(data.parent_id || null);
      setIcon(data.icon || "file-text");
      setCategory((data.category as LibraryCategory) || "knowledge");
      setProjectId(data.project_id || null);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, page?.id, parentId, defaultCategory]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      content,
      parent_id: selectedParentId,
      icon,
      category,
      project_id: category === 'project' ? projectId : null,
    });
  };

  const getDescendantIds = (pageId: string): string[] => {
    const descendants: string[] = [pageId];
    const findChildren = (id: string) => {
      allPages.filter(p => p.parent_id === id).forEach(child => {
        descendants.push(child.id);
        findChildren(child.id);
      });
    };
    findChildren(pageId);
    return descendants;
  };

  const excludedIds = page ? getDescendantIds(page.id) : [];
  const parentOptions = allPages.filter(p => !excludedIds.includes(p.id));

  // Filter icons by search
  const filteredIcons = iconSearch.trim() 
    ? POPULAR_ICONS.filter(i => i.includes(iconSearch.toLowerCase()))
    : POPULAR_ICONS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{page ? "Edit Page" : "Create Page"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-md py-md">
          {/* Title and Category */}
          <div className="grid grid-cols-[1fr_160px] gap-md">
            <div className="space-y-xs">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Page title..."
              />
            </div>

            <div className="space-y-xs">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as LibraryCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIBRARY_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <DynamicIcon name={cat.icon} className="h-4 w-4" />
                        <span>{cat.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project Link (only for project category) */}
          {category === 'project' && (
            <div className="space-y-xs">
              <Label>Linked Project</Label>
              <Select
                value={projectId || "none"}
                onValueChange={(v) => setProjectId(v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Link to a project..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked project</SelectItem>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Parent and Icon */}
          <div className="grid grid-cols-2 gap-md">
            <div className="space-y-xs">
              <Label>Parent Page</Label>
              <Select
                value={selectedParentId || "none"}
                onValueChange={(v) => setSelectedParentId(v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No parent (root page)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (root page)</SelectItem>
                  {parentOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-xs">
              <Label>Icon</Label>
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <DynamicIcon name={icon} className="h-5 w-5 text-foreground" />
                </div>
                <Input
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                  placeholder="Search icons..."
                  className="flex-1"
                />
              </div>
              <div className="grid grid-cols-10 gap-1 max-h-[120px] overflow-y-auto p-1 border border-border rounded-lg">
                {filteredIcons.slice(0, 60).map((iconName) => (
                  <Button
                    key={iconName}
                    variant={icon === iconName ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setIcon(iconName)}
                    title={iconName}
                  >
                    <DynamicIcon name={iconName} className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-xs">
            <Label>Content</Label>
            <div className="border border-border rounded-lg overflow-hidden min-h-[300px]">
              <RichTextEditor
                key={page?.id || "new"}
                value={content}
                onChange={setContent}
                placeholder="Write your page content here..."
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isLoading}>
            {page ? "Save Changes" : "Create Page"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
