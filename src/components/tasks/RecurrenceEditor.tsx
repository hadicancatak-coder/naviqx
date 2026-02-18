import { useState } from "react";
import { Repeat, Pencil, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { format, formatDistanceToNow } from "date-fns";
import { RecurrenceRule, getRecurrenceLabelNew, parseLegacyRrule } from "@/lib/recurrenceUtils";
import { RecurrenceEditSheet } from "./RecurrenceEditSheet";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { TASK_QUERY_KEY } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

interface RecurrenceEditorProps {
  taskId: string;
  templateTaskId?: string; // For instances - the ID of their parent template
  currentRrule: string | null;
  nextRunAt: string | null;
  isTemplate: boolean;
  isInstance?: boolean; // True when viewing an instance task
  onUpdate: (rule: RecurrenceRule) => void;
  isPending?: boolean;
}

export function RecurrenceEditor({
  taskId,
  templateTaskId,
  currentRrule,
  nextRunAt,
  isTemplate,
  isInstance,
  onUpdate,
  isPending,
}: RecurrenceEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  // Parse the current rule
  const currentRule = currentRrule ? parseLegacyRrule(currentRrule) : null;
  const scheduleLabel = currentRule ? getRecurrenceLabelNew(currentRule) : "No recurrence";

  // Check if schedule is behind
  const isOverdue = nextRunAt && new Date(nextRunAt) < new Date();
  const hoursOverdue = isOverdue
    ? (Date.now() - new Date(nextRunAt!).getTime()) / (1000 * 60 * 60)
    : 0;
  const isCritical = hoursOverdue > 48;

  const handleSave = (rule: RecurrenceRule) => {
    onUpdate(rule);
    setIsOpen(false);
  };

  const handleResync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await supabase.functions.invoke('generate-recurring-tasks');
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
    } catch {
      // Silent
    } finally {
      setIsSyncing(false);
    }
  };

  // Show for templates OR instances that have a parent template
  if (!isTemplate && !isInstance) return null;

  return (
    <div className="space-y-xs">
      <Label className="text-metadata text-muted-foreground">Recurrence</Label>
      <div className="flex items-center justify-between bg-card border border-border rounded-lg p-sm">
        <div className="flex items-center gap-sm">
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center",
            isOverdue ? (isCritical ? "bg-destructive/10" : "bg-warning/10") : "bg-info/10"
          )}>
            {isOverdue ? (
              <AlertTriangle className={cn("h-4 w-4", isCritical ? "text-destructive" : "text-warning")} />
            ) : (
              <Repeat className="h-4 w-4 text-info" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-body-sm font-medium">{scheduleLabel}</span>
            {nextRunAt && (
              <span className={cn(
                "text-metadata",
                isOverdue
                  ? (isCritical ? "text-destructive" : "text-warning")
                  : "text-muted-foreground"
              )}>
                {isOverdue
                  ? `Missed — ${formatDistanceToNow(new Date(nextRunAt), { addSuffix: true })}`
                  : `Next: ${format(new Date(nextRunAt), "EEE, MMM d 'at' h:mm a")}`
                }
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-xs">
          {isOverdue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResync}
              disabled={isSyncing}
              className={cn(
                "h-8 px-2",
                isCritical ? "text-destructive hover:text-destructive" : "text-warning hover:text-warning"
              )}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", isSyncing && "animate-spin")} />
              Sync
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(true)}
            disabled={isPending}
            className="h-8 px-2"
          >
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
      </div>

      {/* Missed recurrence alert banner */}
      {isOverdue && isTemplate && (
        <div className={cn(
          "flex items-center gap-sm p-sm rounded-lg border text-body-sm",
          isCritical
            ? "bg-destructive/5 border-destructive/20 text-destructive"
            : "bg-warning/5 border-warning/20 text-warning"
        )}>
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            {isCritical
              ? "This template is significantly behind schedule. Click Sync to generate missed instances."
              : "This template has missed occurrences. The system will auto-catch-up shortly."
            }
          </span>
        </div>
      )}

      <RecurrenceEditSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        currentRule={currentRule}
        onSave={handleSave}
        isPending={isPending}
      />
    </div>
  );
}
