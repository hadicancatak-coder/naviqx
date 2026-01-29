import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
  className?: string;
}

/**
 * Standardized empty state component for use when no data is present
 */
export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  children,
  className 
}: EmptyStateProps) {
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center py-xl px-lg text-center",
        className
      )}
    >
      {Icon && (
        <div className="w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center mb-md">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-heading-sm font-semibold text-foreground mb-sm">{title}</h3>
      {description && (
        <p className="text-body-sm text-muted-foreground max-w-sm mb-lg">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} className="rounded-full">
          {action.label}
        </Button>
      )}
      {children}
    </div>
  );
}
