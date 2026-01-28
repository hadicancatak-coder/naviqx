import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { PageContainer } from "./PageContainer";
import { Button } from "@/components/ui/button";

interface LoadingStateProps {
  /** Display variant: fullscreen (full page), section (within container), inline (compact) */
  variant?: 'fullscreen' | 'section' | 'inline';
  /** Optional loading message */
  message?: string;
  /** Minimum height for section variant */
  minHeight?: string;
  /** Wrap in PageContainer for section variant */
  withContainer?: boolean;
  /** Custom className */
  className?: string;
  /** Error state */
  isError?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Back button handler */
  onBack?: () => void;
}

/**
 * Unified loading state component with variants for different contexts.
 * Replaces PageLoadingSpinner and PageLoadingState with a single flexible component.
 */
export function LoadingState({
  variant = 'section',
  message,
  minHeight = "min-h-[400px]",
  withContainer = false,
  className,
  isError = false,
  errorMessage = "Could not load content.",
  onBack,
}: LoadingStateProps) {
  // Error state rendering
  if (isError) {
    const errorContent = (
      <div className={cn(
        "flex flex-col items-center justify-center gap-md",
        minHeight,
        className
      )}>
        <p className="text-muted-foreground">{errorMessage}</p>
        {onBack && (
          <Button onClick={onBack} variant="outline">Go Back</Button>
        )}
      </div>
    );

    if (withContainer) {
      return <PageContainer>{errorContent}</PageContainer>;
    }
    return errorContent;
  }

  // Fullscreen variant - for app initialization
  if (variant === 'fullscreen') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-md">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          {message && (
            <span className="text-body-sm text-muted-foreground">{message}</span>
          )}
        </div>
      </div>
    );
  }

  // Inline variant - compact, for within components
  if (variant === 'inline') {
    return (
      <div className={cn(
        "flex items-center justify-center gap-sm py-md",
        className
      )}>
        <Loader2 className="h-5 w-5 text-primary animate-spin" />
        {message && (
          <span className="text-body-sm text-muted-foreground">{message}</span>
        )}
      </div>
    );
  }

  // Section variant - default, for page sections
  const sectionContent = (
    <div className={cn(
      "flex flex-col items-center justify-center gap-md",
      minHeight,
      className
    )}>
      <Loader2 className="h-8 w-8 text-primary animate-spin" />
      {message && (
        <span className="text-body-sm text-muted-foreground">{message}</span>
      )}
    </div>
  );

  if (withContainer) {
    return <PageContainer>{sectionContent}</PageContainer>;
  }

  return sectionContent;
}
