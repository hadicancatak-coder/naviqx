import { format } from "date-fns";
import { Activity, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityLogEntryProps {
  field_name?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  old_value?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new_value?: any;
  description?: string;
  changed_at?: string;
  profiles?: {
    name: string;
    avatar_url: string | null;
  };
}

export function ActivityLogEntry({ 
  field_name, 
  old_value, 
  new_value, 
  description, 
  changed_at,
  profiles 
}: ActivityLogEntryProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic value formatting requires flexible input
  const formatValue = (value: unknown) => {
    if (value === null || value === undefined) return 'None';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="flex gap-xs py-xs px-sm rounded-md bg-muted/20 border border-border/30">
      <div className="flex-shrink-0 mt-xs">
        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
          <Activity className="h-3 w-3 text-primary" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-xs flex-wrap">
          <span className="font-medium text-metadata">
            {profiles?.name || 'System'}
          </span>
          <span className="text-metadata text-muted-foreground">
            {description || `updated ${field_name}`}
          </span>
        </div>
        {old_value !== undefined && new_value !== undefined && !description && (
          <div className="mt-xs text-metadata text-muted-foreground space-y-xs">
            <div className="flex items-center gap-xs">
              <span className="text-destructive line-through">{formatValue(old_value)}</span>
              <span>→</span>
              <span className="text-success-text">{formatValue(new_value)}</span>
            </div>
          </div>
        )}
        <div className="flex items-center gap-xs mt-xs text-metadata text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          {changed_at && format(new Date(changed_at), "MMM d, h:mm a")}
        </div>
      </div>
    </div>
  );
}
