import { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { usePublicAccess, ResourceType, PublicAccessLink, PublicAccessComment } from "@/hooks/usePublicAccess";
import { ExternalReviewHeader } from "./ExternalReviewHeader";
import { ExternalPageFooter } from "@/components/layout/ExternalPageFooter";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Lock } from "lucide-react";

interface ExternalReviewActions {
  submitComment: (params: {
    commentText: string;
    commentType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
  }) => void;
  isSubmitting: boolean;
}

interface ExternalReviewPageProps {
  resourceType: ResourceType;
  children: (
    accessData: PublicAccessLink,
    comments: PublicAccessComment[],
    actions: ExternalReviewActions
  ) => ReactNode;
  title?: string;
}

/**
 * Unified shell component for all external review pages.
 * Handles token verification, loading states, identification, and footer.
 */
export function ExternalReviewPage({ resourceType, children, title }: ExternalReviewPageProps) {
  const { token } = useParams<{ token: string }>();

  const {
    accessData,
    comments,
    isLoading,
    error,
    isIdentified,
    canComment,
    reviewerName,
    reviewerEmail,
    identify,
    submitComment,
    isSubmitting,
  } = usePublicAccess({ 
    token: token || '', 
    resourceType 
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <LoadingSkeleton />
      </div>
    );
  }

  // Error state
  if (error || !accessData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-heading-lg font-semibold text-foreground">
            Access Denied
          </h1>
          <p className="text-body text-muted-foreground">
            {error instanceof Error 
              ? error.message 
              : 'This link is invalid or has expired. Please contact the sender for a new link.'}
          </p>
        </div>
      </div>
    );
  }

  // Require identification for non-public links
  if (!accessData.is_public && !isIdentified) {
    return (
      <div className="min-h-screen bg-background">
        <ExternalReviewHeader
          title={title || getDefaultTitle(resourceType)}
          entity={accessData.entity}
          isIdentified={false}
          reviewerName=""
          reviewerEmail=""
          onIdentify={identify}
          requireIdentification
        />
        <div className="flex items-center justify-center p-6 min-h-[60vh]">
          <div className="max-w-md text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-heading-md font-semibold text-foreground">
              Identification Required
            </h2>
            <p className="text-body text-muted-foreground">
              Please identify yourself using the form above to access this content.
            </p>
          </div>
        </div>
        <ExternalPageFooter />
      </div>
    );
  }

  // Render content
  return (
    <div className="min-h-screen bg-background relative">
      {/* Background orbs for glass effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <ExternalReviewHeader
          title={title || getDefaultTitle(resourceType)}
          entity={accessData.entity}
          isIdentified={isIdentified}
          canComment={canComment}
          reviewerName={reviewerName}
          reviewerEmail={reviewerEmail}
          onIdentify={identify}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children(accessData, comments, { submitComment, isSubmitting })}
        </main>

        <ExternalPageFooter />
      </div>
    </div>
  );
}

function getDefaultTitle(resourceType: ResourceType): string {
  const titles: Record<ResourceType, string> = {
    campaign: 'Campaign Review',
    knowledge: 'Knowledge Base',
    project: 'Project Overview',
    lp_map: 'Landing Page Review',
    search_ads: 'Search Ads Review',
  };
  return titles[resourceType];
}

function LoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
