import { Milestone } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useProjectTimelines } from "@/hooks/useProjects";

interface PhaseSelectorProps {
  projectId: string | null;
  value: string | null;
  onChange: (phaseId: string | null) => void;
}

const nativeSelectClass =
  "h-9 w-full rounded-lg border border-input bg-card px-sm text-body-sm text-foreground outline-none transition-smooth focus:border-primary/30 focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function PhaseSelector({ projectId, value, onChange }: PhaseSelectorProps) {
  const { timelines, isLoading } = useProjectTimelines(projectId);

  if (!projectId || isLoading || !timelines || timelines.length === 0) {
    return null;
  }

  return (
    <div className="space-y-xs">
      <Label className="flex items-center gap-1 text-metadata text-muted-foreground">
        <Milestone className="h-3.5 w-3.5" />
        Project Phase
      </Label>
      <select
        value={value || "none"}
        onChange={(event) => onChange(event.target.value === "none" ? null : event.target.value)}
        className={nativeSelectClass}
        aria-label="Project phase"
      >
        <option value="none">No phase</option>
        {timelines.map((phase) => (
          <option key={phase.id} value={phase.id}>
            {phase.phase_name}
          </option>
        ))}
      </select>
    </div>
  );
}
