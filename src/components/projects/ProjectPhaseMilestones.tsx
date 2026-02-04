import { useState } from "react";
import { format } from "date-fns";
import { Check, Plus, Calendar, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { PhaseMilestone, usePhaseMilestones } from "@/hooks/useRoadmap";
import { cn } from "@/lib/utils";

interface ProjectPhaseMilestonesProps {
  phaseId: string;
  milestones: PhaseMilestone[];
  isReadOnly?: boolean;
}

export function ProjectPhaseMilestones({ phaseId, milestones, isReadOnly = false }: ProjectPhaseMilestonesProps) {
  const [newMilestoneName, setNewMilestoneName] = useState("");
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState<Date | undefined>();
  const [isAdding, setIsAdding] = useState(false);

  const { createMilestone, updateMilestone, deleteMilestone } = usePhaseMilestones(phaseId);

  const handleAddMilestone = async () => {
    if (!newMilestoneName.trim()) return;

    await createMilestone.mutateAsync({
      phase_id: phaseId,
      name: newMilestoneName.trim(),
      due_date: newMilestoneDueDate ? format(newMilestoneDueDate, "yyyy-MM-dd") : undefined,
    });

    setNewMilestoneName("");
    setNewMilestoneDueDate(undefined);
    setIsAdding(false);
  };

  const handleToggleComplete = async (milestone: PhaseMilestone) => {
    await updateMilestone.mutateAsync({
      id: milestone.id,
      is_completed: !milestone.is_completed,
    });
  };

  const handleDelete = async (id: string) => {
    await deleteMilestone.mutateAsync(id);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-sm">
        <h4 className="text-body-sm font-medium text-muted-foreground">Milestones</h4>
        {!isReadOnly && !isAdding && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-7 gap-xs text-muted-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        )}
      </div>

      <div className="space-y-sm">
        {milestones.map((milestone) => (
          <div
            key={milestone.id}
            className={cn(
              "flex items-center gap-sm p-sm rounded-lg bg-muted/30 group",
              milestone.is_completed && "opacity-60"
            )}
          >
            <Checkbox
              checked={milestone.is_completed}
              onCheckedChange={() => !isReadOnly && handleToggleComplete(milestone)}
              disabled={isReadOnly}
              className="shrink-0"
            />
            <span className={cn(
              "flex-1 text-body-sm text-foreground",
              milestone.is_completed && "line-through"
            )}>
              {milestone.name}
            </span>
            
            {milestone.due_date && (
              <span className="text-metadata text-muted-foreground flex items-center gap-xs shrink-0">
                <Calendar className="h-3 w-3" />
                {format(new Date(milestone.due_date), "MMM d")}
              </span>
            )}
            
            {!isReadOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(milestone.id)}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}

        {milestones.length === 0 && !isAdding && (
          <p className="text-body-sm text-muted-foreground italic py-sm">
            No milestones yet
          </p>
        )}

        {/* Add milestone form */}
        {isAdding && (
          <div className="flex items-center gap-sm p-sm bg-muted/30 rounded-lg">
            <Check className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={newMilestoneName}
              onChange={(e) => setNewMilestoneName(e.target.value)}
              placeholder="Milestone name"
              className="flex-1 h-8 text-body-sm"
              onKeyDown={(e) => e.key === "Enter" && handleAddMilestone()}
              autoFocus
            />
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-xs shrink-0">
                  <Calendar className="h-3.5 w-3.5" />
                  {newMilestoneDueDate ? format(newMilestoneDueDate, "MMM d") : "Due"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={newMilestoneDueDate}
                  onSelect={setNewMilestoneDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button
              size="sm"
              onClick={handleAddMilestone}
              disabled={!newMilestoneName.trim() || createMilestone.isPending}
              className="h-8 shrink-0"
            >
              Add
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setNewMilestoneName("");
                setNewMilestoneDueDate(undefined);
              }}
              className="h-8 shrink-0"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
