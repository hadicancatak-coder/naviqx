import { useState, useCallback } from "react";
import { WhiteboardItem } from "./WhiteboardItem";
import { WhiteboardToolbar, ToolType } from "./WhiteboardToolbar";
import type { WhiteboardItem as WhiteboardItemData } from "@/hooks/useWhiteboard";

interface WhiteboardContainerProps {
  items: WhiteboardItemData[];
  onCreateItem: (params: {
    type: "sticky" | "text" | "task";
    x: number;
    y: number;
    color?: string;
  }) => void;
  onUpdateItem: (params: {
    id: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    content?: string;
    color?: string;
  }) => void;
  onSaveItem: (params: { id: string }) => void;
  onDeleteItem: (id: string) => void;
}

const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 900;

export function WhiteboardContainer({
  items,
  onCreateItem,
  onUpdateItem,
  onSaveItem,
  onDeleteItem,
}: WhiteboardContainerProps) {
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeColor, setActiveColor] = useState("#fef08a");

  // Local state for optimistic updates during drag/resize
  const [localItems, setLocalItems] = useState<Map<string, Partial<WhiteboardItemData>>>(new Map());

  const getItemWithLocalUpdates = useCallback((item: WhiteboardItemData) => {
    const localUpdate = localItems.get(item.id);
    if (localUpdate) {
      return { ...item, ...localUpdate };
    }
    return item;
  }, [localItems]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only create if clicking directly on the canvas, not on an item
    if (e.target !== e.currentTarget) return;

    // Deselect if using select tool
    if (activeTool === "select") {
      setSelectedItemId(null);
      return;
    }

    // Create new item at click position
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    onCreateItem({
      type: activeTool,
      x: Math.round(x),
      y: Math.round(y),
      color: activeTool === "sticky" ? activeColor : undefined,
    });

    // Switch back to select tool after creating
    setActiveTool("select");
  };

  const handleItemSelect = (id: string) => {
    setSelectedItemId(id);
    // Update active color to match selected item
    const item = items.find(i => i.id === id);
    if (item?.color) {
      setActiveColor(item.color);
    }
  };

  const handleItemMove = (id: string, x: number, y: number) => {
    setLocalItems(prev => new Map(prev).set(id, { ...prev.get(id), x, y }));
  };

  const handleItemResize = (id: string, width: number, height: number) => {
    setLocalItems(prev => new Map(prev).set(id, { ...prev.get(id), width, height }));
  };

  const handleItemContentChange = (id: string, content: string) => {
    setLocalItems(prev => new Map(prev).set(id, { ...prev.get(id), content }));
  };

  const handleItemSave = (id: string) => {
    const localUpdate = localItems.get(id);
    if (localUpdate) {
      onUpdateItem({ id, ...localUpdate });
      setLocalItems(prev => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    }
    onSaveItem({ id });
  };

  const handleDelete = () => {
    if (selectedItemId) {
      onDeleteItem(selectedItemId);
      setSelectedItemId(null);
    }
  };

  const handleColorChange = (color: string) => {
    setActiveColor(color);
    // If an item is selected, update its color
    if (selectedItemId) {
      onUpdateItem({ id: selectedItemId, color });
      onSaveItem({ id: selectedItemId });
    }
  };

  return (
    <div className="relative flex items-center justify-center p-lg overflow-auto">
      {/* Canvas */}
      <div
        className="relative bg-card border border-border rounded-xl shadow-sm flex-shrink-0"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        onClick={handleCanvasClick}
      >
        {/* Grid pattern background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Items */}
        {items.map((item) => (
          <WhiteboardItem
            key={item.id}
            item={getItemWithLocalUpdates(item)}
            isSelected={selectedItemId === item.id}
            onSelect={handleItemSelect}
            onMove={handleItemMove}
            onResize={handleItemResize}
            onContentChange={handleItemContentChange}
            onSave={handleItemSave}
            canvasWidth={CANVAS_WIDTH}
            canvasHeight={CANVAS_HEIGHT}
          />
        ))}

        {/* Toolbar */}
        <WhiteboardToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          activeColor={activeColor}
          onColorChange={handleColorChange}
          onDelete={handleDelete}
          hasSelection={!!selectedItemId}
        />
      </div>
    </div>
  );
}
