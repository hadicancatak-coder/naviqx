import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Project } from "@/hooks/useProjects";
import * as LucideIcons from "lucide-react";

interface ProjectTreeProps {
  pages: Project[];
  selectedPageId: string | null;
  onSelectPage: (page: Project) => void;
  onCreatePage?: (parentId: string | null) => void;
  isAdmin?: boolean;
}

interface TreeNodeProps extends ProjectTreeProps {
  page: Project;
  level: number;
}

const statusColors: Record<string, string> = {
  planning: "text-info-text",
  active: "text-success-text",
  "on-hold": "text-warning-text",
  completed: "text-muted-foreground",
};

function TreeNode({ page, level, selectedPageId, onSelectPage, onCreatePage, isAdmin }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = page.children && page.children.length > 0;

  const iconName = page.icon || "folder-kanban";
  const iconKey = iconName.split("-").map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconKey] || LucideIcons.FolderKanban;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 rounded-lg cursor-pointer transition-smooth group",
          selectedPageId === page.id
            ? "bg-primary/10 text-primary"
            : "hover:bg-card-hover text-foreground"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelectPage(page)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 hover:bg-subtle rounded"
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform text-muted-foreground",
                isExpanded && "rotate-90"
              )}
            />
          </button>
        ) : (
          <span className="w-4" />
        )}
        <IconComponent className={cn("h-4 w-4", statusColors[page.status] || "text-muted-foreground")} />
        <span className="flex-1 truncate text-body-sm">{page.name}</span>
        {isAdmin && onCreatePage && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onCreatePage(page.id);
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>
      {isExpanded && hasChildren && (
        <div>
          {page.children!.map((child) => (
            <TreeNode
              key={child.id}
              page={child}
              pages={[]}
              level={level + 1}
              selectedPageId={selectedPageId}
              onSelectPage={onSelectPage}
              onCreatePage={onCreatePage}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProjectTree({ pages, selectedPageId, onSelectPage, onCreatePage, isAdmin }: ProjectTreeProps) {
  if (pages.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-body-sm">
        No projects yet
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {pages.map((page) => (
        <TreeNode
          key={page.id}
          page={page}
          pages={pages}
          level={0}
          selectedPageId={selectedPageId}
          onSelectPage={onSelectPage}
          onCreatePage={onCreatePage}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}
