import { useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { WhiteboardItem } from "@/hooks/useWhiteboard";

interface MinimapProps {
  items: WhiteboardItem[];
  transform: { x: number; y: number; scale: number };
  containerWidth: number;
  containerHeight: number;
  onNavigate: (x: number, y: number) => void;
  className?: string;
}

const MINIMAP_WIDTH = 160;
const MINIMAP_HEIGHT = 100;
const MINIMAP_PADDING = 10;

export function Minimap({
  items,
  transform,
  containerWidth,
  containerHeight,
  onNavigate,
  className,
}: MinimapProps) {
  // Calculate bounds of all items
  const bounds = useMemo(() => {
    if (items.length === 0) {
      return { minX: 0, minY: 0, maxX: 1000, maxY: 600, width: 1000, height: 600 };
    }

    const minX = Math.min(0, ...items.map((i) => i.x));
    const minY = Math.min(0, ...items.map((i) => i.y));
    const maxX = Math.max(1000, ...items.map((i) => i.x + i.width));
    const maxY = Math.max(600, ...items.map((i) => i.y + i.height));

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [items]);

  // Calculate scale to fit bounds in minimap
  const minimapScale = useMemo(() => {
    const scaleX = (MINIMAP_WIDTH - MINIMAP_PADDING * 2) / bounds.width;
    const scaleY = (MINIMAP_HEIGHT - MINIMAP_PADDING * 2) / bounds.height;
    return Math.min(scaleX, scaleY);
  }, [bounds]);

  // Convert canvas coordinates to minimap coordinates
  const toMinimap = useCallback(
    (x: number, y: number) => ({
      x: MINIMAP_PADDING + (x - bounds.minX) * minimapScale,
      y: MINIMAP_PADDING + (y - bounds.minY) * minimapScale,
    }),
    [bounds, minimapScale]
  );

  // Calculate viewport rectangle
  const viewport = useMemo(() => {
    const viewportLeft = -transform.x / transform.scale;
    const viewportTop = -transform.y / transform.scale;
    const viewportWidth = containerWidth / transform.scale;
    const viewportHeight = containerHeight / transform.scale;

    const topLeft = toMinimap(viewportLeft, viewportTop);

    return {
      x: topLeft.x,
      y: topLeft.y,
      width: viewportWidth * minimapScale,
      height: viewportHeight * minimapScale,
    };
  }, [transform, containerWidth, containerHeight, toMinimap, minimapScale]);

  // Handle click to navigate
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Convert minimap click to canvas coordinates
      const canvasX = (clickX - MINIMAP_PADDING) / minimapScale + bounds.minX;
      const canvasY = (clickY - MINIMAP_PADDING) / minimapScale + bounds.minY;

      // Center the view on this point
      const newX = -canvasX * transform.scale + containerWidth / 2;
      const newY = -canvasY * transform.scale + containerHeight / 2;

      onNavigate(newX, newY);
    },
    [minimapScale, bounds, transform.scale, containerWidth, containerHeight, onNavigate]
  );

  // Get color for item type
  const getItemColor = (item: WhiteboardItem) => {
    if (item.type === "sticky") return item.color || "#fef08a";
    if (item.type === "task") return "hsl(var(--primary))";
    return "hsl(var(--muted-foreground))";
  };

  return (
    <div
      className={cn(
        "bg-card/90 backdrop-blur-sm border border-border rounded-lg shadow-sm overflow-hidden cursor-pointer",
        className
      )}
      style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
      onClick={handleClick}
    >
      {/* Grid background */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" className="text-border">
          <defs>
            <pattern
              id="minimap-grid"
              width={10}
              height={10}
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 10 0 L 0 0 0 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#minimap-grid)" />
        </svg>
      </div>

      {/* Items */}
      <svg width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT} className="absolute inset-0">
        {items.map((item) => {
          const pos = toMinimap(item.x, item.y);
          const w = item.width * minimapScale;
          const h = item.height * minimapScale;

          return (
            <rect
              key={item.id}
              x={pos.x}
              y={pos.y}
              width={Math.max(2, w)}
              height={Math.max(2, h)}
              fill={getItemColor(item)}
              rx={1}
              opacity={0.8}
            />
          );
        })}

        {/* Viewport indicator */}
        <rect
          x={viewport.x}
          y={viewport.y}
          width={viewport.width}
          height={viewport.height}
          fill="hsl(var(--primary) / 0.1)"
          stroke="hsl(var(--primary))"
          strokeWidth={1.5}
          rx={2}
        />
      </svg>
    </div>
  );
}
