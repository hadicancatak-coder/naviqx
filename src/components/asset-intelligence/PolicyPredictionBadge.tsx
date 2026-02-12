import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAssetPolicyCheck } from "@/hooks/useAssetIntelligence";
import { cn } from "@/lib/utils";

interface PolicyPredictionBadgeProps {
  assetText: string;
  entity: string;
  className?: string;
}

export function PolicyPredictionBadge({ assetText, entity, className }: PolicyPredictionBadgeProps) {
  const { data: prediction } = useAssetPolicyCheck(assetText, entity);

  if (!prediction) return null;

  const isExact = prediction.matchType === "exact";
  const status = prediction.policy_status;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex items-center shrink-0", className)}>
          {status === "approved" && (
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          )}
          {status === "disapproved" && (
            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
          )}
          {status === "mixed" && (
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-[250px]">
        <div className="space-y-1">
          <p className="text-metadata font-medium">
            {isExact ? "Exact match" : "Similar asset"} in {prediction.entity}
          </p>
          <p className="text-metadata">
            Status: <span className={cn(
              "font-medium",
              status === "approved" && "text-success",
              status === "disapproved" && "text-destructive",
              status === "mixed" && "text-warning",
            )}>
              {status === "approved" ? "Previously Approved" : status === "disapproved" ? "Previously Disapproved" : "Mixed Results"}
            </span>
          </p>
          {prediction.interaction_rate > 0 && (
            <p className="text-metadata text-muted-foreground">
              Interaction rate: {prediction.interaction_rate}%
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
