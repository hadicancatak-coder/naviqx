import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PanelHeaderProps {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function PanelHeader({ title, collapsed, onToggle, actions, className }: PanelHeaderProps) {
  if (collapsed) {
    return (
      <div className="flex items-center justify-center h-full">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="writing-mode-vertical-rl rotate-180 h-auto py-4"
        >
          {title}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-between border-b px-4 py-3 bg-muted/30", className)}>
      <h3 className="font-semibold text-body-sm">{title}</h3>
      <div className="flex items-center gap-2">
        {actions}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
