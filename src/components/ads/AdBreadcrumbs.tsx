import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdBreadcrumbsProps {
  entity?: string;
  campaign?: string;
  adGroup?: string;
  adName?: string;
  className?: string;
}

export function AdBreadcrumbs({ entity, campaign, adGroup, adName, className }: AdBreadcrumbsProps) {
  const segments = [
    entity && { label: entity, key: 'entity' },
    campaign && { label: campaign, key: 'campaign' },
    adGroup && { label: adGroup, key: 'adGroup' },
    adName && { label: adName, key: 'adName' },
  ].filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-xs text-body-sm text-muted-foreground px-md py-xs border-b bg-muted/20", className)}>
      {segments.map((segment, index) => (
        <div key={segment!.key} className="flex items-center gap-xs">
          {index > 0 && <ChevronRight className="h-3 w-3" />}
          <span className={index === segments.length - 1 ? "font-medium text-foreground" : ""}>
            {segment!.label}
          </span>
        </div>
      ))}
    </div>
  );
}
