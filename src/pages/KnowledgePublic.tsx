import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, FileText } from "lucide-react";
import { format } from "date-fns";
import DOMPurify from "dompurify";
import * as LucideIcons from "lucide-react";
import { GlassBackground } from "@/components/layout/GlassBackground";
import { Card } from "@/components/ui/card";
import { ExternalPageFooter } from "@/components/layout/ExternalPageFooter";

export default function KnowledgePublic() {
  const { token } = useParams<{ token: string }>();

  const { data: page, isLoading, error } = useQuery({
    queryKey: ["knowledge-public", token],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      
      const { data, error } = await supabase
        .from("knowledge_pages")
        .select("*")
        .eq("public_token", token)
        .eq("is_public", true)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error("Page not found or not public");
      return data;
    },
    enabled: !!token,
  });

  // Track page view (click count and last accessed)
  useEffect(() => {
    if (page?.id) {
      supabase
        .from("knowledge_pages")
        .update({
          click_count: (page.click_count || 0) + 1,
          last_accessed_at: new Date().toISOString(),
        })
        .eq("id", page.id)
        .then(() => {
          // Silent update, no need to handle response
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally run once per page.id, not on click_count changes
  }, [page?.id]);

  if (isLoading) {
    return (
      <GlassBackground variant="centered">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </GlassBackground>
    );
  }

  if (error || !page) {
    return (
      <GlassBackground variant="centered">
        <Card className="glass-elevated p-lg text-center max-w-md w-full">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-md" />
          <h1 className="text-heading-lg font-semibold text-foreground mb-xs">Page Not Found</h1>
          <p className="text-muted-foreground">
            This page doesn't exist or is no longer shared.
          </p>
        </Card>
      </GlassBackground>
    );
  }

  const iconName = page.icon || 'file-text';
  const IconComponent = (LucideIcons as Record<string, unknown>)[iconName.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('')] as React.ComponentType<{ className?: string }> || FileText;

  return (
    <GlassBackground variant="full" className="pb-0">
      {/* Header */}
      <header className="border-b border-border glass-elevated mb-lg">
        <div className="max-w-4xl mx-auto px-lg py-md">
          <div className="flex items-center gap-sm text-muted-foreground text-body-sm">
            <BookOpen className="h-4 w-4" />
            <span>Knowledge Base</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-lg py-xl">
        <div className="flex items-start gap-md mb-lg">
          <div className="p-sm bg-primary/10 rounded-xl">
            <IconComponent className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-heading-lg font-semibold text-foreground">{page.title}</h1>
            <p className="text-metadata text-muted-foreground mt-xs">
              Last updated {format(new Date(page.updated_at), "MMMM d, yyyy")}
            </p>
          </div>
        </div>

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
          <div className="text-center py-xl text-muted-foreground">
            <p>This page has no content yet.</p>
          </div>
        )}
      </main>

      <ExternalPageFooter />
    </GlassBackground>
  );
}
