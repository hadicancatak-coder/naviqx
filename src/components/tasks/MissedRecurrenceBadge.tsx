import { useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { TASK_QUERY_KEY } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface MissedRecurrenceBadgeProps {
  /** The task's next_run_at or due_at to check if it's behind schedule */
  nextRunAt?: string | null;
  /** Whether this is a template task */
  isTemplate?: boolean;
  /** Whether this is a recurring instance */
  isInstance?: boolean;
  /** Compact mode - icon only */
  compact?: boolean;
}

/**
 * Shows a warning badge when a recurring task template has missed generating instances.
 * Clicking the badge triggers a re-sync with the backend.
 */
export function MissedRecurrenceBadge({
  nextRunAt,
  isTemplate,
  isInstance,
  compact = false,
}: MissedRecurrenceBadgeProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  // Only show for templates or instances whose schedule is behind
  if (!nextRunAt) return null;

  const nextRun = new Date(nextRunAt);
  const now = new Date();
  
  // Not overdue — no badge needed
  if (nextRun >= now) return null;

  const hoursOverdue = (now.getTime() - nextRun.getTime()) / (1000 * 60 * 60);
  
  // Determine severity
  const isCritical = hoursOverdue > 48; // 2+ days
  const isWarning = hoursOverdue > 12;

  const overdueLabel = formatDistanceToNow(nextRun, { addSuffix: true });

  const handleResync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      await supabase.functions.invoke('generate-recurring-tasks');
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
    } catch {
      // Silent fail — the ensure-today check will retry
    } finally {
      setIsSyncing(false);
    }
  };

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleResync}
            className={cn(
              "flex-shrink-0 p-0.5 rounded-full transition-smooth",
              isCritical ? "text-destructive" : "text-warning",
              "hover:bg-destructive/10"
            )}
          >
            {isSyncing ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-metadata">Missed recurrence — last scheduled {overdueLabel}</p>
          <p className="text-metadata text-muted-foreground">Click to re-sync</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "text-metadata px-1.5 py-0 h-4 flex-shrink-0 rounded-full cursor-pointer transition-smooth",
            isCritical
              ? "bg-destructive/15 border-destructive/30 text-destructive hover:bg-destructive/25"
              : isWarning
              ? "bg-warning/15 border-warning/30 text-warning hover:bg-warning/25"
              : "bg-pending-soft border-pending/30 text-pending-text hover:bg-pending/25"
          )}
          onClick={handleResync}
        >
          {isSyncing ? (
            <RefreshCw className="h-2.5 w-2.5 mr-0.5 animate-spin" />
          ) : (
            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
          )}
          Missed
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-metadata font-medium">Recurrence behind schedule</p>
        <p className="text-metadata text-muted-foreground">Last scheduled {overdueLabel}</p>
        <p className="text-metadata text-muted-foreground mt-1">Click to trigger re-sync</p>
      </TooltipContent>
    </Tooltip>
  );
}
