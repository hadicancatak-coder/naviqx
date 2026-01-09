import { useRef } from "react";
import { cn } from "@/lib/utils";

interface ConnectorPoint {
  x: number;
  y: number;
}

interface WhiteboardConnectorProps {
  id: string;
  from: ConnectorPoint;
  to: ConnectorPoint;
  color?: string;
  strokeWidth?: number;
  isSelected?: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function calculatePath(from: ConnectorPoint, to: ConnectorPoint): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  
  // Use a smooth bezier curve
  const controlPointOffset = Math.min(Math.abs(dx) * 0.5, 100);
  
  // Determine curve direction based on relative positions
  const cx1 = from.x + controlPointOffset;
  const cy1 = from.y;
  const cx2 = to.x - controlPointOffset;
  const cy2 = to.y;
  
  return `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`;
}

export function WhiteboardConnector({
  id,
  from,
  to,
  color = "#64748b",
  strokeWidth = 2,
  isSelected,
  onSelect,
  onDelete,
}: WhiteboardConnectorProps) {
  const pathRef = useRef<SVGPathElement>(null);

  const path = calculatePath(from, to);

  // Calculate arrow head points
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const arrowLength = 12;
  const arrowAngle = Math.PI / 6;
  
  const arrow1X = to.x - arrowLength * Math.cos(angle - arrowAngle);
  const arrow1Y = to.y - arrowLength * Math.sin(angle - arrowAngle);
  const arrow2X = to.x - arrowLength * Math.cos(angle + arrowAngle);
  const arrow2Y = to.y - arrowLength * Math.sin(angle + arrowAngle);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onDelete();
    }
  };

  return (
    <g
      className={cn(
        "cursor-pointer transition-opacity",
        isSelected && "opacity-100"
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label="Connector"
    >
      {/* Invisible wider path for easier clicking */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="pointer-events-auto"
      />
      
      {/* Visible path */}
      <path
        ref={pathRef}
        d={path}
        fill="none"
        stroke={isSelected ? "hsl(var(--primary))" : color}
        strokeWidth={isSelected ? strokeWidth + 1 : strokeWidth}
        strokeLinecap="round"
        className="pointer-events-none transition-all"
      />
      
      {/* Arrow head */}
      <polygon
        points={`${to.x},${to.y} ${arrow1X},${arrow1Y} ${arrow2X},${arrow2Y}`}
        fill={isSelected ? "hsl(var(--primary))" : color}
        className="pointer-events-none transition-all"
      />
      
      {/* Selection indicator */}
      {isSelected && (
        <>
          <circle
            cx={from.x}
            cy={from.y}
            r={6}
            fill="hsl(var(--primary))"
            stroke="hsl(var(--background))"
            strokeWidth={2}
            className="pointer-events-none"
          />
          <circle
            cx={to.x}
            cy={to.y}
            r={6}
            fill="hsl(var(--primary))"
            stroke="hsl(var(--background))"
            strokeWidth={2}
            className="pointer-events-none"
          />
        </>
      )}
    </g>
  );
}
