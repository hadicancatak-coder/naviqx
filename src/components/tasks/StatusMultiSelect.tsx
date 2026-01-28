import { Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TASK_STATUSES } from "@/lib/constants";

interface StatusMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function StatusMultiSelect({ value, onChange }: StatusMultiSelectProps) {
  const handleToggle = (status: string) => {
    if (value.includes(status)) {
      onChange(value.filter(s => s !== status));
    } else {
      onChange([...value, status]);
    }
  };

  const handleSelectAll = () => {
    onChange(TASK_STATUSES.map(s => s.value));
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  return (
    <Select
      value={value.length > 0 ? "selected" : "all"}
      onValueChange={(val) => {
        if (val === "all") handleDeselectAll();
      }}
    >
      <SelectTrigger className="w-[110px] flex-shrink-0">
        <SelectValue>
          {value.length === 0 ? "Status" : 
           value.length === TASK_STATUSES.length ? "Status" : 
           `${value.length} Status`}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-background z-dropdown p-2">
        <div className="flex gap-1 mb-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              handleSelectAll();
            }}
            className="flex-1 h-7 text-xs px-2 rounded hover:bg-accent transition-smooth"
          >
            All
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              handleDeselectAll();
            }}
            className="flex-1 h-7 text-xs px-2 rounded hover:bg-accent transition-smooth"
          >
            None
          </button>
        </div>
        <div className="h-px bg-border mb-1" />
        {TASK_STATUSES.map((status) => (
          <div
            key={status.value}
            onClick={(e) => {
              e.preventDefault();
              handleToggle(status.value);
            }}
            className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent rounded text-body-sm"
          >
            <div className={cn(
              "flex items-center justify-center h-4 w-4 rounded border transition-smooth",
              value.includes(status.value) 
                ? "bg-primary border-primary text-primary-foreground" 
                : "border-input"
            )}>
              {value.includes(status.value) && <Check className="h-3 w-3" />}
            </div>
            <span>{status.label}</span>
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}
