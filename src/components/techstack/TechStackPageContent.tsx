import { TechStackPage } from "@/hooks/useTechStackPages";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ChevronRight, Server, Calendar, User, Circle } from "lucide-react";
import { format } from "date-fns";
import DOMPurify from "dompurify";
import * as LucideIcons from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TechStackPageContentProps {
  page: TechStackPage;
  breadcrumbs: TechStackPage[];
  onEdit?: () => void;
  onDelete?: () => void;
  onNavigate?: (page: TechStackPage) => void;
  isAdmin?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-success/15 text-success border-success/30" },
  planned: { label: "Planned", className: "bg-primary/15 text-primary border-primary/30" },
  under_review: { label: "Under Review", className: "bg-warning/15 text-warning border-warning/30" },
  deprecated: { label: "Deprecated", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export function TechStackPageContent({
  page,
  breadcrumbs,
  onEdit,
  onDelete,
  onNavigate,
  isAdmin,
}: TechStackPageContentProps) {
  // Fetch owner profile if exists
  const { data: owner } = useQuery({
    queryKey: ["profile", page.owner_id],
    queryFn: async () => {
      if (!page.owner_id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("id", page.owner_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!page.owner_id,
  });

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
  });

  // Get icon component
  const iconName = page.icon || 'server';
  const IconComponent = (LucideIcons as any)[iconName.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('')] || Server;

  const statusConfig = page.status ? STATUS_CONFIG[page.status] : null;

  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-body-sm text-muted-foreground mb-4">
        <button
          className="hover:text-foreground transition-colors"
          onClick={() => onNavigate?.({ id: '', title: 'Home' } as TechStackPage)}
        >
          Tech Stack
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
      <div className="flex items-start justify-between gap-md mb-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <IconComponent className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-heading-lg font-semibold text-foreground">{page.title}</h1>
              {statusConfig && (
                <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
                  {statusConfig.label}
                </Badge>
              )}
            </div>
            <p className="text-metadata text-muted-foreground mt-1">
              Last updated {format(new Date(page.updated_at), "MMM d, yyyy")}
              {updatedByUser && (
                <span> by {updatedByUser.name || updatedByUser.email}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
      </div>

      {/* Metadata Row */}
      {(page.integrated_at || owner) && (
        <div className="flex items-center gap-md mb-lg text-body-sm text-muted-foreground">
          {page.integrated_at && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>Integrated: {format(new Date(page.integrated_at), "MMM d, yyyy")}</span>
            </div>
          )}
          {owner && (
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              <span>Owner: {owner.name || owner.email}</span>
            </div>
          )}
        </div>
      )}

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
            <p>No details yet. Click Edit to add information.</p>
          </div>
        )}
      </div>

      {/* Child pages */}
      {page.children && page.children.length > 0 && (
        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="text-heading-sm font-medium text-foreground mb-4">Related Items</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {page.children.map((child) => {
              const ChildIcon = (LucideIcons as any)[
                (child.icon || 'server').split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('')
              ] || Server;
              
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