import { useState } from "react";
import { Repeat, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { RecurrenceRule, getRecurrenceLabelNew, parseLegacyRrule } from "@/lib/recurrenceUtils";
import { RecurrenceEditSheet } from "./RecurrenceEditSheet";

interface RecurrenceEditorProps {
  taskId: string;
  currentRrule: string | null;
  nextRunAt: string | null;
  isTemplate: boolean;
  onUpdate: (rule: RecurrenceRule) => void;
  isPending?: boolean;
}

export function RecurrenceEditor({
  taskId,
  currentRrule,
  nextRunAt,
  isTemplate,
  onUpdate,
  isPending,
}: RecurrenceEditorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Parse the current rule
  const currentRule = currentRrule ? parseLegacyRrule(currentRrule) : null;
  const scheduleLabel = currentRule ? getRecurrenceLabelNew(currentRule) : "No recurrence";

  const handleSave = (rule: RecurrenceRule) => {
    onUpdate(rule);
    setIsOpen(false);
  };

  // Only show for templates
  if (!isTemplate) return null;

  return (
    <div className="space-y-xs">
      <Label className="text-metadata text-muted-foreground">Recurrence</Label>
      <div className="flex items-center justify-between bg-card border border-border rounded-lg p-sm">
        <div className="flex items-center gap-sm">
          <div className="h-8 w-8 rounded-full bg-info/10 flex items-center justify-center">
            <Repeat className="h-4 w-4 text-info" />
          </div>
          <div className="flex flex-col">
            <span className="text-body-sm font-medium">{scheduleLabel}</span>
            {nextRunAt && (
              <span className="text-metadata text-muted-foreground">
                Next: {format(new Date(nextRunAt), "EEE, MMM d 'at' h:mm a")}
              </span>
            )}
          </div>
        </div>
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
