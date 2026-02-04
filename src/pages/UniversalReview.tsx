import { lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import { useTokenResolver } from "@/hooks/useTokenResolver";
import { PageLoader } from "@/components/layout/PageLoader";
import { AlertCircle, LinkIcon } from "lucide-react";

const PublicReview = lazy(() => import("./PublicReview"));

/**
 * Universal Review Page
 * Auto-detects resource type from token and renders the appropriate PublicReview component.
 * This enables the simplified /r/:token URL pattern.
 */
export default function UniversalReview() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = useTokenResolver(token);

  // Loading state with skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Resolving access link...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {error === "Invalid access link" ? "Link Not Found" : "Access Denied"}
          </h1>
          <p className="text-muted-foreground">
            {error || "Unable to access this resource."}
          </p>
          <div className="pt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <LinkIcon className="h-3 w-3" />
            <span>Token: {token?.slice(0, 8)}...</span>
          </div>
        </div>
      </div>
    );
  }

  // Render the PublicReview with resolved resource type
  return (
    <Suspense fallback={<PageLoader />}>
      <PublicReview resourceType={data.resourceType} />
    </Suspense>
  );
}
