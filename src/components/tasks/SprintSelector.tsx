import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Zap, Calendar, CheckCircle2 } from "lucide-react";
import { useSprints } from "@/hooks/useSprints";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface SprintSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}

const statusIcons = {
  active: Zap,
  planning: Calendar,
  completed: CheckCircle2,
};

const statusColors = {
  active: "bg-success/15 text-success border-success/30",
  planning: "bg-primary/15 text-primary border-primary/30",
  completed: "bg-muted text-muted-foreground border-border",
};

export function SprintSelector({ value, onChange, className }: SprintSelectorProps) {
  const { sprints, isLoading } = useSprints();

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger className={cn("w-full", className)}>
          <SelectValue placeholder="Loading sprints..." />
        </SelectTrigger>
      </Select>
    );
  }

  const selectedSprint = sprints.find(s => s.id === value);

  return (
    <Select 
      value={value || "none"} 
      onValueChange={(v) => onChange(v === "none" ? null : v)}
    >
      <SelectTrigger className={cn("w-full", className)}>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          <SelectValue>
            {selectedSprint ? selectedSprint.name : "No sprint"}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">
          <span className="text-muted-foreground">No sprint (Backlog)</span>
        </SelectItem>
        
        {/* Active Sprint First */}
        {sprints.filter(s => s.status === 'active').map((sprint) => {
          const Icon = statusIcons[sprint.status];
          return (
            <SelectItem key={sprint.id} value={sprint.id}>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn("text-metadata px-1.5", statusColors[sprint.status])}>
                  <Icon className="h-3 w-3 mr-1" />
                  Active
                </Badge>
                <span>{sprint.name}</span>
                <span className="text-muted-foreground text-metadata">
                  {format(new Date(sprint.start_date), 'MMM d')} - {format(new Date(sprint.end_date), 'MMM d')}
                </span>
              </div>
            </SelectItem>
          );
        })}
        
        {/* Planning Sprints */}
        {sprints.filter(s => s.status === 'planning').map((sprint) => {
          const Icon = statusIcons[sprint.status];
          return (
            <SelectItem key={sprint.id} value={sprint.id}>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn("text-metadata px-1.5", statusColors[sprint.status])}>
                  <Icon className="h-3 w-3 mr-1" />
                  Planning
                </Badge>
                <span>{sprint.name}</span>
                <span className="text-muted-foreground text-metadata">
                  {format(new Date(sprint.start_date), 'MMM d')} - {format(new Date(sprint.end_date), 'MMM d')}
                </span>
              </div>
            </SelectItem>
          );
        })}

        {/* Completed Sprints (collapsed by default - show last 3) */}
        {sprints.filter(s => s.status === 'completed').slice(0, 3).map((sprint) => {
          const Icon = statusIcons[sprint.status];
          return (
            <SelectItem key={sprint.id} value={sprint.id}>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn("text-metadata px-1.5", statusColors[sprint.status])}>
                  <Icon className="h-3 w-3 mr-1" />
                  Done
                </Badge>
                <span className="text-muted-foreground">{sprint.name}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
