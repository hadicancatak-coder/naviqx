import { differenceInDays } from "date-fns";
import { ChevronDown, User2, Layers, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ProjectTimeline } from "@/hooks/useProjects";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Extended step type with optional roadmap metadata
interface ExtendedStep extends ProjectTimeline {
  startDate: Date;
  endDate: Date;
  status?: string;
  owner?: string | null;
  system_name?: string | null;
  expected_outcomes?: string[];
}

interface StepCardProps {
  step: ExtendedStep;
  left: number;
  width: number;
  colorClasses: { bg: string; border: string; text: string };
  progress: number;
  isActive: boolean;
  onClick: () => void;
  isAdmin?: boolean;
  onDelete?: () => void;
  onStatusChange?: (status: string) => void;
}

// Status colors - reflects status, not priority
const statusColors: Record<string, { badge: string; ring: string }> = {
  not_started: { badge: "bg-muted text-muted-foreground", ring: "" },
  in_progress: { badge: "bg-primary/20 text-primary", ring: "ring-2 ring-primary/30" },
  blocked: { badge: "bg-destructive/20 text-destructive-text", ring: "ring-2 ring-destructive/30" },
  completed: { badge: "bg-success/20 text-success-text", ring: "" },
};

const stepStatuses = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
];

export function StepCard({
  step,
  left,
  width,
  colorClasses,
  progress,
  isActive,
  onClick,
  isAdmin,
  onDelete,
  onStatusChange,
}: StepCardProps) {
  const status = step.status || "not_started";
  const owner = step.owner;
  const systemName = step.system_name;
  const expectedOutcomes: string[] = step.expected_outcomes || [];
  const statusStyle = statusColors[status] || statusColors.not_started;

  const durationDays = differenceInDays(step.endDate, step.startDate) + 1;
  const durationText = durationDays > 7 
    ? `${Math.round(durationDays / 7)}w` 
    : `${durationDays}d`;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleStatusChange = (newStatus: string) => {
    onStatusChange?.(newStatus);
  };

  return (
    <div
      className={cn(
        "absolute rounded-xl cursor-pointer group transition-all duration-200",
        "backdrop-blur-md border-2 hover:shadow-lg hover:scale-[1.01] hover:z-10",
        colorClasses.bg,
        colorClasses.border,
        isActive && statusStyle.ring,
        status === "completed" && "opacity-75"
      )}
      style={{ 
        left: `${left}%`, 
        width: `${width}%`, 
        minWidth: "480px",
        height: "104px",
      }}
      onClick={onClick}
    >
      <div className="h-full p-md flex flex-col justify-between overflow-hidden">
        {/* Header row: Title + Duration + Delete + Expand icon */}
        <div className="flex items-start justify-between gap-sm">
          <div className="flex-1 min-w-0">
            {/* Step Title - Large and prominent */}
            <h4 className="text-body font-bold truncate leading-tight text-foreground">
              {step.phase_name}
            </h4>
            
            {/* Owner · System · Status row */}
            <div className="flex items-center gap-xs mt-xs flex-wrap">
              {owner && (
                <span className="flex items-center gap-xs text-metadata text-muted-foreground">
                  <User2 className="h-3 w-3" />
                  {owner}
                </span>
              )}
              {systemName && (
                <span className="flex items-center gap-xs text-metadata text-muted-foreground">
                  <Layers className="h-3 w-3" />
                  {systemName}
                </span>
              )}
              {(owner || systemName) && (
                <span className="text-muted-foreground/50">·</span>
              )}
              {isAdmin && onStatusChange ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={handleStatusClick}>
                    {/* eslint-disable-next-line no-restricted-syntax -- px-1.5/py-0.5 are fine-grained badge sizing */}
                    <button className={cn(
                      "px-1.5 py-0.5 rounded text-metadata font-medium capitalize cursor-pointer",
                      "hover:ring-2 hover:ring-offset-1 hover:ring-primary/30 transition-all",
                      statusStyle.badge
                    )}>
                      {status.replace("_", " ")}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="liquid-glass-dropdown">
                    {stepStatuses.map((s) => (
                      <DropdownMenuItem
                        key={s.value}
                        onClick={() => handleStatusChange(s.value)}
                        className={cn(
                          "cursor-pointer",
                          status === s.value && "bg-accent"
                        )}
                      >
                        <span className={cn(
                          "w-2 h-2 rounded-full mr-xs",
                          statusColors[s.value]?.badge.replace("text-", "bg-").split(" ")[0]
                        )} />
                        {s.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                // eslint-disable-next-line no-restricted-syntax -- px-1.5/py-0.5 are fine-grained badge sizing
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-metadata font-medium capitalize",
                  statusStyle.badge
                )}>
                  {status.replace("_", " ")}
                </span>
              )}
            </div>
          </div>

          {/* Duration badge + delete + expand icon */}
          <div className="flex items-center gap-xs shrink-0">
            {/* eslint-disable-next-line no-restricted-syntax -- px-2/py-0.5 are fine-grained badge sizing */}
            <span className="text-metadata font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {durationText}
            </span>
            {isAdmin && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
            <ChevronDown className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Expected Outcomes (truncated to 2 lines) */}
        {expectedOutcomes.length > 0 && (
          <div className="text-metadata text-muted-foreground mt-xs space-y-xs flex-1 min-h-0 overflow-hidden">
            <p className="font-medium text-foreground/70 mb-xs">Expected Outcomes:</p>
            {expectedOutcomes.slice(0, 2).map((outcome, idx) => (
              <p key={idx} className="truncate pl-xs">– {outcome}</p>
            ))}
            {expectedOutcomes.length > 2 && (
              <p className="text-muted-foreground/60 pl-xs">+{expectedOutcomes.length - 2} more</p>
            )}
          </div>
        )}

        {/* Progress bar - always at bottom */}
        <div className="flex items-center gap-sm mt-auto pt-xs">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-metadata font-semibold min-w-[3ch] text-foreground">
            {progress}%
          </span>
        </div>
      </div>
    </div>
  );
}
