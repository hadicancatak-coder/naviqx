import { MousePointer2, StickyNote, Type, ListTodo, Palette, Trash2, ArrowRight, Settings2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ConnectorLineStyle } from "@/hooks/useWhiteboard";

export type ToolType = "select" | "sticky" | "text" | "task" | "shape" | "connect";

interface WhiteboardToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  activeColor: string;
  onColorChange: (color: string) => void;
  onDelete: () => void;
  hasSelection: boolean;
  // Connector options
  selectedConnectorId?: string | null;
  connectorLabel?: string;
  connectorLineStyle?: ConnectorLineStyle;
  connectorColor?: string;
  onConnectorLabelChange?: (label: string) => void;
  onConnectorLineStyleChange?: (style: ConnectorLineStyle) => void;
  onConnectorColorChange?: (color: string) => void;
}

const PRESET_COLORS = [
  // Pastels
  { name: "Yellow", value: "#fef08a" },
  { name: "Pink", value: "#fce7f3" },
  { name: "Blue", value: "#dbeafe" },
  { name: "Green", value: "#dcfce7" },
  { name: "Purple", value: "#f3e8ff" },
  { name: "Orange", value: "#fed7aa" },
  // Neutrals
  { name: "White", value: "#ffffff" },
  { name: "Light Gray", value: "#f1f5f9" },
  { name: "Gray", value: "#94a3b8" },
  { name: "Dark", value: "#334155" },
  { name: "Black", value: "#1e293b" },
  // Accent
  { name: "Red", value: "#fecaca" },
];

const CONNECTOR_COLORS = [
  { name: "Gray", value: "#64748b" },
  { name: "Black", value: "#1e293b" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Red", value: "#ef4444" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Orange", value: "#f97316" },
];

const TOOLS: { type: ToolType; icon: typeof MousePointer2; label: string }[] = [
  { type: "select", icon: MousePointer2, label: "Select (V)" },
  { type: "sticky", icon: StickyNote, label: "Sticky Note (S)" },
  { type: "text", icon: Type, label: "Text (T)" },
  { type: "task", icon: ListTodo, label: "Task (K)" },
  { type: "shape", icon: Circle, label: "Shape (O)" },
  { type: "connect", icon: ArrowRight, label: "Connect (C)" },
];

export function WhiteboardToolbar({
  activeTool,
  onToolChange,
  activeColor,
  onColorChange,
  onDelete,
  hasSelection,
  selectedConnectorId,
  connectorLabel = "",
  connectorLineStyle = "solid",
  connectorColor = "#64748b",
  onConnectorLabelChange,
  onConnectorLineStyleChange,
  onConnectorColorChange,
}: WhiteboardToolbarProps) {
  const showConnectorOptions = !!selectedConnectorId;

  return (
    <div className="absolute top-md left-1/2 -translate-x-1/2 liquid-glass-elevated rounded-xl p-sm flex items-center gap-xs shadow-lg z-20">
      {/* Tool buttons */}
      {TOOLS.map(({ type, icon: Icon, label }) => (
        <Button
          key={type}
          variant={activeTool === type ? "default" : "ghost"}
          size="icon"
          onClick={() => onToolChange(type)}
          title={label}
          className={cn(
            "h-9 w-9 transition-all",
            activeTool === type && "shadow-sm"
          )}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}

      {/* Separator */}
      <div className="w-px h-6 bg-border mx-xs" />

      {/* Color picker for items */}
      {!showConnectorOptions && (
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
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background shadow-sm"
                  style={{ backgroundColor: activeColor }}
                />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-sm" align="center" sideOffset={8}>
            <div className="grid grid-cols-4 gap-sm">
              {PRESET_COLORS.map(({ name, value }) => (
                <button
                  key={value}
                  onClick={() => onColorChange(value)}
                  className={cn(
                    "w-8 h-8 rounded-md transition-all hover:scale-110 border border-border/50",
                    activeColor === value && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                  style={{ backgroundColor: value }}
                  title={name}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Connector options when connector is selected */}
      {showConnectorOptions && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              title="Connector Options"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-md" align="center" sideOffset={8}>
            <div className="space-y-md">
              <div className="space-y-xs">
                <Label className="text-metadata">Label</Label>
                <Input
                  value={connectorLabel}
                  onChange={(e) => onConnectorLabelChange?.(e.target.value)}
                  placeholder="Add label..."
                  className="h-8"
                />
              </div>
              
              <div className="space-y-xs">
                <Label className="text-metadata">Line Style</Label>
                <Select
                  value={connectorLineStyle}
                  onValueChange={(v) => onConnectorLineStyleChange?.(v as ConnectorLineStyle)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="dashed">Dashed</SelectItem>
                    <SelectItem value="dotted">Dotted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-xs">
                <Label className="text-metadata">Color</Label>
                <div className="flex gap-xs flex-wrap">
                  {CONNECTOR_COLORS.map(({ name, value }) => (
                    <button
                      key={value}
                      onClick={() => onConnectorColorChange?.(value)}
                      className={cn(
                        "w-6 h-6 rounded-full transition-all hover:scale-110",
                        connectorColor === value && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      )}
                      style={{ backgroundColor: value }}
                      title={name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Separator */}
      <div className="w-px h-6 bg-border mx-xs" />

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        disabled={!hasSelection}
        title="Delete selected (Del)"
        className={cn(
          "h-9 w-9 transition-all",
          hasSelection && "text-destructive hover:text-destructive hover:bg-destructive/10"
        )}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
