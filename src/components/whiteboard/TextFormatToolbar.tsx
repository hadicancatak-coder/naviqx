import { Bold, Italic, Underline, Heading1, Heading2, Heading3, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Editor } from "@tiptap/react";

const TEXT_COLORS = [
  { name: "Default", value: "inherit" },
  { name: "Black", value: "#1e293b" },
  { name: "Gray", value: "#64748b" },
  { name: "Red", value: "#ef4444" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Orange", value: "#f97316" },
];

interface TextFormatToolbarProps {
  editor: Editor | null;
}

export function TextFormatToolbar({ editor }: TextFormatToolbarProps) {
  if (!editor) return null;

  const setHeading = (level: 1 | 2 | 3) => {
    editor.chain().focus().toggleHeading({ level }).run();
  };

  const setParagraph = () => {
    editor.chain().focus().setParagraph().run();
  };

  return (
    <div className="absolute -top-10 left-0 liquid-glass-elevated rounded-lg p-xs flex items-center gap-xs shadow-lg z-10">
      {/* Bold */}
      <Button
        variant={editor.isActive("bold") ? "default" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <Bold className="h-3.5 w-3.5" />
      </Button>

      {/* Italic */}
      <Button
        variant={editor.isActive("italic") ? "default" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </Button>

      {/* Underline */}
      <Button
        variant={editor.isActive("underline") ? "default" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline"
      >
        <Underline className="h-3.5 w-3.5" />
      </Button>

      <div className="w-px h-5 bg-border mx-xs" />

      {/* Headings */}
      <Button
        variant={editor.isActive("heading", { level: 1 }) ? "default" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={() => setHeading(1)}
        title="Heading 1"
      >
        <Heading1 className="h-3.5 w-3.5" />
      </Button>

      <Button
        variant={editor.isActive("heading", { level: 2 }) ? "default" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={() => setHeading(2)}
        title="Heading 2"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </Button>

      <Button
        variant={editor.isActive("heading", { level: 3 }) ? "default" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={() => setHeading(3)}
        title="Heading 3"
      >
        <Heading3 className="h-3.5 w-3.5" />
      </Button>

      <Button
        variant={editor.isActive("paragraph") && !editor.isActive("heading") ? "default" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={setParagraph}
        title="Normal text"
      >
        <Type className="h-3.5 w-3.5" />
      </Button>

      <div className="w-px h-5 bg-border mx-xs" />

      {/* Text color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Text color"
          >
            <div className="w-4 h-4 rounded border border-border" style={{ 
              backgroundColor: editor.getAttributes("textStyle").color || "transparent" 
            }} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-sm" align="start" sideOffset={8}>
          <div className="flex gap-xs flex-wrap max-w-32">
            {TEXT_COLORS.map(({ name, value }) => (
              <button
                key={value}
                onClick={() => {
                  if (value === "inherit") {
                    editor.chain().focus().unsetColor().run();
                  } else {
                    editor.chain().focus().setColor(value).run();
                  }
                }}
                className={cn(
                  "w-6 h-6 rounded border border-border/50 transition-all hover:scale-110",
                  value === "inherit" && "bg-gradient-to-br from-gray-100 to-gray-400"
                )}
                style={{ backgroundColor: value !== "inherit" ? value : undefined }}
                title={name}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
