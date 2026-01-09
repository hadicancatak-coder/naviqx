import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { ConnectorLineStyle } from "@/hooks/useWhiteboard";

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
  lineStyle?: ConnectorLineStyle;
  label?: string;
  isSelected?: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onLabelChange?: (label: string) => void;
}

function calculatePath(from: ConnectorPoint, to: ConnectorPoint): string {
  const dx = to.x - from.x;
  const controlPointOffset = Math.min(Math.abs(dx) * 0.5, 100);
  
  const cx1 = from.x + controlPointOffset;
  const cy1 = from.y;
  const cx2 = to.x - controlPointOffset;
  const cy2 = to.y;
  
  return `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`;
}

function getMidpoint(from: ConnectorPoint, to: ConnectorPoint): ConnectorPoint {
  // Calculate midpoint of bezier curve (approximate)
  const dx = to.x - from.x;
  const controlPointOffset = Math.min(Math.abs(dx) * 0.5, 100);
  
  const t = 0.5;
  const cx1 = from.x + controlPointOffset;
  const cy1 = from.y;
  const cx2 = to.x - controlPointOffset;
  const cy2 = to.y;
  
  // Bezier curve formula at t=0.5
  const x = Math.pow(1-t, 3) * from.x + 
            3 * Math.pow(1-t, 2) * t * cx1 + 
            3 * (1-t) * Math.pow(t, 2) * cx2 + 
            Math.pow(t, 3) * to.x;
  const y = Math.pow(1-t, 3) * from.y + 
            3 * Math.pow(1-t, 2) * t * cy1 + 
            3 * (1-t) * Math.pow(t, 2) * cy2 + 
            Math.pow(t, 3) * to.y;
  
  return { x, y };
}

function getStrokeDasharray(style: ConnectorLineStyle): string | undefined {
  switch (style) {
    case "dashed":
      return "8 4";
    case "dotted":
      return "2 4";
    default:
      return undefined;
  }
}

export function WhiteboardConnector({
  id,
  from,
  to,
  color = "#64748b",
  strokeWidth = 2,
  lineStyle = "solid",
  label = "",
  isSelected,
  onSelect,
  onDelete,
  onLabelChange,
}: WhiteboardConnectorProps) {
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [localLabel, setLocalLabel] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalLabel(label);
  }, [label]);

  useEffect(() => {
    if (isEditingLabel && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingLabel]);

  const path = calculatePath(from, to);
  const midpoint = getMidpoint(from, to);
  const dasharray = getStrokeDasharray(lineStyle);

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

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingLabel(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onDelete();
    }
  };

  const handleLabelBlur = () => {
    setIsEditingLabel(false);
    if (localLabel !== label) {
      onLabelChange?.(localLabel);
    }
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLabelBlur();
    }
    if (e.key === "Escape") {
      setLocalLabel(label);
      setIsEditingLabel(false);
    }
  };

  return (
    <g
      className={cn(
        "cursor-pointer transition-opacity",
        isSelected && "opacity-100"
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
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
        d={path}
        fill="none"
        stroke={isSelected ? "hsl(var(--primary))" : color}
        strokeWidth={isSelected ? strokeWidth + 1 : strokeWidth}
        strokeLinecap="round"
        strokeDasharray={dasharray}
        className="pointer-events-none transition-all"
      />
      
      {/* Arrow head */}
      <polygon
        points={`${to.x},${to.y} ${arrow1X},${arrow1Y} ${arrow2X},${arrow2Y}`}
        fill={isSelected ? "hsl(var(--primary))" : color}
        className="pointer-events-none transition-all"
      />
      
      {/* Label */}
      {(label || isEditingLabel) && (
        <foreignObject
          x={midpoint.x - 60}
          y={midpoint.y - 12}
          width={120}
          height={24}
          className="pointer-events-auto"
        >
          {isEditingLabel ? (
            <input
              ref={inputRef}
              type="text"
              value={localLabel}
              onChange={(e) => setLocalLabel(e.target.value)}
              onBlur={handleLabelBlur}
              onKeyDown={handleLabelKeyDown}
              className="w-full h-full px-2 text-center text-metadata bg-background border border-primary rounded shadow-sm outline-none"
              style={{ fontSize: "12px" }}
            />
          ) : (
            <div
              className={cn(
                "w-full h-full flex items-center justify-center text-metadata font-medium",
                "bg-background/90 rounded px-2 shadow-sm border border-border/50"
              )}
              style={{ fontSize: "12px" }}
            >
              {label}
            </div>
          )}
        </foreignObject>
      )}
      
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
