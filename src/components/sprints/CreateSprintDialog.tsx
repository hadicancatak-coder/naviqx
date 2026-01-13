import { useState } from "react";
import { Sprint } from "@/hooks/useSprints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addDays, format } from "date-fns";

interface CreateSprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSprint?: Sprint | null;
  onSubmit: (data: {
    name: string;
    goal: string;
    start_date: string;
    end_date: string;
    status: Sprint['status'];
  }) => void;
  isSubmitting?: boolean;
}

export function CreateSprintDialog({
  open,
  onOpenChange,
  editingSprint,
  onSubmit,
  isSubmitting,
}: CreateSprintDialogProps) {
  const today = new Date();
  const defaultEndDate = addDays(today, 14);

  const [formData, setFormData] = useState({
    name: editingSprint?.name || "",
    goal: editingSprint?.goal || "",
    start_date: editingSprint?.start_date || format(today, 'yyyy-MM-dd'),
    end_date: editingSprint?.end_date || format(defaultEndDate, 'yyyy-MM-dd'),
    status: editingSprint?.status || "planning" as Sprint['status'],
  });

  // Reset form when dialog opens/closes or editing sprint changes
  useState(() => {
    if (editingSprint) {
      setFormData({
        name: editingSprint.name,
        goal: editingSprint.goal || "",
        start_date: editingSprint.start_date,
        end_date: editingSprint.end_date,
        status: editingSprint.status,
      });
    } else {
      setFormData({
        name: "",
        goal: "",
        start_date: format(today, 'yyyy-MM-dd'),
        end_date: format(defaultEndDate, 'yyyy-MM-dd'),
        status: "planning",
      });
    }
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.start_date || !formData.end_date) return;
    onSubmit(formData);
    onOpenChange(false);
    // Reset form
    setFormData({
      name: "",
      goal: "",
      start_date: format(today, 'yyyy-MM-dd'),
      end_date: format(defaultEndDate, 'yyyy-MM-dd'),
      status: "planning",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingSprint ? "Edit Sprint" : "Create Sprint"}</DialogTitle>
          <DialogDescription>
            {editingSprint ? "Update sprint details" : "Create a new sprint iteration"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-md py-md">
          <div className="space-y-xs">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Sprint 1"
            />
          </div>

          <div className="space-y-xs">
            <Label htmlFor="goal">Goal (optional)</Label>
            <Textarea
              id="goal"
              value={formData.goal}
              onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value }))}
              placeholder="What should we accomplish this sprint?"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-md">
            <div className="space-y-xs">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-xs">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-xs">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(v: Sprint['status']) => setFormData(prev => ({ ...prev, status: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.name || !formData.start_date || !formData.end_date || isSubmitting}
          >
            {editingSprint ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
