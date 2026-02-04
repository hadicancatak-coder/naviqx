import { useState } from "react";
import { KnowledgePage } from "@/hooks/useKnowledgePages";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ChevronRight, Share2 } from "lucide-react";
import { format } from "date-fns";
import DOMPurify from "dompurify";
import * as LucideIcons from "lucide-react";
import { FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { KnowledgeShareDialog } from "./KnowledgeShareDialog";

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

interface KnowledgePageContentProps {
  page: KnowledgePage;
  breadcrumbs: KnowledgePage[];
  onEdit?: () => void;
  onDelete?: () => void;
  onNavigate?: (page: KnowledgePage) => void;
  isAdmin?: boolean;
}

export function KnowledgePageContent({
  page,
  breadcrumbs,
  onEdit,
  onDelete,
  onNavigate,
  isAdmin,
}: KnowledgePageContentProps) {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
  // Fetch updated_by profile
  const { data: updatedByUser } = useQuery({
    queryKey: ["profile", page.updated_by],
    queryFn: async () => {
      if (!page.updated_by) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("id", page.updated_by)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!page.updated_by,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
  
  // Get icon component
  const iconName = page.icon || 'file-text';
  const IconComponent = resolveIcon(iconName);

  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-body-sm text-muted-foreground mb-md">
        <button
          className="hover:text-foreground transition-colors"
          onClick={() => onNavigate?.({ id: '', title: 'Home' } as KnowledgePage)}
        >
          Knowledge
        </button>
        {breadcrumbs.map((crumb) => (
          <span key={crumb.id} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            <button
              className="hover:text-foreground transition-colors"
              onClick={() => onNavigate?.(crumb)}
            >
              {crumb.title}
            </button>
          </span>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-md mb-lg">
        <div className="flex items-center gap-sm">
          <div className="p-2 bg-primary/10 rounded-lg">
            <IconComponent className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-heading-lg font-semibold text-foreground">{page.title}</h1>
            <p className="text-metadata text-muted-foreground mt-1">
              Last updated {format(new Date(page.updated_at), "MMM d, yyyy")}
              {updatedByUser && (
                <span> by {updatedByUser.name || updatedByUser.email}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Share Button */}
          <Button variant="outline" size="sm" onClick={() => setShareDialogOpen(true)}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>

          {/* Edit button - for all authenticated users */}
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {/* Delete button - admin only */}
          {isAdmin && onDelete && (
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>

        {/* Share Dialog - Using unified system */}
        <KnowledgeShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          page={page}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {page.content ? (
          <div
            className="prose prose-sm max-w-none dark:prose-invert 
              prose-headings:text-foreground prose-p:text-foreground 
              prose-strong:text-foreground prose-a:text-primary
              prose-li:text-foreground prose-code:text-primary
              prose-pre:bg-muted prose-pre:border prose-pre:border-border"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.content) }}
          />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>This page is empty. Click Edit to add content.</p>
          </div>
        )}
      </div>

      {/* Child pages */}
      {page.children && page.children.length > 0 && (
        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="text-heading-sm font-medium text-foreground mb-md">Sub-pages</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {page.children.map((child) => {
              const ChildIcon = resolveIcon(child.icon || 'file-text');
              
              return (
                <button
                  key={child.id}
                  onClick={() => onNavigate?.(child)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted transition-smooth text-left"
                >
                  <ChildIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-body-sm font-medium truncate">{child.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
