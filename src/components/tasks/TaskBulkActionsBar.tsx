import { Button } from "@/components/ui/button";
import { X, Download, Trash2, CheckCircle2, Flag, Zap, Calendar, Users, Tags } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { TASK_STATUS_OPTIONS } from "@/domain";
import { TASK_TAGS } from "@/lib/constants";
import { format } from "date-fns";

interface Sprint {
  id: string;
  name: string;
  status: string;
}

interface TaskBulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onComplete?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: string, blockedReason?: string) => void;
  onPriorityChange?: (priority: string) => void;
  onExport?: () => void;
  onSprintChange?: (sprintId: string | null) => void;
  onDueDateChange?: (dueDate: string | null) => void;
  onAssign?: (userIds: string[]) => void;
  onAddTags?: (tags: string[]) => void;
  sprints?: Sprint[];
  className?: string;
}

export function TaskBulkActionsBar({
  selectedCount,
  onClearSelection,
  onComplete,
  onDelete,
  onStatusChange,
  onPriorityChange,
  onExport,
  onSprintChange,
  onDueDateChange,
  onAddTags,
  sprints,
  className = "",
}: TaskBulkActionsBarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBlockedReasonDialog, setShowBlockedReasonDialog] = useState(false);
  const [blockedReason, setBlockedReason] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showTagsDialog, setShowTagsDialog] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  if (selectedCount === 0) return null;

  const handleDelete = () => {
    onDelete?.();
    setShowDeleteDialog(false);
  };

  const handleStatusChange = (status: string) => {
    if (status === "Blocked") {
      setShowBlockedReasonDialog(true);
    } else {
      onStatusChange?.(status);
    }
  };

  const handleBlockedReasonSubmit = () => {
    if (!blockedReason.trim()) return;
    onStatusChange?.("Blocked", blockedReason.trim());
    setBlockedReason("");
    setShowBlockedReasonDialog(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      onDueDateChange?.(date.toISOString());
      setShowDatePicker(false);
    }
  };

  const handleTagsSubmit = () => {
    if (selectedTags.length > 0) {
      onAddTags?.(selectedTags);
    }
    setSelectedTags([]);
    setShowTagsDialog(false);
  };

  return (
    <>
      <Card className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-overlay shadow-soft border-2 ${className}`}>
        <div className="flex items-center gap-md p-md flex-wrap">
          <div className="flex items-center gap-xs">
            <span className="font-semibold">{selectedCount}</span>
            <span className="text-muted-foreground">selected</span>
          </div>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-xs flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-8"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>

            {onComplete && (
              <Button
                variant="outline"
                size="sm"
                onClick={onComplete}
                className="h-8"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Complete
              </Button>
            )}

            {onStatusChange && (
              <Select onValueChange={handleStatusChange}>
                <SelectTrigger className="h-8 w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {onPriorityChange && (
              <Select onValueChange={onPriorityChange}>
                <SelectTrigger className="h-8 w-[110px]">
                  <Flag className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            )}

            {onSprintChange && sprints && (
              <Select onValueChange={(v) => onSprintChange(v === "none" ? null : v)}>
                <SelectTrigger className="h-8 w-[120px]">
                  <Zap className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sprint" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Sprint</SelectItem>
                  {sprints.map((sprint) => (
                    <SelectItem key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {onDueDateChange && (
              <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Calendar className="h-4 w-4 mr-1" />
                    Due Date
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        onDueDateChange(null);
                        setShowDatePicker(false);
                      }}
                    >
                      Clear Due Date
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {onAddTags && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTagsDialog(true)}
                className="h-8"
              >
                <Tags className="h-4 w-4 mr-1" />
                Tags
              </Button>
            )}

            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="h-8"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            )}

            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="h-8"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} tasks?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Blocked Reason Dialog */}
      <Dialog open={showBlockedReasonDialog} onOpenChange={setShowBlockedReasonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Blocked Reason</DialogTitle>
            <DialogDescription>
              Please provide a reason why these tasks are blocked. This will be added as a comment to each task.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-md py-md">
            <div className="space-y-xs">
              <Label htmlFor="blocked-reason">Reason</Label>
              <Textarea
                id="blocked-reason"
                value={blockedReason}
                onChange={(e) => setBlockedReason(e.target.value)}
                placeholder="Explain why the tasks are blocked..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockedReasonDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBlockedReasonSubmit} disabled={!blockedReason.trim()}>
              Set as Blocked
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Tags Dialog */}
      <Dialog open={showTagsDialog} onOpenChange={setShowTagsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tags</DialogTitle>
            <DialogDescription>
              Select tags to add to the selected tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-sm py-md max-h-[300px] overflow-y-auto">
            {TASK_TAGS.map((tag) => (
              <div key={tag.value} className="flex items-center gap-sm">
                <Checkbox
                  id={tag.value}
                  checked={selectedTags.includes(tag.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedTags([...selectedTags, tag.value]);
                    } else {
                      setSelectedTags(selectedTags.filter((t) => t !== tag.value));
                    }
                  }}
                />
                <label htmlFor={tag.value} className="text-body-sm cursor-pointer">
                  {tag.label}
                </label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTagsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTagsSubmit} disabled={selectedTags.length === 0}>
              Add Tags ({selectedTags.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}