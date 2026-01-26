import { PageContainer } from "./PageContainer";
import { Button } from "@/components/ui/button";

interface PageLoadingStateProps {
  authLoading: boolean;
  dataLoading: boolean;
  isError?: boolean;
  hasData: boolean;
  errorMessage?: string;
  onBack?: () => void;
  children: React.ReactNode;
}

export function PageLoadingState({ 
  authLoading, 
  dataLoading, 
  isError = false,
  hasData,
  errorMessage = "Could not load page content.",
  onBack,
  children 
}: PageLoadingStateProps) {
  // Wait for auth to resolve first
  if (authLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageContainer>
    );
  }
  
  // Handle error state
  if (isError && !hasData) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <p className="text-muted-foreground">{errorMessage}</p>
          {onBack && (
            <Button onClick={onBack} variant="outline">Go Back</Button>
          )}
        </div>
      </PageContainer>
    );
  }
  
  // Show loading spinner only if actively loading
  if (dataLoading && !hasData) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageContainer>
    );
  }
  
  // Guard: don't render children until we have data
  if (!hasData) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <p className="text-muted-foreground">{errorMessage}</p>
          {onBack && (
            <Button onClick={onBack} variant="outline">Go Back</Button>
          )}
        </div>
      </PageContainer>
    );
  }
  
  return <>{children}</>;
}
