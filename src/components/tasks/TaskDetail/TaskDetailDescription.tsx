import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { useTaskDetailContext } from "./TaskDetailContext";

export function TaskDetailDescription() {
  const { task, description, setDescription, saveField } = useTaskDetailContext();

  return (
    <div className="space-y-xs">
      <Label className="text-metadata text-muted-foreground">Description</Label>
      <RichTextEditor
        value={description}
        onChange={(v) => setDescription(v)}
        onBlur={() => {
          if (description !== task?.description) {
            saveField('description', description);
          }
        }}
        placeholder="Add a description..."
        minHeight="100px"
      />
    </div>
  );
}
