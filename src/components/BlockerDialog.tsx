import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { blockerSchema } from "@/lib/validationSchemas";

interface BlockerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId?: string;
  onSuccess?: () => void;
}

export const BlockerDialog = ({ open, onOpenChange, taskId, onSuccess }: BlockerDialogProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stuckReason, setStuckReason] = useState("");
  const [fixProcess, setFixProcess] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [timeline, setTimeline] = useState("");
  const [tasks, setTasks] = useState<{ id: string; title: string }[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState(taskId || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTasks();
      if (taskId) {
        setSelectedTaskId(taskId);
      }
    }
  }, [open, taskId]);

  const fetchTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("id, title")
      .order("created_at", { ascending: false });
    setTasks(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = blockerSchema.parse({
        title,
        description: description || "",
        stuck_reason: stuckReason || "",
        fix_process: fixProcess || "",
        timeline: timeline || "",
        task_id: selectedTaskId,
        due_date: dueDate ? dueDate.toISOString() : null,
      });

      setLoading(true);

      const { error: blockerError } = await supabase.from("blockers").insert({
        task_id: validated.task_id,
        title: validated.title,
        description: validated.description,
        stuck_reason: validated.stuck_reason,
        fix_process: validated.fix_process,
        due_date: validated.due_date,
        timeline: validated.timeline,
        created_by: user?.id,
        resolved: false
      });

      if (blockerError) throw blockerError;

      const { error: taskError } = await supabase
        .from("tasks")
        .update({ status: "Blocked" })
        .eq("id", validated.task_id);

      if (taskError) throw taskError;

      toast({ title: "Success", description: "Blocker created successfully" });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast({ title: "Validation Error", description: error.errors[0].message, variant: "destructive" });
      } else {
        const message = error instanceof Error ? error.message : "Failed to add blocker";
        toast({ title: "Error", description: message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStuckReason("");
    setFixProcess("");
    setDueDate(undefined);
    setTimeline("");
    setSelectedTaskId(taskId || "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Create Blocker</DialogTitle>
          <DialogDescription>Report what's blocking this task</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-md">
          <div>
            <Label htmlFor="task">Task *</Label>
            <Select value={selectedTaskId} onValueChange={setSelectedTaskId} disabled={!!taskId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a task" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map(task => (
                  <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief title of the blocker"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Detailed description of the blocker"
              minHeight="80px"
            />
          </div>

          <div>
            <Label htmlFor="stuckReason">Why It's Stuck</Label>
            <RichTextEditor
              value={stuckReason}
              onChange={setStuckReason}
              placeholder="Explain why this task is blocked"
              minHeight="60px"
            />
          </div>

          <div>
            <Label htmlFor="fixProcess">Process to Fix</Label>
            <RichTextEditor
              value={fixProcess}
              onChange={setFixProcess}
              placeholder="Steps needed to resolve this blocker"
              minHeight="60px"
            />
          </div>

          <div>
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus className="pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="timeline">Timeline</Label>
            <Input
              id="timeline"
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              placeholder="e.g., 2-3 days, 1 week"
            />
          </div>

          <div className="flex gap-sm justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Blocker"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
