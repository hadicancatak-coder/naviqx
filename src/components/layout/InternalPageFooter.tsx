import { cn } from "@/lib/utils";

interface InternalPageFooterProps {
  className?: string;
}

/**
 * Standardized footer for authenticated internal pages
 * Used on: About, HowTo, and optionally in global Layout
 */
export function InternalPageFooter({ className }: InternalPageFooterProps) {
  return (
    <footer className={cn("py-lg text-center", className)}>
      <p className="text-metadata text-muted-foreground">
        © 2026 Naviqx • CFI Performance Marketing • Internal Use Only
      </p>
    </footer>
  );
}