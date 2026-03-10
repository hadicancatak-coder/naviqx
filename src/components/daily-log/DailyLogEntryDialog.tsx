import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DAILY_LOG_STATUSES, type DailyLogEntry, type DailyLogStatus, type DailyLogPriority, type RecurPattern } from "@/domain/daily-log";
import { useCreateDailyLogEntry, useUpdateDailyLogEntry } from "@/hooks/useDailyLog";
import { useAuth } from "@/hooks/useAuth";

interface DailyLogEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: DailyLogEntry | null;
  logDate: string;
  forUserId?: string; // admin adding for another user
  users?: { id: string; name: string }[]; // admin user selector
  isAdmin?: boolean;
}

export function DailyLogEntryDialog({
  open,
  onOpenChange,
  entry,
  logDate,
  forUserId,
  users,
  isAdmin,
}: DailyLogEntryDialogProps) {
  const { user } = useAuth();
  const createEntry = useCreateDailyLogEntry();
  const updateEntry = useUpdateDailyLogEntry();

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<DailyLogStatus>("Planned");
  const [priority, setPriority] = useState<DailyLogPriority>("Medium");
  const [dueDate, setDueDate] = useState("");
  const [needsHelp, setNeedsHelp] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurPattern, setRecurPattern] = useState<RecurPattern | "">("");
  const [notes, setNotes] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const isEditing = !!entry;

  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setStatus(entry.status);
      setPriority(entry.priority ?? "Medium");
      setDueDate(entry.due_date ?? "");
      setNeedsHelp(entry.needs_help);
      setIsRecurring(entry.is_recurring);
      setRecurPattern(entry.recur_pattern ?? "");
      setNotes(entry.notes ?? "");
      setSelectedUserId(entry.user_id);
    } else {
      setTitle("");
      setStatus("Planned");
      setPriority("Medium");
      setDueDate("");
      setNeedsHelp(false);
      setIsRecurring(false);
      setRecurPattern("");
      setNotes("");
      setSelectedUserId(forUserId || user?.id || "");
    }
  }, [entry, open, forUserId, user?.id]);

  const handleSubmit = () => {
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      status,
      priority: priority as DailyLogPriority,
      due_date: dueDate || null,
      needs_help: needsHelp,
      is_recurring: isRecurring,
      recur_pattern: isRecurring && recurPattern ? (recurPattern as RecurPattern) : null,
      notes: notes.trim() || null,
    };

    if (isEditing) {
      updateEntry.mutate({ id: entry!.id, ...payload }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createEntry.mutate(
        {
          ...payload,
          user_id: selectedUserId || user!.id,
          log_date: logDate,
          created_by: isAdmin && selectedUserId !== user?.id ? user!.id : null,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Entry" : "Add Entry"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-md">
          {/* Admin: user selector */}
          {isAdmin && users && users.length > 0 && !isEditing && (
            <div className="space-y-xs">
              <Label className="text-metadata text-muted-foreground">Log for</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-xs">
            <Label className="text-metadata text-muted-foreground">What you'll do</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Review campaign assets"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            />
          </div>

          {/* Status + Priority */}
          <div className="flex gap-sm">
            <div className="flex-1 space-y-xs">
              <Label className="text-metadata text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as DailyLogStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAILY_LOG_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-xs">
              <Label className="text-metadata text-muted-foreground">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as DailyLogPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due date */}
          <div className="space-y-xs">
            <Label className="text-metadata text-muted-foreground">Due Date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          {/* Needs help */}
          <div className="flex items-center justify-between">
            <Label className="text-body-sm text-foreground">Needs Help</Label>
            <Switch checked={needsHelp} onCheckedChange={setNeedsHelp} />
          </div>

          {/* Recurring */}
          <div className="space-y-sm">
            <div className="flex items-center justify-between">
              <Label className="text-body-sm text-foreground">Recurring</Label>
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
            </div>
            {isRecurring && (
              <Select value={recurPattern} onValueChange={(v) => setRecurPattern(v as RecurPattern)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pattern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-xs">
            <Label className="text-metadata text-muted-foreground">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            {isEditing ? "Save" : "Add Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
