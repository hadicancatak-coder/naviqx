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
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

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

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

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
    // Only create if clicking directly on the canvas, not on an item
    if (e.target !== e.currentTarget) return;

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
    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const { x, y } = screenToCanvas(screenX, screenY);

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
    <div className="relative flex flex-col h-full">
      {/* Canvas Container */}
      <div
        ref={containerRef}
        className={cn(
          "relative flex-1 overflow-hidden bg-card border border-border rounded-xl",
          getCursorClass()
        )}
        onPointerDown={handlePanStart}
        onPointerMove={handlePanMove}
        onPointerUp={handlePanEnd}
        onClick={handleCanvasClick}
      >
        {/* Transformed Canvas Layer */}
        <div
          className="absolute origin-top-left pointer-events-none"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            willChange: "transform",
          }}
        >
          {/* Grid pattern background */}
          <div
            className="absolute pointer-events-none opacity-30"
            style={{
              left: -10000,
              top: -10000,
              width: 20000,
              height: 20000,
              backgroundImage: `
                linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }}
          />

          {/* SVG layer for connectors */}
          <svg
            className="absolute overflow-visible"
            style={{
              left: -10000,
              top: -10000,
              width: 20000,
              height: 20000,
              pointerEvents: "none",
            }}
          >
            <g style={{ transform: "translate(10000px, 10000px)" }}>
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
            </g>
          </svg>

          {/* Items */}
          <div className="pointer-events-auto" style={{ position: "absolute", left: 0, top: 0 }}>
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
        </div>

        {/* Connection in progress indicator */}
        {connectingFrom && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-md py-sm rounded-lg text-body-sm shadow-lg z-10">
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

        {/* Zoom Controls - bottom left */}
        <ZoomControls
          scale={transform.scale}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onZoomToFit={handleZoomToFit}
          onResetZoom={resetZoom}
          className="absolute bottom-md left-md z-10"
        />

        {/* Minimap - bottom right */}
        <Minimap
          items={items}
          transform={transform}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
          onNavigate={handleMinimapNavigate}
          className="absolute bottom-md right-md z-10"
        />
      </div>
    </div>
  );
}
