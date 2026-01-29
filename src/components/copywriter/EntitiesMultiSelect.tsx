import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useSystemEntities } from "@/hooks/useSystemEntities";

interface EntitiesMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function EntitiesMultiSelect({ value, onChange, disabled }: EntitiesMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const { data: systemEntities = [] } = useSystemEntities();

  const handleSelect = (entity: string) => {
    if (value.includes(entity)) {
      onChange(value.filter((e) => e !== entity));
    } else {
      onChange([...value, entity]);
    }
  };

  const handleRemove = (entity: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== entity));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-[44px] py-2"
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {value.length > 0 ? (
              value.map((entity) => (
                <Badge
                  key={entity}
                  variant="secondary"
                  className="mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {entity}
                  <span
                    role="button"
                    tabIndex={0}
                    className="ml-1 rounded-full outline-none hover:bg-muted cursor-pointer inline-flex"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleRemove(entity, e);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => handleRemove(entity, e)}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">Select entities...</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 max-h-[250px]" align="start">
        <Command className="border-border bg-popover">
          <CommandInput placeholder="Search entities..." />
          <CommandEmpty>No entity found.</CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-auto">
            {systemEntities.map((entity) => (
              <CommandItem
                key={entity.id}
                value={entity.name}
                onSelect={() => handleSelect(entity.name)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value.includes(entity.name) ? "opacity-100" : "opacity-0"
                  )}
                />
                {entity.emoji} {entity.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
