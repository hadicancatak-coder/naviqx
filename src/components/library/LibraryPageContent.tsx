import { format } from "date-fns";
import { Edit2, Trash2, Share2, ChevronRight, Home, Link2, Check } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LibraryPage, LibraryCategory, LIBRARY_CATEGORIES } from "@/hooks/useLibraryPages";
import { useProjects } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";
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
  knowledge: "status-info",
  service: "status-purple",
  project: "status-primary bg-primary/10 text-primary",
  rules: "status-warning",
  process: "status-success",
};

interface LibraryPageContentProps {
  page: LibraryPage;
  breadcrumbs: LibraryPage[];
  onEdit?: () => void;
  onDelete?: () => void;
  onNavigate: (page: LibraryPage | null) => void;
  isAdmin?: boolean;
}

export function LibraryPageContent({
  page,
  breadcrumbs,
  onEdit,
  onDelete,
  onNavigate,
  isAdmin,
}: LibraryPageContentProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const { projects } = useProjects();
  
  // Fetch profile for updated_by user
  const { data: updatedByProfile } = useQuery({
    queryKey: ["profile", page.updated_by],
    queryFn: async () => {
      if (!page.updated_by) return null;
      const { data } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("user_id", page.updated_by)
        .single();
      return data;
    },
    enabled: !!page.updated_by,
  });

  const linkedProject = page.project_id
    ? projects?.find(p => p.id === page.project_id)
    : null;

  const categoryInfo = LIBRARY_CATEGORIES.find(c => c.value === page.category);

  const handleCopyLink = async () => {
    if (page.public_token) {
      const url = `${window.location.origin}/r/${page.public_token}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-lg border-b border-border">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <Breadcrumb className="mb-md">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink 
                  onClick={() => onNavigate(null)}
                  className="cursor-pointer hover:text-primary flex items-center gap-1"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>Library</span>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {breadcrumbs.map((crumb) => (
                <BreadcrumbItem key={crumb.id}>
                  <BreadcrumbSeparator />
                  <BreadcrumbLink 
                    onClick={() => onNavigate(crumb)}
                    className="cursor-pointer hover:text-primary"
                  >
                    {crumb.title}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              ))}
              <BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbPage>{page.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )}

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-md">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <DynamicIcon name={page.icon || 'file-text'} className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-sm mb-xs">
                <h1 className="text-heading-lg font-bold text-foreground">{page.title}</h1>
                {categoryInfo && (
                  <Badge className={cn("text-metadata", categoryColors[page.category])}>
                    {categoryInfo.label}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-md text-metadata text-muted-foreground">
                <span>
                  Updated {format(new Date(page.updated_at), "MMM d, yyyy")}
                  {updatedByProfile && ` by ${updatedByProfile.name || updatedByProfile.email}`}
                </span>
                
                {linkedProject && (
                  <button
                    onClick={() => navigate('/projects')}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    <span>{linkedProject.name}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-xs">
            {page.public_token && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" onClick={handleCopyLink}>
                    {copied ? <Check className="h-4 w-4 text-success-text" /> : <Share2 className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy public link</TooltipContent>
              </Tooltip>
            )}
            
            {onEdit && (
              <Button variant="ghost" size="icon-sm" onClick={onEdit}>
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
            
            {onDelete && isAdmin && (
              <Button variant="ghost" size="icon-sm" onClick={onDelete} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-lg">
        {page.content ? (
          <div 
            className="prose prose-sm max-w-none text-foreground
              [&_h1]:text-heading-lg [&_h1]:font-bold [&_h1]:text-foreground [&_h1]:mb-md
              [&_h2]:text-heading-md [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mb-sm [&_h2]:mt-lg
              [&_h3]:text-heading-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mb-sm [&_h3]:mt-md
              [&_p]:text-body [&_p]:text-foreground [&_p]:mb-md
              [&_ul]:list-disc [&_ul]:pl-lg [&_ul]:mb-md
              [&_ol]:list-decimal [&_ol]:pl-lg [&_ol]:mb-md
              [&_li]:text-body [&_li]:text-foreground [&_li]:mb-xs
              [&_a]:text-primary [&_a]:underline [&_a]:hover:text-primary/80
              [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-body-sm
              [&_pre]:bg-muted [&_pre]:p-md [&_pre]:rounded-lg [&_pre]:overflow-x-auto
              [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-md [&_blockquote]:italic"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.content) }}
          />
        ) : (
          <p className="text-muted-foreground italic">No content yet. Click Edit to add content.</p>
        )}

        {/* Sub-pages */}
        {page.children && page.children.length > 0 && (
          <div className="mt-xl pt-lg border-t border-border">
            <h2 className="text-heading-sm font-semibold text-foreground mb-md">Sub-pages</h2>
            <div className="space-y-xs">
              {page.children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => onNavigate(child)}
                  className={cn(
                    "w-full flex items-center gap-sm p-md rounded-xl",
                    "bg-card hover:bg-card-hover border border-border",
                    "text-left transition-smooth hover-lift"
                  )}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DynamicIcon name={child.icon || 'file-text'} className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body font-medium text-foreground truncate">
                      {child.title}
                    </h3>
                    {child.children && child.children.length > 0 && (
                      <p className="text-metadata text-muted-foreground">
                        {child.children.length} sub-page{child.children.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
