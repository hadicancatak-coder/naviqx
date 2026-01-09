import { useState, useCallback, useEffect, useMemo } from "react";
import { WhiteboardItem, getConnectionPoint } from "./WhiteboardItem";
import { WhiteboardConnector } from "./WhiteboardConnector";
import { WhiteboardToolbar, ToolType } from "./WhiteboardToolbar";
import type { 
  WhiteboardItem as WhiteboardItemData, 
  WhiteboardConnector as WhiteboardConnectorData,
  ConnectorLineStyle 
} from "@/hooks/useWhiteboard";

interface WhiteboardContainerProps {
  items: WhiteboardItemData[];
  connectors: WhiteboardConnectorData[];
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
  onCreateConnector: (fromItemId: string, toItemId: string) => void;
  onUpdateConnector: (params: { id: string; label?: string; line_style?: ConnectorLineStyle; color?: string }) => void;
  onDeleteConnector: (id: string) => void;
}

const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 900;

export function WhiteboardContainer({
  items,
  connectors,
  onCreateItem,
  onUpdateItem,
  onSaveItem,
  onDeleteItem,
  onCreateConnector,
  onUpdateConnector,
  onDeleteConnector,
}: WhiteboardContainerProps) {
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [activeColor, setActiveColor] = useState("#fef08a");
  
  // Connection creation state
  const [connectingFrom, setConnectingFrom] = useState<{
    itemId: string;
    side: "top" | "right" | "bottom" | "left";
  } | null>(null);

  // Local state for optimistic updates during drag/resize
  const [localItems, setLocalItems] = useState<Map<string, Partial<WhiteboardItemData>>>(new Map());

  const selectedConnector = useMemo(() => 
    connectors.find(c => c.id === selectedConnectorId) || null,
    [connectors, selectedConnectorId]
  );

  const getItemWithLocalUpdates = useCallback((item: WhiteboardItemData) => {
    const localUpdate = localItems.get(item.id);
    if (localUpdate) {
      return { ...item, ...localUpdate };
    }
    return item;
  }, [localItems]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "v":
          setActiveTool("select");
          break;
        case "s":
          setActiveTool("sticky");
          break;
        case "t":
          setActiveTool("text");
          break;
        case "k":
          setActiveTool("task");
          break;
        case "c":
          setActiveTool("connect");
          break;
        case "delete":
        case "backspace":
          if (selectedItemId) {
            onDeleteItem(selectedItemId);
            setSelectedItemId(null);
          } else if (selectedConnectorId) {
            onDeleteConnector(selectedConnectorId);
            setSelectedConnectorId(null);
          }
          break;
        case "escape":
          setSelectedItemId(null);
          setSelectedConnectorId(null);
          setConnectingFrom(null);
          setActiveTool("select");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItemId, selectedConnectorId, onDeleteItem, onDeleteConnector]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only create if clicking directly on the canvas, not on an item
    if (e.target !== e.currentTarget) return;

    // Cancel connection creation if active
    if (connectingFrom) {
      setConnectingFrom(null);
      return;
    }

    // Deselect if using select or connect tool
    if (activeTool === "select" || activeTool === "connect") {
      setSelectedItemId(null);
      setSelectedConnectorId(null);
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
    // If we're in connect mode and connecting from an item
    if (activeTool === "connect" && connectingFrom && connectingFrom.itemId !== id) {
      onCreateConnector(connectingFrom.itemId, id);
      setConnectingFrom(null);
      return;
    }
    
    // If we're in connect mode, start connection from this item
    if (activeTool === "connect") {
      setConnectingFrom({ itemId: id, side: "right" });
      return;
    }

    setSelectedItemId(id);
    setSelectedConnectorId(null);
    
    // Update active color to match selected item
    const item = items.find(i => i.id === id);
    if (item?.color) {
      setActiveColor(item.color);
    }
  };

  const handleStartConnect = (itemId: string, side: "top" | "right" | "bottom" | "left") => {
    setConnectingFrom({ itemId, side });
    setActiveTool("connect");
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
    } else if (selectedConnectorId) {
      onDeleteConnector(selectedConnectorId);
      setSelectedConnectorId(null);
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

  const handleConnectorSelect = (id: string) => {
    setSelectedConnectorId(id);
    setSelectedItemId(null);
  };

  const handleConnectorDelete = (id: string) => {
    onDeleteConnector(id);
    setSelectedConnectorId(null);
  };

  const handleConnectorLabelChange = (label: string) => {
    if (selectedConnectorId) {
      onUpdateConnector({ id: selectedConnectorId, label });
    }
  };

  const handleConnectorLineStyleChange = (line_style: ConnectorLineStyle) => {
    if (selectedConnectorId) {
      onUpdateConnector({ id: selectedConnectorId, line_style });
    }
  };

  const handleConnectorColorChange = (color: string) => {
    if (selectedConnectorId) {
      onUpdateConnector({ id: selectedConnectorId, color });
    }
  };

  // Calculate connector endpoints
  const getConnectorEndpoints = (connector: WhiteboardConnectorData) => {
    const fromItem = items.find(i => i.id === connector.from_item_id);
    const toItem = items.find(i => i.id === connector.to_item_id);
    
    if (!fromItem || !toItem) return null;
    
    // Apply local updates
    const fromWithUpdates = getItemWithLocalUpdates(fromItem);
    const toWithUpdates = getItemWithLocalUpdates(toItem);
    
    // Find the best connection points (closest pair)
    const sides: ("top" | "right" | "bottom" | "left")[] = ["top", "right", "bottom", "left"];
    let bestFrom = getConnectionPoint(fromWithUpdates, "right");
    let bestTo = getConnectionPoint(toWithUpdates, "left");
    let minDist = Infinity;
    
    for (const fromSide of sides) {
      for (const toSide of sides) {
        const from = getConnectionPoint(fromWithUpdates, fromSide);
        const to = getConnectionPoint(toWithUpdates, toSide);
        const dist = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
        if (dist < minDist) {
          minDist = dist;
          bestFrom = from;
          bestTo = to;
        }
      }
    }
    
    return { from: bestFrom, to: bestTo };
  };

  return (
    <div className="relative flex items-center justify-center p-lg overflow-auto">
      {/* Canvas */}
      <div
        className="relative bg-card border border-border rounded-xl shadow-sm flex-shrink-0 overflow-hidden"
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

        {/* SVG layer for connectors */}
        <svg
          className="absolute inset-0 pointer-events-none overflow-visible"
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
        >
          {connectors.map((connector) => {
            const endpoints = getConnectorEndpoints(connector);
            if (!endpoints) return null;
            
            return (
              <WhiteboardConnector
                key={connector.id}
                id={connector.id}
                from={endpoints.from}
                to={endpoints.to}
                color={connector.color}
                strokeWidth={connector.stroke_width}
                lineStyle={connector.line_style}
                label={connector.label}
                isSelected={selectedConnectorId === connector.id}
                onSelect={() => handleConnectorSelect(connector.id)}
                onDelete={() => handleConnectorDelete(connector.id)}
                onLabelChange={(label) => onUpdateConnector({ id: connector.id, label })}
              />
            );
          })}
        </svg>

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
            onStartConnect={handleStartConnect}
            canvasWidth={CANVAS_WIDTH}
            canvasHeight={CANVAS_HEIGHT}
            showConnectionPoints={activeTool === "connect"}
          />
        ))}

        {/* Connection in progress indicator */}
        {connectingFrom && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-md py-sm rounded-lg text-body-sm shadow-lg">
            Click another element to connect
          </div>
        )}

        {/* Toolbar */}
        <WhiteboardToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          activeColor={activeColor}
          onColorChange={handleColorChange}
          onDelete={handleDelete}
          hasSelection={!!selectedItemId || !!selectedConnectorId}
          selectedConnectorId={selectedConnectorId}
          connectorLabel={selectedConnector?.label}
          connectorLineStyle={selectedConnector?.line_style}
          connectorColor={selectedConnector?.color}
          onConnectorLabelChange={handleConnectorLabelChange}
          onConnectorLineStyleChange={handleConnectorLineStyleChange}
          onConnectorColorChange={handleConnectorColorChange}
        />
      </div>
    </div>
  );
}
