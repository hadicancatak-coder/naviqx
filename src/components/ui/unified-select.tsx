import * as React from "react";
import { Check, ChevronsUpDown, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  avatar?: { name: string; src?: string };
  disabled?: boolean;
}

interface BaseUnifiedSelectProps {
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  onAddCustom?: (value: string) => Promise<void>;
  className?: string;
  triggerClassName?: string;
}

interface SingleModeProps extends BaseUnifiedSelectProps {
  mode: "single";
  value: string;
  onChange: (value: string) => void;
}

interface MultiModeProps extends BaseUnifiedSelectProps {
  mode: "multi";
  value: string[];
  onChange: (value: string[]) => void;
}

export type UnifiedSelectProps = SingleModeProps | MultiModeProps;

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UnifiedSelect(props: UnifiedSelectProps) {
  const {
    options,
    placeholder = "Select...",
    searchPlaceholder = "Search...",
    emptyText = "No options found.",
    disabled = false,
    allowCustom = false,
    onAddCustom,
    className,
    triggerClassName,
    mode,
  } = props;

  const [open, setOpen] = React.useState(false);
  const [customValue, setCustomValue] = React.useState("");
  const [isAddingCustom, setIsAddingCustom] = React.useState(false);

  const isMulti = mode === "multi";
  const value = props.value;
  const onChange = props.onChange;

  const selectedOptions = React.useMemo(() => {
    if (isMulti) {
      return options.filter((opt) => (value as string[]).includes(opt.value));
    }
    return options.filter((opt) => opt.value === value);
  }, [options, value, isMulti]);

  const handleSelect = (optionValue: string) => {
    if (isMulti) {
      const currentValue = value as string[];
      const multiOnChange = onChange as (value: string[]) => void;
      if (currentValue.includes(optionValue)) {
        multiOnChange(currentValue.filter((v) => v !== optionValue));
      } else {
        multiOnChange([...currentValue, optionValue]);
      }
    } else {
      const singleOnChange = onChange as (value: string) => void;
      singleOnChange(optionValue);
      setOpen(false);
    }
  };

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMulti) {
      const multiOnChange = onChange as (value: string[]) => void;
      multiOnChange((value as string[]).filter((v) => v !== optionValue));
    }
  };

  const handleAddCustom = async () => {
    if (!customValue.trim() || !onAddCustom) return;
    setIsAddingCustom(true);
    try {
      await onAddCustom(customValue.trim());
      setCustomValue("");
    } finally {
      setIsAddingCustom(false);
    }
  };

  const renderTriggerContent = () => {
    if (isMulti) {
      const multiValue = value as string[];
      if (multiValue.length === 0) {
        return <span className="text-muted-foreground">{placeholder}</span>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {selectedOptions.slice(0, 3).map((opt) => (
            <Badge key={opt.value} variant="secondary" className="gap-1 px-2 py-0.5">
              {opt.avatar && (
                <span className="h-4 w-4 rounded-full bg-primary/20 text-[10px] flex items-center justify-center">
                  {getInitials(opt.avatar.name)}
                </span>
              )}
              {opt.icon}
              <span className="truncate max-w-[80px]">{opt.label}</span>
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive transition-smooth"
                onClick={(e) => handleRemove(opt.value, e)}
              />
            </Badge>
          ))}
          {multiValue.length > 3 && (
            <Badge variant="secondary" className="px-2 py-0.5">
              +{multiValue.length - 3}
            </Badge>
          )}
        </div>
      );
    }

    const selectedOption = selectedOptions[0];
    if (!selectedOption) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }

    return (
      <span className="flex items-center gap-2 truncate">
        {selectedOption.avatar && (
          <span className="h-5 w-5 rounded-full bg-primary/20 text-[10px] flex items-center justify-center">
            {getInitials(selectedOption.avatar.name)}
          </span>
        )}
        {selectedOption.icon}
        <span className="truncate">{selectedOption.label}</span>
      </span>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-10 font-normal",
            triggerClassName
          )}
        >
          {renderTriggerContent()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[250px] p-0", className)} align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>
              {emptyText}
              {allowCustom && (
                <div className="mt-2 px-2">
                  <div className="flex gap-2">
                    <Input
                      value={customValue}
                      onChange={(e) => setCustomValue(e.target.value)}
                      placeholder="Add custom..."
                      className="h-8"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustom();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={handleAddCustom}
                      disabled={!customValue.trim() || isAddingCustom}
                      className="h-8 px-2"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = isMulti
                  ? (value as string[]).includes(option.value)
                  : value === option.value;

                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => handleSelect(option.value)}
                    disabled={option.disabled}
                    className="flex items-center gap-2"
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded border transition-smooth",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-input"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    {option.avatar && (
                      <span className="h-6 w-6 rounded-full bg-primary/20 text-[11px] flex items-center justify-center">
                        {getInitials(option.avatar.name)}
                      </span>
                    )}
                    {option.icon}
                    <span className="flex-1 truncate">{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          {allowCustom && options.length > 0 && (
            <div className="border-t border-border p-2">
              <div className="flex gap-2">
                <Input
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="Add custom..."
                  className="h-8"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustom();
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleAddCustom}
                  disabled={!customValue.trim() || isAddingCustom}
                  className="h-8 px-2"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Convenience wrappers
export function SingleSelect(
  props: Omit<SingleModeProps, "mode">
) {
  return <UnifiedSelect {...props} mode="single" />;
}

export function MultiSelect(
  props: Omit<MultiModeProps, "mode">
) {
  return <UnifiedSelect {...props} mode="multi" />;
}
