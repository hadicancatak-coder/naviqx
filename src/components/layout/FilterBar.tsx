import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FilterBarProps {
  children?: ReactNode;
  className?: string;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
}

/**
 * Standardized filter toolbar for list/table pages
 * All filter controls inside should use h-10 height for consistency
 */
export function FilterBar({ children, className, search }: FilterBarProps) {
  return (
    <div 
      className={cn(
        "flex flex-wrap items-center gap-sm px-md py-sm rounded-xl",
        "liquid-glass border border-border/50",
        className
      )}
    >
      {search && (
        <div className="relative min-w-[200px] max-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={search.placeholder || "Search..."}
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            className="pl-9"
          />
        </div>
      )}
      {children}
    </div>
  );
}

interface FilterPillProps {
  children: ReactNode;
  className?: string;
}

/**
 * Individual filter pill wrapper for use inside FilterBar
 */
export function FilterPill({ children, className }: FilterPillProps) {
  return (
    <div className={cn("flex items-center", className)}>
      {children}
    </div>
  );
}
