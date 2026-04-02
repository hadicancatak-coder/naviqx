import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [customTagInput, setCustomTagInput] = useState("");

  const filteredTags = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return TASK_TAGS;
    }

    return TASK_TAGS.filter((tag) => {
      return tag.label.toLowerCase().includes(query) || tag.value.toLowerCase().includes(query);
    });
  }, [searchQuery]);

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
    <div className="space-y-xs">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          if (!disabled) {
            setOpen((previousOpen) => !previousOpen);
          }
        }}
        className={cn(
          "flex min-h-[44px] w-full items-center justify-between rounded-md border border-input bg-card px-sm py-xs text-left transition-smooth",
          "hover:bg-accent hover:text-accent-foreground",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <div className="flex flex-1 flex-wrap gap-xs">
          {value.length === 0 ? (
            <span className="text-muted-foreground">Select tags...</span>
          ) : (
            value.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className={cn("gap-xs border", getTagStyle(tag))}
              >
                {getTagLabel(tag)}
                {!disabled && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => removeTag(tag, e)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        removeTag(tag, e as unknown as React.MouseEvent);
                      }
                    }}
                    className="rounded-full p-xs transition-smooth hover:bg-foreground/10"
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </Badge>
            ))
          )}
        </div>
        <ChevronsUpDown className={cn("ml-xs h-4 w-4 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
      </button>

      {open && !disabled && (
        <div className="rounded-lg border border-border bg-card p-xs shadow-sm">
          <Input
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-9"
          />

          <div className="mt-xs max-h-[200px] space-y-1 overflow-y-auto hide-scrollbar">
            {filteredTags.length === 0 ? (
              <div className="py-md text-center text-body-sm text-muted-foreground">No tags found.</div>
            ) : (
              filteredTags.map((tag) => {
                const isSelected = value.includes(tag.value);

                return (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() => toggleTag(tag.value)}
                    className="flex w-full items-center gap-sm rounded-md px-sm py-xs text-left transition-smooth hover:bg-muted"
                  >
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border transition-smooth",
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input",
                      )}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </div>

                    <Badge variant="outline" className={cn("border", tag.color)}>
                      {tag.label}
                    </Badge>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-xs border-t border-border pt-xs">
            <div className="flex gap-xs">
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
                className="h-8 px-sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
