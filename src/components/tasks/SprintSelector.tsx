import { useSprints } from "@/hooks/useSprints";
import { cn } from "@/lib/utils";

interface SprintSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}

export function SprintSelector({ value, onChange, className }: SprintSelectorProps) {
  const { sprints, isLoading } = useSprints();

  return (
    <select
      value={value || "none"}
      onChange={(event) => onChange(event.target.value === "none" ? null : event.target.value)}
      disabled={isLoading}
      className={cn(
        "h-9 w-full rounded-lg border border-input bg-card px-sm text-body-sm text-foreground outline-none transition-smooth focus:border-primary/30 focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      aria-label="Sprint"
    >
      <option value="none">{isLoading ? "Loading sprints..." : "No sprint (Backlog)"}</option>
      {sprints.map((sprint) => (
        <option key={sprint.id} value={sprint.id}>
          {sprint.name}
        </option>
      ))}
    </select>
  );
}
