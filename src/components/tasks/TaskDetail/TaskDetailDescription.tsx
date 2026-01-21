import { useRef, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { useTaskDetailContext } from "./TaskDetailContext";

export function TaskDetailDescription() {
  const { task, description, setDescription, saveField } = useTaskDetailContext();
  
  // Track last saved value to compare against (not stale task?.description)
  const lastSavedRef = useRef<string>("");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Only reset the ref when switching to a different task
  useEffect(() => {
    lastSavedRef.current = task?.description || "";
  }, [task?.id]);

  // Auto-save with debounce when content changes
  const handleChange = useCallback((newValue: string) => {
    setDescription(newValue);
    
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounced auto-save after 1 second of no changes
    saveTimeoutRef.current = setTimeout(() => {
      if (newValue !== lastSavedRef.current) {
        console.log('[TaskDetailDescription] Auto-saving description:', {
          newLength: newValue.length,
          lastSavedLength: lastSavedRef.current.length,
          preview: newValue.substring(0, 100)
        });
        saveField('description', newValue);
        lastSavedRef.current = newValue;
      }
    }, 1000);
  }, [setDescription, saveField]);

  // Save immediately on blur
  const handleBlur = useCallback(() => {
    // Clear any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    if (description !== lastSavedRef.current) {
      console.log('[TaskDetailDescription] Saving on blur:', {
        descriptionLength: description.length,
        lastSavedLength: lastSavedRef.current.length,
        preview: description.substring(0, 100)
      });
      saveField('description', description);
      lastSavedRef.current = description;
    }
  }, [description, saveField]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-xs">
      <Label className="text-metadata text-muted-foreground">Description</Label>
      <RichTextEditor
        value={description}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Add a description..."
        minHeight="100px"
      />
    </div>
  );
}
