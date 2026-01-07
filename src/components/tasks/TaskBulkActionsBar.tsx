import { Button } from "@/components/ui/button";
import { X, Download, Trash2, CheckCircle2, Flag } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { TASK_STATUS_OPTIONS } from "@/domain";

interface TaskBulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onComplete?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: string, blockedReason?: string) => void;
  onPriorityChange?: (priority: string) => void;
  onExport?: () => void;
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
  className = "",
}: TaskBulkActionsBarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBlockedReasonDialog, setShowBlockedReasonDialog] = useState(false);
  const [blockedReason, setBlockedReason] = useState("");

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

  return (
    <>
      <Card className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-overlay shadow-soft border-2 ${className}`}>
        <div className="flex items-center gap-4 p-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{selectedCount}</span>
            <span className="text-muted-foreground">selected</span>
          </div>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-2 flex-wrap">
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
                Mark Complete
              </Button>
            )}

            {onStatusChange && (
              <Select onValueChange={handleStatusChange}>
                <SelectTrigger className="h-8 w-[140px]">
                  <SelectValue placeholder="Change status" />
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
                <SelectTrigger className="h-8 w-[130px]">
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
          <div className="space-y-4 py-4">
            <div className="space-y-2">
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
    </>
  );
}
