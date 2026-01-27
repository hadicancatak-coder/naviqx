import { cn } from "@/lib/utils";

interface PageLoadingSpinnerProps {
  className?: string;
  message?: string;
  minHeight?: string;
}

/**
 * Reusable loading spinner for page sections
 * Use instead of duplicating loading state patterns
 */
export function PageLoadingSpinner({ 
  className,
  message,
  minHeight = "min-h-[400px]"
}: PageLoadingSpinnerProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center gap-md",
      minHeight,
      className
    )}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      {message && (
        <span className="text-body-sm text-muted-foreground">{message}</span>
      )}
    </div>
  );
}
