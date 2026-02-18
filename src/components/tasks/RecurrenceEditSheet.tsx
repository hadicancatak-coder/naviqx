import { useState, useEffect, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Eye } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { RecurrenceRule, calculateNextOccurrence, getRecurrenceLabelNew } from "@/lib/recurrenceUtils";

interface RecurrenceEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRule: RecurrenceRule | null;
  onSave: (rule: RecurrenceRule) => void;
  isPending?: boolean;
}

const DAYS_OF_WEEK = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
];

const defaultRule: RecurrenceRule = {
  type: "daily",
  interval: 1,
  end_condition: "never",
};

function RecurrencePreview({ rule, endCount, endDate }: { rule: RecurrenceRule; endCount: string; endDate?: Date }) {
  const preview = useMemo(() => {
    if (rule.type === 'none') return [];
    const finalRule: RecurrenceRule = {
      ...rule,
      end_value:
        rule.end_condition === 'after_n' ? parseInt(endCount, 10) :
        rule.end_condition === 'until_date' && endDate ? endDate.toISOString() :
        undefined,
    };
    const dates: Date[] = [];
    let current = new Date();
    for (let i = 0; i < 5; i++) {
      const next = calculateNextOccurrence(finalRule, current, i);
      if (!next) break;
      dates.push(next);
      current = next;
    }
    return dates;
  }, [rule, endCount, endDate]);

  const label = getRecurrenceLabelNew(rule);

  if (rule.type === 'none' || preview.length === 0) return null;

  return (
    <div className="border border-border rounded-lg p-sm bg-muted/30 space-y-xs">
      <div className="flex items-center gap-xs text-metadata font-medium text-muted-foreground">
        <Eye className="h-3.5 w-3.5" />
        <span>Preview — {label}</span>
      </div>
      <ul className="space-y-0.5">
        {preview.map((date, i) => (
          <li key={i} className="text-body-sm text-foreground flex items-center gap-xs">
            <span className="w-5 text-muted-foreground text-metadata text-right">{i + 1}.</span>
            {format(date, "EEE, MMM d, yyyy")}
          </li>
        ))}
      </ul>
      {preview.length >= 5 && (
        <p className="text-metadata text-muted-foreground italic">…and so on</p>
      )}
    </div>
  );
}

export function RecurrenceEditSheet({
  open,
  onOpenChange,
  currentRule,
  onSave,
  isPending,
}: RecurrenceEditSheetProps) {
  const [rule, setRule] = useState<RecurrenceRule>(currentRule || defaultRule);
  const [endDate, setEndDate] = useState<Date | undefined>(
    currentRule?.end_value && currentRule.end_condition === "until_date"
      ? new Date(currentRule.end_value as string)
      : undefined
  );
  const [endCount, setEndCount] = useState<string>(
    currentRule?.end_value && currentRule.end_condition === "after_n"
      ? String(currentRule.end_value)
      : "10"
  );

  // Reset form when sheet opens with new data
  useEffect(() => {
    if (open && currentRule) {
      setRule(currentRule);
      if (currentRule.end_condition === "until_date" && currentRule.end_value) {
        setEndDate(new Date(currentRule.end_value as string));
      }
      if (currentRule.end_condition === "after_n" && currentRule.end_value) {
        setEndCount(String(currentRule.end_value));
      }
    }
  }, [open, currentRule]);

  const handleTypeChange = (type: RecurrenceRule["type"]) => {
    setRule((prev) => ({
      ...prev,
      type,
      days_of_week: type === "weekly" ? prev.days_of_week || ["mon"] : undefined,
      day_of_month: type === "monthly" ? prev.day_of_month || 1 : undefined,
    }));
  };

  const handleDayToggle = (day: string) => {
    setRule((prev) => {
      const currentDays = prev.days_of_week || [];
      const newDays = currentDays.includes(day)
        ? currentDays.filter((d) => d !== day)
        : [...currentDays, day];
      return {
        ...prev,
        days_of_week: newDays.length > 0 ? newDays : ["mon"],
      };
    });
  };

  const handleEndConditionChange = (condition: RecurrenceRule["end_condition"]) => {
    setRule((prev) => ({
      ...prev,
      end_condition: condition,
      end_value:
        condition === "after_n"
          ? parseInt(endCount, 10)
          : condition === "until_date" && endDate
          ? endDate.toISOString()
          : undefined,
    }));
  };

  const handleSave = () => {
    const finalRule: RecurrenceRule = {
      ...rule,
      end_value:
        rule.end_condition === "after_n"
          ? parseInt(endCount, 10)
          : rule.end_condition === "until_date" && endDate
          ? endDate.toISOString()
          : undefined,
    };
    onSave(finalRule);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="liquid-glass-elevated sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit Recurrence</SheetTitle>
          <SheetDescription>
            Change how often this task repeats. Future instances will follow the new schedule.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-lg py-lg">
          {/* Frequency Type */}
          <div className="space-y-sm">
            <Label>Repeat</Label>
            <Select value={rule.type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Interval */}
          <div className="space-y-sm">
            <Label>Every</Label>
            <div className="flex items-center gap-sm">
              <Input
                type="number"
                min={1}
                max={30}
                value={rule.interval}
                onChange={(e) =>
                  setRule((prev) => ({
                    ...prev,
                    interval: Math.max(1, parseInt(e.target.value, 10) || 1),
                  }))
                }
                className="w-20"
              />
              <span className="text-body-sm text-muted-foreground">
                {rule.type === "daily"
                  ? rule.interval === 1
                    ? "day"
                    : "days"
                  : rule.type === "weekly"
                  ? rule.interval === 1
                    ? "week"
                    : "weeks"
                  : rule.interval === 1
                  ? "month"
                  : "months"}
              </span>
            </div>
          </div>

          {/* Days of week (for weekly) */}
          {rule.type === "weekly" && (
            <div className="space-y-sm">
              <Label>On days</Label>
              <div className="flex flex-wrap gap-xs">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    variant={rule.days_of_week?.includes(day.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDayToggle(day.value)}
                    className="w-12"
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Day of month (for monthly) */}
          {rule.type === "monthly" && (
            <div className="space-y-sm">
              <Label>On day</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={rule.day_of_month || 1}
                onChange={(e) =>
                  setRule((prev) => ({
                    ...prev,
                    day_of_month: Math.min(31, Math.max(1, parseInt(e.target.value, 10) || 1)),
                  }))
                }
                className="w-20"
              />
            </div>
          )}

          {/* End Condition */}
          <div className="space-y-sm">
            <Label>Ends</Label>
            <Select value={rule.end_condition} onValueChange={handleEndConditionChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="after_n">After N occurrences</SelectItem>
                <SelectItem value="until_date">On a specific date</SelectItem>
              </SelectContent>
            </Select>

            {rule.end_condition === "after_n" && (
              <div className="flex items-center gap-sm mt-sm">
                <Label className="text-body-sm">After</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={endCount}
                  onChange={(e) => setEndCount(e.target.value)}
                  className="w-20"
                />
                <span className="text-body-sm text-muted-foreground">occurrences</span>
              </div>
            )}

            {rule.end_condition === "until_date" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-sm",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {/* Live Preview */}
        <RecurrencePreview rule={rule} endCount={endCount} endDate={endDate} />

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
