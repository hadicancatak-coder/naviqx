import { useState } from "react";
import { ChevronRight, ChevronDown, FileText, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { KnowledgePage } from "@/hooks/useKnowledgePages";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Type-safe icon resolver
type LucideIconRecord = Record<string, LucideIcon>;

function resolveIcon(iconName: string): LucideIcon {
  const pascalCase = iconName
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
  const icons = LucideIcons as unknown as LucideIconRecord;
  return icons[pascalCase] || FileText;
}

interface KnowledgeTreeProps {
  pages: KnowledgePage[];
  selectedPageId: string | null;
  onSelectPage: (page: KnowledgePage) => void;
  onCreatePage?: (parentId: string | null) => void;
  isAdmin?: boolean;
}

interface TreeNodeProps {
  page: KnowledgePage;
  level: number;
  selectedPageId: string | null;
  onSelectPage: (page: KnowledgePage) => void;
  onCreatePage?: (parentId: string | null) => void;
  isAdmin?: boolean;
}

function TreeNode({ page, level, selectedPageId, onSelectPage, onCreatePage, isAdmin }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = page.children && page.children.length > 0;
  const isSelected = selectedPageId === page.id;

  // Dynamically get icon from lucide-react
  const iconName = page.icon || 'file-text';
  const IconComponent = resolveIcon(iconName);

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
        
        <IconComponent className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
        <span className="text-body-sm truncate flex-1">{page.title}</span>
        
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function KnowledgeTree({ pages, selectedPageId, onSelectPage, onCreatePage, isAdmin }: KnowledgeTreeProps) {
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
