import { useState } from "react";
import { Diamond, Plus, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { usePhaseMilestones } from "@/hooks/useRoadmap";

interface QuickMilestoneDialogProps {
  phaseId: string;
  phaseName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickMilestoneDialog({
  phaseId,
  phaseName,
  open,
  onOpenChange,
}: QuickMilestoneDialogProps) {
  const { createMilestone } = usePhaseMilestones(phaseId);
  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSave = async () => {
    if (!name.trim()) return;

    await createMilestone.mutateAsync({
      phase_id: phaseId,
      name: name.trim(),
      due_date: dueDate || undefined,
    });

    setName("");
    setDueDate("");
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && name.trim()) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Diamond className="h-4 w-4 text-primary" />
            Add Milestone
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-md">
          <p className="text-body-sm text-muted-foreground">
            Adding to: <span className="font-medium text-foreground">{phaseName}</span>
          </p>
          <div className="space-y-2">
            <Label>Milestone Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Design review complete"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Due Date (optional)
            </Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!name.trim() || createMilestone.isPending}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
