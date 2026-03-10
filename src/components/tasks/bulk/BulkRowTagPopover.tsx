import { useState } from "react";
import { Tag, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TASK_TAGS } from "@/lib/constants";

interface BulkRowTagPopoverProps {
  value: string[];
  onChange: (tags: string[]) => void;
}

export function BulkRowTagPopover({ value, onChange }: BulkRowTagPopoverProps) {
  const [open, setOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const toggleTag = (tag: string) => {
    const normalized = tag.toLowerCase();
    const newValue = value.includes(normalized)
      ? value.filter((t) => t !== normalized)
      : [...value, normalized];
    onChange(newValue);
  };

  const addCustomTag = () => {
    if (!customInput.trim()) return;
    const normalized = customInput.trim().toLowerCase();
    if (!value.includes(normalized)) {
      onChange([...value, normalized]);
    }
    setCustomInput("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className={cn(
            "shrink-0",
            value.length > 0
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={value.length > 0 ? `${value.length} tag(s)` : "Add tags"}
        >
          <Tag className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[240px] p-0 bg-popover border-border z-popover"
        align="end"
      >
        <Command>
          <CommandInput placeholder="Search tags..." className="h-9 border-none" />
          <CommandList className="max-h-[180px] hide-scrollbar">
            <CommandEmpty>No tags found.</CommandEmpty>
            <CommandGroup>
              {TASK_TAGS.map((tag) => (
                <CommandItem
                  key={tag.value}
                  value={tag.label}
                  onSelect={() => toggleTag(tag.value)}
                  className="cursor-pointer transition-smooth"
                >
                  <Check
                    className={cn(
                      "mr-2 h-3.5 w-3.5 transition-opacity",
                      value.includes(tag.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Badge variant="outline" className={cn("border text-metadata", tag.color)}>
                    {tag.label}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <div className="p-1.5 border-t border-border">
            <div className="flex gap-1.5">
              <Input
                placeholder="Custom tag..."
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
                className="h-7 text-metadata"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={addCustomTag}
                disabled={!customInput.trim()}
                className="h-7 px-2"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
