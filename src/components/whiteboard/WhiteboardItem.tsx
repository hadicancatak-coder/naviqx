import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { WhiteboardItem as WhiteboardItemType } from "@/hooks/useWhiteboard";
import { Badge } from "@/components/ui/badge";

interface WhiteboardItemProps {
  item: WhiteboardItemType;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, width: number, height: number) => void;
  onContentChange: (id: string, content: string) => void;
  onSave: (id: string) => void;
  canvasWidth: number;
  canvasHeight: number;
}

const MIN_WIDTH = 100;
const MIN_HEIGHT = 60;

export function WhiteboardItem({
  item,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onContentChange,
  onSave,
  canvasWidth,
  canvasHeight,
}: WhiteboardItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEditing) return;
    
    e.stopPropagation();
    onSelect(item.id);

    // Check if clicking resize handle
    const target = e.target as HTMLElement;
    if (target.dataset.resize === "true") {
      setIsResizing(true);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: item.width,
        height: item.height,
      });
    } else {
      setIsDragging(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    }

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging && containerRef.current) {
      const parentRect = containerRef.current.parentElement?.getBoundingClientRect();
      if (!parentRect) return;

      const newX = Math.max(0, Math.min(
        canvasWidth - item.width,
        e.clientX - parentRect.left - dragOffset.x
      ));
      const newY = Math.max(0, Math.min(
        canvasHeight - item.height,
        e.clientY - parentRect.top - dragOffset.y
      ));

      onMove(item.id, Math.round(newX), Math.round(newY));
    }

    if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      const newWidth = Math.max(MIN_WIDTH, Math.min(
        canvasWidth - item.x,
        resizeStart.width + deltaX
      ));
      const newHeight = Math.max(MIN_HEIGHT, Math.min(
        canvasHeight - item.y,
        resizeStart.height + deltaY
      ));

      onResize(item.id, Math.round(newWidth), Math.round(newHeight));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging || isResizing) {
      onSave(item.id);
    }
    setIsDragging(false);
    setIsResizing(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    onSave(item.id);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onContentChange(item.id, e.target.value);
  };

  const getItemStyles = () => {
    const baseStyles: React.CSSProperties = {
      position: "absolute",
      left: item.x,
      top: item.y,
      width: item.width,
      height: item.height,
      cursor: isDragging ? "grabbing" : "grab",
    };

    if (item.type === "sticky") {
      return {
        ...baseStyles,
        backgroundColor: item.color || "#fef08a",
      };
    }

    if (item.type === "text") {
      return baseStyles;
    }

    // Task type
    return baseStyles;
  };

  const renderContent = () => {
    if (isEditing) {
      return (
        <textarea
          ref={textareaRef}
          value={item.content}
          onChange={handleContentChange}
          onBlur={handleBlur}
          className="w-full h-full resize-none border-none outline-none bg-transparent p-sm text-body"
          style={{ cursor: "text" }}
        />
      );
    }

    if (item.type === "sticky") {
      return (
        <div className="p-sm h-full overflow-hidden">
          <p className="text-body text-foreground whitespace-pre-wrap break-words">
            {item.content || "Double-click to edit"}
          </p>
        </div>
      );
    }

    if (item.type === "text") {
      return (
        <div className="p-sm h-full overflow-hidden">
          <p className="text-body text-foreground whitespace-pre-wrap break-words">
            {item.content || "Double-click to edit"}
          </p>
        </div>
      );
    }

    // Task type
    const metadata = item.metadata as { status?: string; priority?: string; task_id?: string };
    return (
      <div className="p-sm h-full flex flex-col gap-xs overflow-hidden">
        <p className="text-body-sm font-medium text-foreground line-clamp-2">
          {item.content || "Task"}
        </p>
        <div className="flex gap-xs flex-wrap mt-auto">
          {metadata.status && (
            <Badge variant="secondary" className="text-metadata">
              {metadata.status}
            </Badge>
          )}
          {metadata.priority && (
            <Badge variant="outline" className="text-metadata">
              {metadata.priority}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      style={getItemStyles()}
      className={cn(
        "rounded-lg shadow-sm transition-shadow select-none touch-none",
        item.type === "sticky" && "shadow-md",
        item.type === "text" && "border border-dashed border-border",
        item.type === "task" && "bg-card border border-border",
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        isDragging && "shadow-lg z-50"
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      {renderContent()}

      {/* Resize handle */}
      {isSelected && (
        <div
          data-resize="true"
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          style={{
            background: "linear-gradient(135deg, transparent 50%, hsl(var(--primary)) 50%)",
            borderBottomRightRadius: "inherit",
          }}
        />
      )}
    </div>
  );
}
