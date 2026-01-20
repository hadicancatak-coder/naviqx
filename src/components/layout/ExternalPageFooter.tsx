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
      <div className="max-w-5xl mx-auto px-6 py-8 text-center space-y-3">
        <p className="text-body-sm font-semibold text-foreground">
          ™ Proudly presented by the Performance Marketing Team, CFI Financial Group.
        </p>
        <div className="space-y-1">
          <p className="text-metadata text-muted-foreground">
            This asset has been designed and developed internally using proprietary AI-assisted workflows.
          </p>
          <p className="text-metadata text-muted-foreground font-medium">
            Confidential material — for internal circulation only.
          </p>
          <p className="text-metadata text-destructive-text">
            Unauthorized distribution or third-party sharing is strictly prohibited.
          </p>
        </div>
      </div>
    </footer>
  );
}
