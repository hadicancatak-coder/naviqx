import { MousePointer2, StickyNote, Type, ListTodo, Palette, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ToolType = "select" | "sticky" | "text" | "task";

interface WhiteboardToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  activeColor: string;
  onColorChange: (color: string) => void;
  onDelete: () => void;
  hasSelection: boolean;
}

const PRESET_COLORS = [
  { name: "Yellow", value: "#fef08a" },
  { name: "Pink", value: "#fce7f3" },
  { name: "Blue", value: "#dbeafe" },
  { name: "Green", value: "#dcfce7" },
  { name: "Purple", value: "#f3e8ff" },
  { name: "Orange", value: "#fed7aa" },
];

const TOOLS: { type: ToolType; icon: typeof MousePointer2; label: string }[] = [
  { type: "select", icon: MousePointer2, label: "Select" },
  { type: "sticky", icon: StickyNote, label: "Sticky Note" },
  { type: "text", icon: Type, label: "Text" },
  { type: "task", icon: ListTodo, label: "Task" },
];

export function WhiteboardToolbar({
  activeTool,
  onToolChange,
  activeColor,
  onColorChange,
  onDelete,
  hasSelection,
}: WhiteboardToolbarProps) {
  return (
    <div className="absolute bottom-md left-1/2 -translate-x-1/2 liquid-glass-elevated rounded-xl p-sm flex items-center gap-xs">
      {/* Tool buttons */}
      {TOOLS.map(({ type, icon: Icon, label }) => (
        <Button
          key={type}
          variant={activeTool === type ? "default" : "ghost"}
          size="icon"
          onClick={() => onToolChange(type)}
          title={label}
          className="h-9 w-9"
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}

      {/* Separator */}
      <div className="w-px h-6 bg-border mx-xs" />

      {/* Color picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            title="Color"
          >
            <div className="relative">
              <Palette className="h-4 w-4" />
              <div
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-background"
                style={{ backgroundColor: activeColor }}
              />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-sm" align="center">
          <div className="grid grid-cols-3 gap-xs">
            {PRESET_COLORS.map(({ name, value }) => (
              <button
                key={value}
                onClick={() => onColorChange(value)}
                className={cn(
                  "w-8 h-8 rounded-md transition-all hover:scale-110",
                  activeColor === value && "ring-2 ring-primary ring-offset-2"
                )}
                style={{ backgroundColor: value }}
                title={name}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        disabled={!hasSelection}
        title="Delete selected"
        className={cn(
          "h-9 w-9",
          hasSelection && "text-destructive hover:text-destructive hover:bg-destructive/10"
        )}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
