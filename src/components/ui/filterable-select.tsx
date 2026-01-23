import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const FilterableSelect = SelectPrimitive.Root;
const FilterableSelectGroup = SelectPrimitive.Group;
const FilterableSelectValue = SelectPrimitive.Value;

const FilterableSelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-sm py-sm text-body-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
FilterableSelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const FilterableSelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-xs",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
FilterableSelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const FilterableSelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-xs",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
FilterableSelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

interface FilterableSelectContentProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> {
  searchPlaceholder?: string;
}

const FilterableSelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  FilterableSelectContentProps
>(({ className, children, position = "popper", searchPlaceholder = "Search...", ...props }, ref) => {
  const [search, setSearch] = React.useState("");
  
  // Filter children based on search
  const filteredChildren = React.useMemo(() => {
    if (!search) return children;
    
    return React.Children.toArray(children).filter((child) => {
      if (!React.isValidElement(child)) return true;
      
      // Check if it's a SelectItem
      if (child.type === FilterableSelectItem) {
        const itemText = child.props.children?.toString().toLowerCase() || "";
        const itemValue = child.props.value?.toString().toLowerCase() || "";
        return itemText.includes(search.toLowerCase()) || itemValue.includes(search.toLowerCase());
      }
      
      return true;
    });
  }, [children, search]);

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-[10003] max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        onWheel={(e) => {
          e.stopPropagation();
        }}
        {...props}
      >
        <div className="p-sm border-b bg-background sticky top-0 z-sticky">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
              onKeyDown={(e) => {
                // Prevent select from closing on Enter
                if (e.key === "Enter") {
                  e.preventDefault();
                }
              }}
            />
          </div>
        </div>
        <FilterableSelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-xs",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
          )}
        >
          {filteredChildren}
        </SelectPrimitive.Viewport>
        <FilterableSelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});
FilterableSelectContent.displayName = SelectPrimitive.Content.displayName;

const FilterableSelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-xs pl-8 pr-sm text-body-sm font-semibold", className)}
    {...props}
  />
));
FilterableSelectLabel.displayName = SelectPrimitive.Label.displayName;

const FilterableSelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-xs pl-8 pr-sm text-body-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
FilterableSelectItem.displayName = SelectPrimitive.Item.displayName;

const FilterableSelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-xs h-px bg-muted", className)}
    {...props}
  />
));
FilterableSelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  FilterableSelect,
  FilterableSelectGroup,
  FilterableSelectValue,
  FilterableSelectTrigger,
  FilterableSelectContent,
  FilterableSelectLabel,
  FilterableSelectItem,
  FilterableSelectSeparator,
  FilterableSelectScrollUpButton,
  FilterableSelectScrollDownButton,
};
