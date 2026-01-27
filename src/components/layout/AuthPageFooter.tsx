import { cn } from "@/lib/utils";

interface AuthPageFooterProps {
  className?: string;
}

/**
 * Compact footer for authentication flow pages
 * Used on: Auth, MfaSetup, MfaVerify
 */
export function AuthPageFooter({ className }: AuthPageFooterProps) {
  return (
    <div className={cn("mt-lg pt-md border-t border-border", className)}>
      <p className="text-metadata text-center text-muted-foreground">
        © 2025 Naviqx • CFI Performance Marketing
      </p>
    </div>
  );
}
