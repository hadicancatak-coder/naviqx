import { format } from "date-fns";
import DOMPurify from "dompurify";
import { BookOpen, FileText, Clock } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PublicAccessLink } from "@/hooks/usePublicAccess";

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

interface KnowledgePage {
  id: string;
  title: string;
  content: string | null;
  icon: string | null;
  updated_at: string;
}

interface KnowledgeReviewContentProps {
  accessData: PublicAccessLink;
  pageData?: KnowledgePage | null;
}

/**
 * Read-only knowledge page content for external review.
 * No commenting functionality - purely informational display.
 */
export function KnowledgeReviewContent({ 
  accessData, 
  pageData 
}: KnowledgeReviewContentProps) {
  if (!pageData) {
    return (
      <div className="text-center py-16">
        <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-heading-md font-semibold text-foreground mb-2">
          Page Not Available
        </h2>
        <p className="text-muted-foreground">
          The knowledge page could not be loaded.
        </p>
      </div>
    );
  }

  const iconName = pageData.icon || 'file-text';
  const IconComponent = resolveIcon(iconName);

  return (
    <div className="max-w-4xl mx-auto space-y-lg">
      {/* Page Header */}
      <div className="liquid-glass-elevated rounded-xl p-lg">
        <div className="flex items-start gap-md">
          <div className="p-md bg-primary/10 rounded-xl shrink-0">
            <IconComponent className="h-10 w-10 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-heading-lg font-bold text-foreground">
              {pageData.title}
            </h1>
            <div className="flex items-center gap-sm text-metadata text-muted-foreground mt-sm">
              <Clock className="h-3.5 w-3.5" />
              <span>Last updated {format(new Date(pageData.updated_at), "MMMM d, yyyy")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="liquid-glass-elevated rounded-xl p-lg">
        {pageData.content ? (
          <div
            className="prose prose-sm max-w-none dark:prose-invert 
              prose-headings:text-foreground prose-p:text-foreground 
              prose-strong:text-foreground prose-a:text-primary
              prose-li:text-foreground prose-code:text-primary
              prose-pre:bg-muted prose-pre:border prose-pre:border-border"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(pageData.content) }}
          />
        ) : (
          <div className="text-center py-xl text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-md opacity-50" />
            <p>This page has no content yet.</p>
          </div>
        )}
      </div>

      {/* Entity Badge (if available) */}
      {accessData.entity && (
        <div className="text-center text-metadata text-muted-foreground">
          Shared by <span className="font-medium text-foreground">{accessData.entity}</span>
        </div>
      )}
    </div>
  );
}
