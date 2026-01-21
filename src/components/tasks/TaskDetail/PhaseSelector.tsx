import { useEffect, useState } from "react";
import { Milestone, ChevronRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectTimelines, ProjectTimeline } from "@/hooks/useProjects";

interface PhaseSelectorProps {
  projectId: string | null;
  value: string | null;
  onChange: (phaseId: string | null) => void;
}

export function PhaseSelector({ projectId, value, onChange }: PhaseSelectorProps) {
  const { timelines, isLoading } = useProjectTimelines(projectId);

  if (!projectId || isLoading) {
    return null;
  }

  if (!timelines || timelines.length === 0) {
    return null;
  }

  return (
    <div className="space-y-xs">
      <Label className="text-metadata text-muted-foreground flex items-center gap-1">
        <Milestone className="h-3.5 w-3.5" />
        Project Phase
      </Label>
      <Select
        value={value || "none"}
        onValueChange={(v) => {
          const newValue = v === "none" ? null : v;
          onChange(newValue);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="No phase" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">No phase</span>
          </SelectItem>
          {timelines.map((phase) => (
            <SelectItem key={phase.id} value={phase.id}>
              <div className="flex items-center gap-2">
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <span>{phase.phase_name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
