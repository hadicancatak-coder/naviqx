import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Check, Plus, Trash2, Diamond } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PhaseMilestone, usePhaseMilestones } from "@/hooks/useRoadmap";

interface PhaseMilestonesProps {
  phaseId: string;
  isAdmin?: boolean;
}

export function PhaseMilestones({ phaseId, isAdmin }: PhaseMilestonesProps) {
  const { milestones, createMilestone, updateMilestone, deleteMilestone } = usePhaseMilestones(phaseId);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await createMilestone.mutateAsync({
      phase_id: phaseId,
      name: newName.trim(),
      due_date: newDueDate || undefined,
    });
    setNewName("");
    setNewDueDate("");
    setIsAdding(false);
  };

  const handleToggle = async (milestone: PhaseMilestone) => {
    await updateMilestone.mutateAsync({
      id: milestone.id,
      is_completed: !milestone.is_completed,
    });
  };

  const handleDelete = async (id: string) => {
    await deleteMilestone.mutateAsync(id);
  };

  if (!milestones || milestones.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Diamond className="h-4 w-4" />
          <span className="text-body-sm">Milestones</span>
        </div>
        {isAdmin && !isAdding && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add milestone
          </Button>
        )}
        {isAdding && (
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Milestone name"
              className="h-8 text-body-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") setIsAdding(false);
              }}
            />
            <Input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="h-8 text-body-sm w-36"
            />
            <Button size="sm" variant="ghost" onClick={handleAdd} disabled={createMilestone.isPending}>
              <Check className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Diamond className="h-4 w-4" />
        <span className="text-body-sm font-medium">Milestones</span>
        <span className="text-metadata text-muted-foreground">
          ({milestones.filter((m) => m.is_completed).length}/{milestones.length})
        </span>
      </div>

      <div className="space-y-1">
        {milestones.map((milestone) => (
          <div
            key={milestone.id}
            className="flex items-center gap-2 group py-1 px-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <Checkbox
              checked={milestone.is_completed}
              onCheckedChange={() => handleToggle(milestone)}
              disabled={!isAdmin}
            />
            <span
              className={cn(
                "text-body-sm flex-1",
                milestone.is_completed && "line-through text-muted-foreground"
              )}
            >
              {milestone.name}
            </span>
            {milestone.due_date && (
              <span className="text-metadata text-muted-foreground">
                {format(parseISO(milestone.due_date), "MMM d")}
              </span>
            )}
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(milestone.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {isAdmin && !isAdding && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground h-7 text-metadata"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add milestone
        </Button>
      )}

      {isAdding && (
        <div className="flex items-center gap-2 pt-1">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Milestone name"
            className="h-8 text-body-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") setIsAdding(false);
            }}
          />
          <Input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="h-8 text-body-sm w-36"
          />
          <Button size="sm" variant="ghost" onClick={handleAdd} disabled={createMilestone.isPending}>
            <Check className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
