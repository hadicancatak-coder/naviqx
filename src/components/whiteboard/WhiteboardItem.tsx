import { useState, useRef, useEffect, useCallback } from "react";
import { CheckSquare, StickyNote, Type, GripVertical } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { cn } from "@/lib/utils";
import type { WhiteboardItem as WhiteboardItemData } from "@/hooks/useWhiteboard";
import { TextFormatToolbar } from "./TextFormatToolbar";

interface WhiteboardItemProps {
  item: WhiteboardItemData;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, width: number, height: number) => void;
  onContentChange: (id: string, content: string) => void;
  onSave: (id: string) => void;
  onStartConnect?: (id: string, side: "top" | "right" | "bottom" | "left") => void;
  canvasWidth: number;
  canvasHeight: number;
  showConnectionPoints?: boolean;
}

const MIN_WIDTH = 120;
const MIN_HEIGHT = 80;

// Connection point positions relative to item
export function getConnectionPoint(
  item: { x: number; y: number; width: number; height: number },
  side: "top" | "right" | "bottom" | "left"
): { x: number; y: number } {
  switch (side) {
    case "top":
      return { x: item.x + item.width / 2, y: item.y };
    case "right":
      return { x: item.x + item.width, y: item.y + item.height / 2 };
    case "bottom":
      return { x: item.x + item.width / 2, y: item.y + item.height };
    case "left":
      return { x: item.x, y: item.y + item.height / 2 };
  }
}

export function WhiteboardItem({
  item,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onContentChange,
  onSave,
  onStartConnect,
  canvasWidth,
  canvasHeight,
  showConnectionPoints,
}: WhiteboardItemProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, itemX: 0, itemY: 0 });
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0 });

  // Track previous item ID to detect external changes
  const prevItemIdRef = useRef(item.id);

  // TipTap editor for rich text editing (text type only)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
    ],
    content: item.type === "text" ? (item.content || "<p></p>") : "",
    editable: true,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (item.type === "text") {
        onContentChange(item.id, editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none h-full w-full p-md",
          "[&>*]:m-0 [&>p]:text-body [&>h1]:text-heading-lg [&>h1]:font-bold",
          "[&>h2]:text-heading-md [&>h2]:font-semibold [&>h3]:text-heading-sm [&>h3]:font-medium"
        ),
      },
    },
  }, [item.id, item.type]);

  useEffect(() => {
    if (isEditing && textareaRef.current && item.type === "sticky") {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
    if (isEditing && editor && item.type === "text") {
      editor.commands.focus("end");
    }
  }, [isEditing, editor, item.type]);

  // Only sync content when item ID changes (item was replaced)
  useEffect(() => {
    if (editor && prevItemIdRef.current !== item.id) {
      editor.commands.setContent(item.content || "<p></p>");
      prevItemIdRef.current = item.id;
    }
  }, [editor, item.id, item.content]);

  const handleDragStart = (e: React.PointerEvent) => {
    if (isEditing || isResizing) return;
    e.stopPropagation();
    e.preventDefault();
    
    onSelect(item.id);
    
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      itemX: item.x,
      itemY: item.y,
    };
    
    setIsDragging(true);
    containerRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStartRef.current.mouseX;
      const deltaY = e.clientY - dragStartRef.current.mouseY;
      
      const newX = Math.max(0, Math.min(canvasWidth - item.width, dragStartRef.current.itemX + deltaX));
      const newY = Math.max(0, Math.min(canvasHeight - item.height, dragStartRef.current.itemY + deltaY));
      
      onMove(item.id, Math.round(newX), Math.round(newY));
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStartRef.current.mouseX;
      const deltaY = e.clientY - resizeStartRef.current.mouseY;
      
      const newWidth = Math.max(MIN_WIDTH, Math.min(canvasWidth - item.x, resizeStartRef.current.width + deltaX));
      const newHeight = Math.max(MIN_HEIGHT, Math.min(canvasHeight - item.y, resizeStartRef.current.height + deltaY));
      
      onResize(item.id, Math.round(newWidth), Math.round(newHeight));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging || isResizing) {
      containerRef.current?.releasePointerCapture(e.pointerId);
      setIsDragging(false);
      setIsResizing(false);
      onSave(item.id);
    }
  };

  const handleResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: item.width,
      height: item.height,
    };
    
    setIsResizing(true);
    containerRef.current?.setPointerCapture(e.pointerId);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type !== "task") {
      setIsEditing(true);
    }
  };

  const handleBlur = useCallback(() => {
    // Delay to allow clicking on format toolbar
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsEditing(false);
        onSave(item.id);
      }
    }, 100);
  }, [item.id, onSave]);

  const handleConnectionPointClick = (e: React.MouseEvent, side: "top" | "right" | "bottom" | "left") => {
    e.stopPropagation();
    onStartConnect?.(item.id, side);
  };

  const metadata = item.metadata as { status?: string; priority?: string; task_id?: string } | null;

  const getStatusClass = (status: string) => {
    const statusMap: Record<string, string> = {
      "To Do": "bg-muted text-muted-foreground",
      "In Progress": "bg-info-soft text-info-text",
      "In Review": "bg-warning-soft text-warning-text",
      "Done": "bg-success-soft text-success-text",
      "Blocked": "bg-destructive-soft text-destructive-text",
    };
    return statusMap[status] || "bg-muted text-muted-foreground";
  };

  const getPriorityClass = (priority: string) => {
    const priorityMap: Record<string, string> = {
      "High": "bg-destructive-soft text-destructive-text",
      "Medium": "bg-warning-soft text-warning-text",
      "Low": "bg-muted text-muted-foreground",
    };
    return priorityMap[priority] || "bg-muted text-muted-foreground";
  };

  const renderContent = () => {
    if (item.type === "task") {
      return (
        <div className="p-md h-full flex flex-col gap-sm overflow-hidden">
          <div className="flex items-start gap-sm">
            <CheckSquare className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-body font-medium text-foreground line-clamp-3 flex-1">
              {item.content || "Untitled Task"}
            </p>
          </div>
          <div className="flex gap-xs flex-wrap mt-auto">
            {metadata?.status && (
              <span className={cn("px-2 py-0.5 rounded-sm text-metadata font-medium", getStatusClass(metadata.status))}>
                {metadata.status}
              </span>
            )}
            {metadata?.priority && (
              <span className={cn("px-2 py-0.5 rounded-sm text-metadata font-medium", getPriorityClass(metadata.priority))}>
                {metadata.priority}
              </span>
            )}
          </div>
        </div>
      );
    }

    // Sticky notes use simple textarea
    if (item.type === "sticky") {
      if (isEditing) {
        return (
          <textarea
            ref={textareaRef}
            value={item.content || ""}
            onChange={(e) => onContentChange(item.id, e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => { if (e.key === "Escape") { setIsEditing(false); onSave(item.id); } }}
            className="w-full h-full resize-none border-none outline-none bg-transparent p-md text-body"
            placeholder="Add note..."
          />
        );
      }

      return (
        <div className="w-full h-full p-md overflow-hidden">
          <div className="flex items-start gap-sm">
            <StickyNote className="h-4 w-4 text-foreground/50 flex-shrink-0 mt-0.5" />
            <p className={cn("whitespace-pre-wrap break-words flex-1 text-body", !item.content && "text-muted-foreground")}>
              {item.content || "Double-click to edit"}
            </p>
          </div>
        </div>
      );
    }

    // Text items use TipTap rich text editor
    if (item.type === "text") {
      const isEmpty = !item.content || item.content === "<p></p>";
      return (
        <div 
          className="w-full h-full relative" 
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
        >
          {isEditing && <TextFormatToolbar editor={editor} />}
          {isEmpty && !isEditing && (
            <div className="absolute inset-0 p-md flex items-start gap-sm pointer-events-none">
              <Type className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span className="text-muted-foreground text-body">Click to edit text</span>
            </div>
          )}
          <div 
            className={cn("h-full", isEditing && "ring-2 ring-primary/20 rounded")}
            onBlur={handleBlur}
          >
            <EditorContent editor={editor} className="h-full [&_.ProseMirror]:h-full [&_.ProseMirror]:outline-none" />
          </div>
        </div>
      );
    }

    return null;
  };

  const ConnectionPoint = ({ side }: { side: "top" | "right" | "bottom" | "left" }) => {
    const positions: Record<string, string> = {
      top: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
      right: "top-1/2 right-0 translate-x-1/2 -translate-y-1/2",
      bottom: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
      left: "top-1/2 left-0 -translate-x-1/2 -translate-y-1/2",
    };

    return (
      <button
        className={cn(
          "absolute w-3 h-3 rounded-full bg-primary border-2 border-background",
          "opacity-0 group-hover:opacity-100 hover:scale-125 transition-all cursor-crosshair z-10",
          positions[side]
        )}
        onClick={(e) => handleConnectionPointClick(e, side)}
      />
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        backgroundColor: item.type === "sticky" ? (item.color || "#fef08a") : undefined,
        willChange: isDragging || isResizing ? "transform" : "auto",
      }}
      className={cn(
        "group select-none transition-shadow rounded-lg",
        item.type === "sticky" && "shadow-md",
        item.type === "text" && "border border-dashed border-border bg-card",
        item.type === "task" && "bg-card border border-border shadow-sm",
        isDragging && "shadow-xl cursor-grabbing z-50",
        isSelected && !isDragging && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        !isDragging && !isResizing && !isEditing && "cursor-grab hover:shadow-lg"
      )}
      onPointerDown={isEditing ? undefined : handleDragStart}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => { e.stopPropagation(); onSelect(item.id); }}
    >
      {isSelected && !isEditing && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2 opacity-50">
          <GripVertical className="h-4 w-4 text-foreground/50" />
        </div>
      )}

      {renderContent()}

      {isSelected && !isEditing && (
        <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" onPointerDown={handleResizeStart}>
          <svg viewBox="0 0 16 16" className="w-full h-full text-muted-foreground">
            <path d="M14 14L8 14L14 8Z" fill="currentColor" opacity={0.5} />
          </svg>
        </div>
      )}

      {(isSelected || showConnectionPoints) && !isEditing && (
        <>
          <ConnectionPoint side="top" />
          <ConnectionPoint side="right" />
          <ConnectionPoint side="bottom" />
          <ConnectionPoint side="left" />
        </>
      )}
    </div>
  );
}
