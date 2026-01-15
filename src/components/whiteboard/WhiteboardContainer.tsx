import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { WhiteboardItem, getConnectionPoint } from "./WhiteboardItem";
import { WhiteboardConnector } from "./WhiteboardConnector";
import { WhiteboardToolbar, ToolType } from "./WhiteboardToolbar";
import { ZoomControls } from "./ZoomControls";
import { Minimap } from "./Minimap";
import { useCanvasTransform } from "@/hooks/useCanvasTransform";
import type { 
  WhiteboardItem as WhiteboardItemData, 
  WhiteboardConnector as WhiteboardConnectorData,
  ConnectorLineStyle 
} from "@/hooks/useWhiteboard";
import { cn } from "@/lib/utils";

interface WhiteboardContainerProps {
  items: WhiteboardItemData[];
  connectors: WhiteboardConnectorData[];
  onCreateItem: (params: {
    type: "sticky" | "text" | "task" | "shape";
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

// Virtual canvas size for infinite feel
const VIRTUAL_SIZE = 10000;
const VIRTUAL_OFFSET = VIRTUAL_SIZE / 2;

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

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

  // Canvas transform (pan/zoom)
  const {
    transform,
    setTransform,
    isPanning,
    isSpacePressed,
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    zoomIn,
    zoomOut,
    zoomToFit,
    resetZoom,
    screenToCanvas,
  } = useCanvasTransform();

  // Observe container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Attach wheel listener for zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

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

      // Zoom shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        zoomIn();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();
        zoomOut();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        resetZoom();
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
        case "o":
          setActiveTool("shape");
          break;
        case "c":
          if (!e.ctrlKey && !e.metaKey) {
            setActiveTool("connect");
          }
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
  }, [selectedItemId, selectedConnectorId, onDeleteItem, onDeleteConnector, zoomIn, zoomOut, resetZoom]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only create if clicking directly on the canvas background
    const target = e.target as HTMLElement;
    if (!target.classList.contains('canvas-background')) return;

    // Don't create while panning
    if (isPanning) return;

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

    // Create new item at click position (convert screen to canvas coords)
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const { x, y } = screenToCanvas(screenX, screenY);

    const itemType = activeTool as "sticky" | "text" | "task" | "shape";
    onCreateItem({
      type: itemType,
      x: Math.round(x),
      y: Math.round(y),
      color: (activeTool === "sticky" || activeTool === "shape") ? activeColor : undefined,
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

  const handleItemMove = useCallback((id: string, x: number, y: number) => {
    setLocalItems(prev => new Map(prev).set(id, { ...prev.get(id), x, y }));
  }, []);

  const handleItemResize = useCallback((id: string, width: number, height: number) => {
    setLocalItems(prev => new Map(prev).set(id, { ...prev.get(id), width, height }));
  }, []);

  const handleItemContentChange = useCallback((id: string, content: string) => {
    setLocalItems(prev => new Map(prev).set(id, { ...prev.get(id), content }));
  }, []);

  const handleItemSave = useCallback((id: string) => {
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
  }, [localItems, onUpdateItem, onSaveItem]);

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

  const handleZoomToFit = useCallback(() => {
    zoomToFit(items, containerSize.width, containerSize.height);
  }, [items, containerSize, zoomToFit]);

  const handleMinimapNavigate = useCallback((x: number, y: number) => {
    setTransform(prev => ({ ...prev, x, y }));
  }, [setTransform]);

  // Calculate connector endpoints with memoization
  const connectorEndpoints = useMemo(() => {
    const endpoints = new Map<string, { from: { x: number; y: number }; to: { x: number; y: number } } | null>();
    
    for (const connector of connectors) {
      const fromItem = items.find(i => i.id === connector.from_item_id);
      const toItem = items.find(i => i.id === connector.to_item_id);
      
      if (!fromItem || !toItem) {
        endpoints.set(connector.id, null);
        continue;
      }
      
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
      
      endpoints.set(connector.id, { from: bestFrom, to: bestTo });
    }
    
    return endpoints;
  }, [connectors, items, getItemWithLocalUpdates]);

  // Get cursor style based on current mode
  const getCursorClass = () => {
    if (isPanning || isSpacePressed) return "cursor-grab";
    if (activeTool === "connect") return "cursor-crosshair";
    if (activeTool !== "select") return "cursor-cell";
    return "cursor-default";
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full min-h-[500px] overflow-hidden bg-card",
        getCursorClass()
      )}
      onPointerDown={handlePanStart}
      onPointerMove={handlePanMove}
      onPointerUp={handlePanEnd}
      onClick={handleCanvasClick}
    >
      {/* Grid background - fixed position, scales with zoom */}
      <div
        className="canvas-background absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border) / 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border) / 0.3) 1px, transparent 1px)
          `,
          backgroundSize: `${40 * transform.scale}px ${40 * transform.scale}px`,
          backgroundPosition: `${transform.x}px ${transform.y}px`,
        }}
      />

      {/* Transformed Canvas Layer for items and connectors */}
      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          willChange: "transform",
        }}
      >
        {/* SVG layer for connectors */}
        <svg
          className="absolute overflow-visible pointer-events-none"
          style={{ left: 0, top: 0, width: 1, height: 1 }}
        >
          {connectors.map((connector) => {
            const endpoints = connectorEndpoints.get(connector.id);
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
            scale={transform.scale}
            showConnectionPoints={activeTool === "connect"}
          />
        ))}
      </div>

      {/* Connection in progress indicator */}
      {connectingFrom && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-md py-sm rounded-lg text-body-sm shadow-lg z-20">
          Click another element to connect
        </div>
      )}

      {/* Toolbar - top center */}
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

      {/* Zoom Controls - bottom left */}
      <ZoomControls
        scale={transform.scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomToFit={handleZoomToFit}
        onResetZoom={resetZoom}
        className="absolute bottom-4 left-4 z-10"
      />

      {/* Minimap - bottom right */}
      <Minimap
        items={items}
        transform={transform}
        containerWidth={containerSize.width}
        containerHeight={containerSize.height}
        onNavigate={handleMinimapNavigate}
        className="absolute bottom-4 right-4 z-10"
      />
    </div>
  );
}
