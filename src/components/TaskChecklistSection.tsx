import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { CheckSquare, Plus, Trash2 } from "lucide-react";

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface TaskChecklistSectionProps {
  taskId: string;
  onUpdate?: () => void;
  readOnly?: boolean;
}

export function TaskChecklistSection({ taskId, onUpdate, readOnly = false }: TaskChecklistSectionProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const hasFetched = useRef(false);

  // Fetch checklist from database on mount - only once
  useEffect(() => {
    if (hasFetched.current || !taskId) return;
    hasFetched.current = true;
    
    const fetchChecklist = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("tasks")
        .select("checklist")
        .eq("id", taskId)
        .single();

      if (error) {
        logger.error("Failed to fetch checklist:", error);
        setIsLoading(false);
        return;
      }

      const items = Array.isArray(data?.checklist) ? (data.checklist as unknown as ChecklistItem[]) : [];
      setChecklist(items);
      setIsLoading(false);
    };

    fetchChecklist();
  }, [taskId]);

  const saveChecklist = async (updatedChecklist: ChecklistItem[]) => {
    const { error } = await supabase
      .from("tasks")
      .update({ checklist: updatedChecklist as any })
      .eq("id", taskId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setChecklist(updatedChecklist);
      onUpdate?.();
    }
  };

  const addItem = async () => {
    if (!newItemText.trim() || readOnly) return;

    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text: newItemText,
      completed: false,
    };

    await saveChecklist([...checklist, newItem]);
    setNewItemText("");
  };

  const toggleItem = async (itemId: string) => {
    // Allow toggling even in readOnly mode for completing items
    const updated = checklist.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    await saveChecklist(updated);
  };

  const removeItem = async (itemId: string) => {
    if (readOnly) return;
    const updated = checklist.filter((item) => item.id !== itemId);
    await saveChecklist(updated);
  };

  const completedCount = checklist.filter((item) => item.completed).length;
  const progress = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0;

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading checklist...</div>;
  }

  return (
    <div className="space-y-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4" />
          <h3 className="font-semibold">Checklist</h3>
        </div>
        {checklist.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {completedCount}/{checklist.length} completed
          </span>
        )}
      </div>

      {checklist.length > 0 && (
        <Progress value={progress} className="h-2" />
      )}

      <div className="space-y-2">
        {checklist.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Checkbox
              checked={item.completed}
              onCheckedChange={() => toggleItem(item.id)}
              onClick={(e) => e.stopPropagation()}
            />
            <span
              className={`flex-1 text-sm ${
                item.completed ? "line-through text-muted-foreground" : ""
              }`}
            >
              {item.text}
            </span>
            {!readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeItem(item.id);
                }}
              >
                <Trash2 />
              </Button>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Input
            placeholder="Add checklist item..."
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                addItem();
              }
            }}
          />
          <Button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addItem();
            }} 
            size="sm"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {readOnly && checklist.length === 0 && (
        <p className="text-sm text-muted-foreground">No checklist items</p>
      )}
    </div>
  );
}
