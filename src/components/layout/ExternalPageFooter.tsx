import { cn } from "@/lib/utils";

interface ExternalPageFooterProps {
  className?: string;
}

/**
 * Standardized footer for all external-facing pages
 * Used on: LpMapPublic, KnowledgePublic, CampaignsLogExternal, CampaignReview
 */
export function ExternalPageFooter({ className }: ExternalPageFooterProps) {
  return (
    <footer className={cn("border-t border-border bg-card/80 backdrop-blur-sm mt-12", className)}>
      <div className="max-w-5xl mx-auto px-6 py-8 text-center space-y-2">
        <p className="text-body-sm font-medium text-foreground">
          Proudly presented by the Performance Marketing Team at CFI Group
        </p>
        <p className="text-metadata text-muted-foreground">
          This page was built internally with AI. Do not share with third parties; internal use only.
        </p>
      </div>
    </footer>
  );
}
