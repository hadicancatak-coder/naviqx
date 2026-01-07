import { useState } from "react";
import { Check, ChevronsUpDown, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface EnhancedMultiSelectProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  allowCustom?: boolean;
  onAddCustom?: (value: string) => Promise<void>;
  customPlaceholder?: string;
}

export function EnhancedMultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  allowCustom = false,
  onAddCustom,
  customPlaceholder = "Add new...",
}: EnhancedMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const handleRemove = (value: string) => {
    onChange(selected.filter((item) => item !== value));
  };

  const handleAddCustom = async () => {
    if (!customValue.trim() || !onAddCustom) return;
    
    setIsAdding(true);
    try {
      await onAddCustom(customValue.trim());
      setCustomValue("");
      setShowAddDialog(false);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-11"
          >
            <div className="flex flex-wrap gap-1">
              {selected.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                selected.map((value) => {
                  const option = options.find((opt) => opt.value === value);
                  return (
                    <Badge key={value} variant="secondary" className="gap-1">
                      {option?.label || value}
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(value);
                        }}
                        className="ml-1 ring-offset-background rounded-full outline-none hover:bg-accent cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleRemove(value);
                          }
                        }}
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </Badge>
                  );
                })
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandEmpty>
              {allowCustom ? (
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => {
                    setOpen(false);
                    setShowAddDialog(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {customPlaceholder}
                </Button>
              ) : (
                "No options found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
              {allowCustom && (
                <CommandItem 
                  onSelect={() => {
                    setOpen(false);
                    setShowAddDialog(true);
                  }}
                  className="border-t border-border"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {customPlaceholder}
                </CommandItem>
              )}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Quick Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Option</DialogTitle>
            <DialogDescription>
              Add a new option to the list
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-md">
            <div>
              <Label htmlFor="custom-value">Name</Label>
              <Input 
                id="custom-value"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="Enter name..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCustom();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCustom} disabled={!customValue.trim() || isAdding}>
              {isAdding ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
