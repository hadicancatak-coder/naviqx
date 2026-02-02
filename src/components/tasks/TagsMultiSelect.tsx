import { useState } from "react";
import { Check, ChevronsUpDown, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TASK_TAGS } from "@/lib/constants";

interface TagsMultiSelectProps {
  value: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

export function TagsMultiSelect({ value, onChange, disabled = false }: TagsMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [customTagInput, setCustomTagInput] = useState("");

  const getTagStyle = (tag: string) => {
    const predefined = TASK_TAGS.find(t => t.value === tag.toLowerCase());
    return predefined?.color || "bg-muted text-muted-foreground border-border";
  };

  const getTagLabel = (tag: string) => {
    const predefined = TASK_TAGS.find(t => t.value === tag.toLowerCase());
    return predefined?.label || tag;
  };

  const toggleTag = (tag: string) => {
    if (disabled) return;
    const normalizedTag = tag.toLowerCase();
    const newValue = value.includes(normalizedTag)
      ? value.filter(t => t !== normalizedTag)
      : [...value, normalizedTag];
    onChange(newValue);
  };

  const addCustomTag = () => {
    if (!customTagInput.trim() || disabled) return;
    const normalizedTag = customTagInput.trim().toLowerCase();
    if (!value.includes(normalizedTag)) {
      onChange([...value, normalizedTag]);
    }
    setCustomTagInput("");
  };

  const removeTag = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(value.filter(t => t !== tag));
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <div
          role="combobox"
          aria-expanded={open}
          tabIndex={disabled ? -1 : 0}
          className={cn(
            "flex items-center w-full justify-between h-auto min-h-[44px] py-2 px-3 rounded border border-input bg-background",
            "hover:bg-accent hover:text-accent-foreground transition-smooth cursor-pointer",
            disabled && "pointer-events-none opacity-50"
          )}
        >
          <div className="flex flex-wrap gap-1.5 flex-1">
            {value.length === 0 ? (
              <span className="text-muted-foreground">Select tags...</span>
            ) : (
              value.map(tag => (
                <Badge 
                  key={tag} 
                  variant="outline"
                  className={cn("gap-1 pr-1 border", getTagStyle(tag))}
                >
                  {getTagLabel(tag)}
                  {!disabled && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => removeTag(tag, e)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          removeTag(tag, e as unknown as React.MouseEvent);
                        }
                      }}
                      className="ml-1 rounded-full hover:bg-foreground/10 p-xs transition-smooth cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  )}
                </Badge>
              ))
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[300px] p-0 bg-popover border-border z-popover" 
        align="start" 
        side="bottom" 
        sideOffset={5}
      >
        <Command>
          <CommandInput placeholder="Search tags..." className="border-none" />
          <CommandEmpty>No tags found.</CommandEmpty>
          <CommandList className="max-h-[200px] hide-scrollbar">
            <CommandGroup heading="Tags">
              {TASK_TAGS.map((tag) => (
                <CommandItem
                  key={tag.value}
                  value={tag.label}
                  onSelect={() => toggleTag(tag.value)}
                  className="cursor-pointer transition-smooth"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 transition-opacity",
                      value.includes(tag.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Badge variant="outline" className={cn("border", tag.color)}>
                    {tag.label}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          
          {/* Custom tag input */}
          <div className="p-2 border-t border-border">
            <div className="flex gap-2">
              <Input
                placeholder="Add custom tag..."
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
                className="h-8 text-body-sm"
              />
              <Button 
                type="button" 
                size="sm" 
                variant="secondary"
                onClick={addCustomTag}
                disabled={!customTagInput.trim()}
                className="h-8 px-2"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
