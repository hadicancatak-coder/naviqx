import { useRef, useEffect, useCallback, useState } from "react";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { useTaskDetailContext } from "./TaskDetailContext";

export function TaskDetailDescription() {
  const { task, mutations } = useTaskDetailContext();
  const updateDescriptionMutation = mutations.updateDescription;
  
  // Local state for the editor
  const [value, setValue] = useState(task?.description || "");
  
  // Track last saved value to compare against
  const lastSavedRef = useRef<string>(task?.description || "");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track current value in a ref for closure access in cleanup
  const valueRef = useRef<string>(value);
  const taskIdRef = useRef<string | undefined>(task?.id);
  const mutateDescriptionRef = useRef(updateDescriptionMutation.mutate);
  
  // Keep valueRef in sync
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    taskIdRef.current = task?.id;
  }, [task?.id]);

  useEffect(() => {
    mutateDescriptionRef.current = updateDescriptionMutation.mutate;
  }, [updateDescriptionMutation]);
  
  // Sync when task data arrives or changes (e.g., reopening same task with fresh data)
  // Only overwrite local state if the user hasn't made unsaved edits
  useEffect(() => {
    const newDescription = task?.description || "";
    const hasUnsavedEdits = valueRef.current !== lastSavedRef.current;
    
    if (!hasUnsavedEdits && newDescription !== lastSavedRef.current) {
      setValue(newDescription);
      valueRef.current = newDescription;
      lastSavedRef.current = newDescription;
    }
  }, [task?.id, task?.description]);

  // Save using mutation
  const saveDescription = useCallback((descValue: string) => {
    const currentTaskId = taskIdRef.current;

    if (currentTaskId) {
      mutateDescriptionRef.current({ id: currentTaskId, description: descValue });
    }
  }, []);

  // Auto-save with debounce when content changes
  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    valueRef.current = newValue;
    
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounced auto-save after 1 second of no changes
    saveTimeoutRef.current = setTimeout(() => {
      const currentValue = valueRef.current;
      if (currentValue !== lastSavedRef.current) {
        saveDescription(currentValue);
        lastSavedRef.current = currentValue;
      }
    }, 1000);
  }, [saveDescription]);

  // Save immediately on blur
  const handleBlur = useCallback(() => {
    // Clear any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    const currentValue = valueRef.current;
    if (currentValue !== lastSavedRef.current) {
      saveDescription(currentValue);
      lastSavedRef.current = currentValue;
    }
  }, [saveDescription]);

  // CRITICAL: Flush pending saves on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      // Use the ref value (state may be stale in cleanup)
      const currentValue = valueRef.current;
      if (currentValue !== lastSavedRef.current) {
        // Fire and forget - component is unmounting
        saveDescription(currentValue);
        lastSavedRef.current = currentValue;
      }
    };
  }, [saveDescription]);

  return (
    <div className="space-y-xs">
      <Label className="text-metadata text-muted-foreground">Description</Label>
      <RichTextEditor
        key={task?.id}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Add a description..."
        minHeight="100px"
      />
    </div>
  );
}
