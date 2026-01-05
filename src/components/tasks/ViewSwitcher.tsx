import { List, Columns3, Clock, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = 'table' | 'kanban-status' | 'kanban-date' | 'kanban-tags';

interface ViewSwitcherProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const views = [
  { mode: 'table' as const, icon: List, label: 'List' },
  { mode: 'kanban-status' as const, icon: Columns3, label: 'Board' },
  { mode: 'kanban-date' as const, icon: Clock, label: 'Timeline' },
  { mode: 'kanban-tags' as const, icon: Tag, label: 'Tags' },
];

export function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-xxs p-xxs bg-muted rounded-lg">
      {views.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={cn(
            "flex items-center gap-1.5 px-3 h-row-compact rounded-md text-body-sm font-medium transition-smooth",
            value === mode 
              ? "bg-card text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground hover:bg-card-hover"
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
