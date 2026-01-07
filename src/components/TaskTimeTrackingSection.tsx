import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Clock, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TaskTimeTrackingSectionProps {
  taskId: string;
  estimatedHours?: number | null;
  actualHours?: number | null;
  onUpdate?: () => void;
}

export function TaskTimeTrackingSection({
  taskId,
  estimatedHours,
  actualHours,
  onUpdate,
}: TaskTimeTrackingSectionProps) {
  const [estimated, setEstimated] = useState(estimatedHours?.toString() || "");
  const [actual, setActual] = useState(actualHours?.toString() || "");

  const updateEstimatedHours = async (value: string) => {
    const hours = parseFloat(value) || null;
    const { error } = await supabase
      .from("tasks")
      .update({ estimated_hours: hours })
      .eq("id", taskId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setEstimated(value);
      onUpdate?.();
    }
  };

  const updateActualHours = async (value: string) => {
    const hours = parseFloat(value) || null;
    const { error } = await supabase
      .from("tasks")
      .update({ actual_hours: hours })
      .eq("id", taskId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setActual(value);
      onUpdate?.();
    }
  };

  const estimatedNum = parseFloat(estimated) || 0;
  const actualNum = parseFloat(actual) || 0;
  const progress = estimatedNum > 0 ? Math.min((actualNum / estimatedNum) * 100, 100) : 0;
  const isOvertime = actualNum > estimatedNum && estimatedNum > 0;
  const percentOver = estimatedNum > 0 ? ((actualNum - estimatedNum) / estimatedNum) * 100 : 0;

  return (
    <div className="space-y-md">
      <div className="flex items-center gap-xs">
        <Clock className="h-4 w-4" />
        <h3 className="font-semibold">Time Tracking</h3>
      </div>

      <div className="grid grid-cols-2 gap-md">
        <div className="space-y-xs">
          <Label className="text-body-sm">Estimated Hours</Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            placeholder="0"
            value={estimated}
            onChange={(e) => setEstimated(e.target.value)}
            onBlur={(e) => updateEstimatedHours(e.target.value)}
          />
        </div>

        <div className="space-y-xs">
          <Label className="text-body-sm">Actual Hours</Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            placeholder="0"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            onBlur={(e) => updateActualHours(e.target.value)}
          />
        </div>
      </div>

      {estimatedNum > 0 && (
        <div className="space-y-xs">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {actualNum}h / {estimatedNum}h
            </span>
          </div>
          <Progress
            value={progress}
            className={isOvertime ? "bg-destructive/20" : ""}
          />
          {isOvertime && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>{percentOver.toFixed(0)}% over estimate</strong> - Task is taking longer than planned
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {estimatedNum > 0 && actualNum > 0 && !isOvertime && (
        <div className="flex items-center gap-xs">
          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
            On Track
          </Badge>
          <span className="text-xs text-muted-foreground">
            {(estimatedNum - actualNum).toFixed(1)}h remaining
          </span>
        </div>
      )}
    </div>
  );
}
