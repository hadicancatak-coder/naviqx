import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateDailyLogEntry } from "@/hooks/useDailyLog";
import { useAuth } from "@/hooks/useAuth";

interface DailyLogBulkPasteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logDate: string;
  forUserId?: string;
  isAdmin?: boolean;
}

export function DailyLogBulkPasteDialog({
  open,
  onOpenChange,
  logDate,
  forUserId,
  isAdmin,
}: DailyLogBulkPasteDialogProps) {
  const { user } = useAuth();
  const createEntry = useCreateDailyLogEntry();
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lines = useMemo(
    () => text.split("\n").map((l) => l.trim()).filter(Boolean),
    [text]
  );

  const handleSubmit = async () => {
    if (lines.length === 0) return;
    setIsSubmitting(true);

    const targetUserId = forUserId || user!.id;

    for (const line of lines) {
      await createEntry.mutateAsync({
        title: line,
        status: "Planned",
        priority: "Medium",
        user_id: targetUserId,
        log_date: logDate,
        created_by: isAdmin && targetUserId !== user?.id ? user!.id : null,
      });
    }

    setIsSubmitting(false);
    setText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Paste your plan</DialogTitle>
        </DialogHeader>
        <p className="text-body-sm text-muted-foreground">
          Paste your tasks, one per line. Each line becomes a new entry.
        </p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Review campaign assets\nPrep weekly report\nCheck KPIs\nCall with design team"}
          rows={8}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={lines.length === 0 || isSubmitting}>
            {isSubmitting ? "Adding..." : `Add ${lines.length} entr${lines.length === 1 ? "y" : "ies"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
