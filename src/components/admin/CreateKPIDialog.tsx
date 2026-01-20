import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useKPIs } from "@/hooks/useKPIs";
import { useAuth } from "@/hooks/useAuth";
import type { TeamKPI, KPITarget, KPIWithRelations } from "@/types/kpi";

interface CreateKPIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingKPI?: KPIWithRelations | null;
}

export function CreateKPIDialog({ open, onOpenChange, editingKPI }: CreateKPIDialogProps) {
  const { createKPI, updateKPI } = useKPIs();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [metricType, setMetricType] = useState("percentage");
  const [target, setTarget] = useState(100);
  const [deadline, setDeadline] = useState("");
  const [targets, setTargets] = useState<Partial<KPITarget>[]>([
    { target_type: "channel", target_name: "", target_value: 0, current_value: 0, unit: "" }
  ]);

  useEffect(() => {
    if (editingKPI) {
      setTitle(editingKPI.title);
      setDescription(editingKPI.description || "");
      setMetricType(editingKPI.metric_type);
      setTarget(editingKPI.target);
      setDeadline(editingKPI.deadline ? editingKPI.deadline.split('T')[0] : "");
      if (editingKPI.targets && editingKPI.targets.length > 0) {
        setTargets(editingKPI.targets);
      }
    } else {
      resetForm();
    }
  }, [editingKPI, open]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setMetricType("percentage");
    setTarget(100);
    setDeadline("");
    setTargets([{ target_type: "channel", target_name: "", target_value: 0, current_value: 0, unit: "" }]);
  };

  const handleAddTarget = () => {
    setTargets([...targets, { target_type: "channel", target_name: "", target_value: 0, current_value: 0, unit: "" }]);
  };

  const handleRemoveTarget = (index: number) => {
    setTargets(targets.filter((_, i) => i !== index));
  };

  const handleTargetChange = (index: number, field: keyof KPITarget, value: any) => {
    const newTargets = [...targets];
    newTargets[index] = { ...newTargets[index], [field]: value };
    setTargets(newTargets);
  };

  const handleSubmit = () => {
    if (!user) return;

    if (editingKPI) {
      updateKPI.mutate({ 
        id: editingKPI.id,
        title,
        description: description || null,
        metric_type: metricType,
        target,
        deadline: deadline || null,
      });
    } else {
      createKPI.mutate({
        title,
        description: description || null,
        metric_type: metricType,
        target,
        deadline: deadline || null,
        created_by: user.id,
        targets,
      } as any);
    }

    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingKPI ? "Edit KPI" : "Create New KPI"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-md">
          <div className="space-y-sm">
            <Label htmlFor="title">KPI Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Increase conversion rate"
            />
          </div>

          <div className="space-y-sm">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the KPI objectives and methodology..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-md">
            <div className="space-y-sm">
              <Label htmlFor="metricType">Metric Type *</Label>
              <Select value={metricType} onValueChange={setMetricType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                  <SelectItem value="ratio">Ratio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-sm">
              <Label htmlFor="target">Target Value *</Label>
              <Input
                id="target"
                type="number"
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                min={0}
              />
            </div>
          </div>

          <div className="space-y-sm">
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className="space-y-sm pt-md border-t">
            <div className="flex items-center justify-between">
              <Label>Targets</Label>
              <Button variant="outline" size="sm" onClick={handleAddTarget}>
                <Plus className="h-4 w-4 mr-sm" />
                Add Target
              </Button>
            </div>

            {targets.map((target, index) => (
              <div key={index} className="p-sm border rounded-lg space-y-sm">
                <div className="flex items-center justify-between">
                  <span className="text-body-sm font-medium">Target {index + 1}</span>
                  {targets.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTarget(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-sm">
                  <div className="space-y-sm">
                    <Label>Type</Label>
                    <Select
                      value={target.target_type}
                      onValueChange={(v) => handleTargetChange(index, "target_type", v)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="channel">Channel</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                        <SelectItem value="individual">Individual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-sm">
                    <Label>Name</Label>
                    <Input
                      className="h-8"
                      value={target.target_name}
                      onChange={(e) => handleTargetChange(index, "target_name", e.target.value)}
                      placeholder="Target name"
                    />
                  </div>

                  <div className="space-y-sm">
                    <Label>Target Value</Label>
                    <Input
                      className="h-8"
                      type="number"
                      value={target.target_value}
                      onChange={(e) => handleTargetChange(index, "target_value", Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-sm">
                    <Label>Current Value</Label>
                    <Input
                      className="h-8"
                      type="number"
                      value={target.current_value}
                      onChange={(e) => handleTargetChange(index, "current_value", Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-sm col-span-2">
                    <Label>Unit</Label>
                    <Input
                      className="h-8"
                      value={target.unit}
                      onChange={(e) => handleTargetChange(index, "unit", e.target.value)}
                      placeholder="e.g., %, $, conversions"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title}>
            {editingKPI ? "Update KPI" : "Create KPI"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}