import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InlineEditFieldProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  type?: "text" | "textarea";
  className?: string;
  disabled?: boolean;
  renderContent?: (value: string) => React.ReactNode;
}

export function InlineEditField({
  value,
  onSave,
  type = "text",
  className = "",
  disabled = false,
  renderContent,
}: InlineEditFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      setEditValue(value);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && type === "text") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (disabled) {
    return <span className={className}>{value || "—"}</span>;
  }

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className={`inline-flex items-center gap-2 hover:bg-accent/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors group ${className}`}
      >
        <span>{renderContent ? renderContent(value) : (value || "—")}</span>
        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {type === "textarea" ? (
        <Textarea
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- React ref type assertion
          ref={inputRef as any}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={isSaving}
          className={`min-h-[60px] ${className}`}
          rows={3}
        />
      ) : (
        <Input
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- React ref type assertion
          ref={inputRef as any}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={isSaving}
          className={className}
        />
      )}
      <div className="flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={handleCancel}
          disabled={isSaving}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}