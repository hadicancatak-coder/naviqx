import { useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { useTaskDetailContext } from "./TaskDetailContext";

export function TaskDetailDescription() {
  const { task, description, setDescription, saveField } = useTaskDetailContext();
  
  // Track last saved value to compare against (not stale task?.description)
  const lastSavedRef = useRef(description);
  
  // Only reset the ref when switching to a different task
  useEffect(() => {
    lastSavedRef.current = task?.description || "";
  }, [task?.id]);

  return (
    <div className="space-y-xs">
      <Label className="text-metadata text-muted-foreground">Description</Label>
      <RichTextEditor
        value={description}
        onChange={(v) => setDescription(v)}
        onBlur={() => {
          // Compare against lastSavedRef, not task?.description (which can be stale)
          if (description !== lastSavedRef.current) {
            saveField('description', description);
            lastSavedRef.current = description;
          }
        }}
        placeholder="Add a description..."
        minHeight="100px"
      />
    </div>
  );
}
