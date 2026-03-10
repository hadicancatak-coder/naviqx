import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subDays } from "date-fns";

interface CarryForwardBannerProps {
  unresolvedCount: number;
  onReviewYesterday: () => void;
}

export function CarryForwardBanner({ unresolvedCount, onReviewYesterday }: CarryForwardBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || unresolvedCount <= 0) return null;

  return (
    <div className="flex items-center gap-sm p-sm rounded-lg bg-warning-soft border border-warning/30 text-warning-text">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="text-body-sm flex-1">
        You have <strong>{unresolvedCount}</strong> unresolved {unresolvedCount === 1 ? 'entry' : 'entries'} from yesterday. Review and update them?
      </span>
      <Button variant="outline" size="sm" className="text-metadata" onClick={onReviewYesterday}>
        Review Yesterday
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDismissed(true)}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
