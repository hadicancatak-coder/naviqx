import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, subDays, isToday } from "date-fns";

interface DailyLogDateNavProps {
  date: Date;
  onDateChange: (date: Date) => void;
}

export function DailyLogDateNav({ date, onDateChange }: DailyLogDateNavProps) {
  return (
    <div className="flex items-center gap-sm">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onDateChange(subDays(date, 1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-body-sm font-medium text-foreground min-w-[160px] text-center">
        {format(date, "EEEE, d MMM")}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onDateChange(addDays(date, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="text-metadata"
        disabled={isToday(date)}
        onClick={() => onDateChange(new Date())}
      >
        Today
      </Button>
    </div>
  );
}
