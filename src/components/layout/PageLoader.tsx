import { Loader2 } from "lucide-react";

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-md">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <span className="text-body-sm text-muted-foreground">Loading...</span>
      </div>
    </div>
  );
}