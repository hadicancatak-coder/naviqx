import { useRef, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { useTaskDetailContext } from "./TaskDetailContext";

export function TaskDetailDescription() {
  const { task, description, setDescription, saveField } = useTaskDetailContext();
  
  // Track last saved value to compare against
  const lastSavedRef = useRef<string>("");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track current description in a ref for closure access
  const descriptionRef = useRef<string>(description);
  
  // Keep descriptionRef in sync
  useEffect(() => {
    descriptionRef.current = description;
  }, [description]);
  
  // Only reset the ref when switching to a different task
  useEffect(() => {
    lastSavedRef.current = task?.description || "";
  }, [task?.id]);

  // Auto-save with debounce when content changes
  const handleChange = useCallback((newValue: string) => {
    setDescription(newValue);
    descriptionRef.current = newValue;
    
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounced auto-save after 1 second of no changes
    saveTimeoutRef.current = setTimeout(async () => {
      const currentValue = descriptionRef.current;
      console.log('[TaskDetailDescription] Auto-save timeout fired:', {
        currentValueLength: currentValue.length,
        lastSavedLength: lastSavedRef.current.length,
        areDifferent: currentValue !== lastSavedRef.current,
        currentPreview: currentValue.substring(0, 80),
        lastSavedPreview: lastSavedRef.current.substring(0, 80)
      });
      
      if (currentValue !== lastSavedRef.current) {
        console.log('[TaskDetailDescription] Calling saveField now...');
        await saveField('description', currentValue);
        console.log('[TaskDetailDescription] saveField completed');
        lastSavedRef.current = currentValue;
      }
    }, 1000);
  }, [setDescription, saveField]);

  // Save immediately on blur
  const handleBlur = useCallback(async () => {
    // Clear any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    const currentValue = descriptionRef.current;
    if (currentValue !== lastSavedRef.current) {
      console.log('[TaskDetailDescription] Saving on blur:', {
        length: currentValue.length,
        preview: currentValue.substring(0, 80)
      });
      await saveField('description', currentValue);
      lastSavedRef.current = currentValue;
    }
  }, [saveField]);

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
