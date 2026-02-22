import { useState, useRef, useCallback } from "react";
import { Plus, X, CalendarIcon, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { TASK_QUERY_KEY } from "@/lib/queryKeys";

interface BulkTaskRow {
  id: string;
  title: string;
  description: string;
  dueDate: Date | undefined;
  showDescription: boolean;
}

const createEmptyRow = (): BulkTaskRow => ({
  id: crypto.randomUUID(),
  title: "",
  description: "",
  dueDate: undefined,
  showDescription: false,
});

interface BulkTaskCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTasksCreated?: () => void;
}

export function BulkTaskCreateDialog({
  open,
  onOpenChange,
  onTasksCreated,
}: BulkTaskCreateDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<BulkTaskRow[]>(() => [
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const validRows = rows.filter((r) => r.title.trim().length > 0);

  const updateRow = useCallback(
    (id: string, updates: Partial<BulkTaskRow>) => {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
    },
    []
  );

  const removeRow = useCallback((id: string) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  const addRow = useCallback(() => {
    const newRow = createEmptyRow();
    setRows((prev) => [...prev, newRow]);
    // Focus the new row after render
    setTimeout(() => {
      titleRefs.current.get(newRow.id)?.focus();
    }, 50);
  }, []);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent, rowId: string) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const idx = rows.findIndex((r) => r.id === rowId);
        if (idx === rows.length - 1) {
          addRow();
        } else {
          const nextRow = rows[idx + 1];
          titleRefs.current.get(nextRow.id)?.focus();
        }
      }
    },
    [rows, addRow]
  );

  const handleSubmit = async () => {
    if (!user || validRows.length === 0) return;

    setIsSubmitting(true);
    try {
      const insertData = validRows.map((r) => ({
        title: r.title.trim(),
        description: r.description.trim() || null,
        due_at: r.dueDate ? r.dueDate.toISOString() : null,
        status: "Ongoing" as const,
        priority: "Medium" as const,
        created_by: user.id,
      }));

      const { error } = await supabase.from("tasks").insert(insertData);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
      toast({
        title: `${validRows.length} task${validRows.length > 1 ? "s" : ""} created`,
        duration: 2000,
      });
      onTasksCreated?.();
      onOpenChange(false);
      // Reset rows for next open
      setRows([createEmptyRow(), createEmptyRow(), createEmptyRow()]);
    } catch (error: unknown) {
      toast({
        title: "Failed to create tasks",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setRows([createEmptyRow(), createEmptyRow(), createEmptyRow()]);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Add Tasks</DialogTitle>
          <DialogDescription>
            Add multiple tasks at once. Press Enter to jump to the next row.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-sm pr-xs -mr-xs">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="group rounded-lg border border-border bg-card p-sm transition-smooth hover:bg-card-hover"
            >
              <div className="flex items-center gap-sm">
                <span className="text-metadata text-muted-foreground w-5 text-center shrink-0">
                  {index + 1}
                </span>

                <Input
                  ref={(el) => {
                    if (el) titleRefs.current.set(row.id, el);
                    else titleRefs.current.delete(row.id);
                  }}
                  value={row.title}
                  onChange={(e) =>
                    updateRow(row.id, { title: e.target.value })
                  }
                  onKeyDown={(e) => handleTitleKeyDown(e, row.id)}
                  placeholder="Task title..."
                  className="flex-1 h-8 text-body-sm"
                  autoFocus={index === 0}
                />

                {/* Description toggle */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() =>
                    updateRow(row.id, {
                      showDescription: !row.showDescription,
                    })
                  }
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  title="Toggle description"
                >
                  {row.showDescription ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </Button>

                {/* Date picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className={cn(
                        "shrink-0",
                        row.dueDate
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title={
                        row.dueDate
                          ? format(row.dueDate, "MMM d, yyyy")
                          : "Set due date"
                      }
                    >
                      <CalendarIcon className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={row.dueDate}
                      onSelect={(date) =>
                        updateRow(row.id, { dueDate: date })
                      }
                      initialFocus
                      className="p-sm pointer-events-auto"
                    />
                    {row.dueDate && (
                      <div className="px-sm pb-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-metadata"
                          onClick={() =>
                            updateRow(row.id, { dueDate: undefined })
                          }
                        >
                          Clear date
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                {/* Due date badge */}
                {row.dueDate && (
                  <span className="text-metadata text-primary shrink-0 hidden sm:inline">
                    {format(row.dueDate, "MMM d")}
                  </span>
                )}

                {/* Remove row */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeRow(row.id)}
                  className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-smooth"
                  disabled={rows.length <= 1}
                  title="Remove row"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Expandable description */}
              {row.showDescription && (
                <div className="mt-sm ml-7">
                  <Textarea
                    value={row.description}
                    onChange={(e) =>
                      updateRow(row.id, { description: e.target.value })
                    }
                    placeholder="Add a description..."
                    className="min-h-[60px] text-body-sm resize-none"
                    rows={2}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add another row */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addRow}
          className="w-full text-muted-foreground hover:text-foreground gap-xs"
        >
          <Plus className="h-4 w-4" />
          Add another
        </Button>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={validRows.length === 0 || isSubmitting}
          >
            {isSubmitting && (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            )}
            Create {validRows.length || ""} Task{validRows.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
