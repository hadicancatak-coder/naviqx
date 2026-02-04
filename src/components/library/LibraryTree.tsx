import { useState } from "react";
import { ChevronRight, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LibraryPage, LibraryCategory, LIBRARY_CATEGORIES } from "@/hooks/useLibraryPages";
import { Badge } from "@/components/ui/badge";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { lazy, Suspense } from "react";

// Dynamic icon component
function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const iconName = name as keyof typeof dynamicIconImports;
  if (!dynamicIconImports[iconName]) {
    const FallbackIcon = lazy(dynamicIconImports['file-text']);
    return (
      <Suspense fallback={<div className={cn("h-4 w-4", className)} />}>
        <FallbackIcon className={className} />
      </Suspense>
    );
  }
  const LucideIcon = lazy(dynamicIconImports[iconName]);
  return (
    <Suspense fallback={<div className={cn("h-4 w-4", className)} />}>
      <LucideIcon className={className} />
    </Suspense>
  );
}

interface LibraryTreeProps {
  pages: LibraryPage[];
  selectedPageId: string | null;
  onSelectPage: (page: LibraryPage) => void;
  onCreatePage?: (parentId: string | null) => void;
  isAdmin?: boolean;
  showCategory?: boolean;
}

interface TreeNodeProps {
  page: LibraryPage;
  level: number;
  selectedPageId: string | null;
  onSelectPage: (page: LibraryPage) => void;
  onCreatePage?: (parentId: string | null) => void;
  isAdmin?: boolean;
  showCategory?: boolean;
}

const categoryColors: Record<LibraryCategory, string> = {
  knowledge: "bg-info/10 text-info-text",
  service: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  project: "bg-primary/10 text-primary",
  rules: "bg-warning/10 text-warning-text",
  process: "bg-success/10 text-success-text",
};

function TreeNode({ page, level, selectedPageId, onSelectPage, onCreatePage, isAdmin, showCategory }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = page.children && page.children.length > 0;
  const isSelected = selectedPageId === page.id;
  const iconName = page.icon || 'file-text';
  const categoryInfo = LIBRARY_CATEGORIES.find(c => c.value === page.category);

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-smooth group",
          isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
        )}
        style={{ paddingLeft: `${12 + level * 16}px` }}
        onClick={() => onSelectPage(page)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-0.5 hover:bg-muted rounded"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}
        
        <DynamicIcon name={iconName} className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
        <span className="text-body-sm truncate flex-1">{page.title}</span>
        
        {showCategory && categoryInfo && (
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", categoryColors[page.category])}>
            {categoryInfo.label}
          </Badge>
        )}
        
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onCreatePage?.(page.id);
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      {hasChildren && expanded && (
        <div>
          {page.children!.map((child) => (
            <TreeNode
              key={child.id}
              page={child}
              level={level + 1}
              selectedPageId={selectedPageId}
              onSelectPage={onSelectPage}
              onCreatePage={onCreatePage}
              isAdmin={isAdmin}
              showCategory={showCategory}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function LibraryTree({ pages, selectedPageId, onSelectPage, onCreatePage, isAdmin, showCategory }: LibraryTreeProps) {
  return (
    <div className="space-y-1">
      {pages.map((page) => (
        <TreeNode
          key={page.id}
          page={page}
          level={0}
          selectedPageId={selectedPageId}
          onSelectPage={onSelectPage}
          onCreatePage={onCreatePage}
          isAdmin={isAdmin}
          showCategory={showCategory}
        />
      ))}
      
      {pages.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-body-sm">
          No pages yet
        </div>
      )}
    </div>
  );
}
