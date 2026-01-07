import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Copy, Trash2, CheckCircle, XCircle, X } from "lucide-react";
import { ConfirmPopover } from "@/components/ui/ConfirmPopover";
import { cn } from "@/lib/utils";

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onExport?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  className?: string;
}

export default function BulkActionsToolbar({
  selectedCount,
  onClearSelection,
  onExport,
  onDuplicate,
  onDelete,
  onApprove,
  onReject,
  className,
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <Card
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-overlay shadow-soft",
        "animate-in slide-in-from-bottom-4 duration-300",
        className
      )}
    >
      <div className="flex items-center gap-md p-md">
        {/* Selection Count */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-body-sm font-semibold text-primary">{selectedCount}</span>
          </div>
          <span className="text-body-sm font-medium">
            {selectedCount} {selectedCount === 1 ? "ad" : "ads"} selected
          </span>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-border" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onExport && (
            <Button size="sm" variant="outline" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}

          {onDuplicate && (
            <Button size="sm" variant="outline" onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
          )}

          {onApprove && (
            <Button size="sm" variant="outline" onClick={onApprove} className="text-success">
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          )}

          {onReject && (
            <Button size="sm" variant="outline" onClick={onReject} className="text-destructive">
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          )}

          {onDelete && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-border" />

        {/* Clear Selection */}
        <Button size="sm" variant="ghost" onClick={onClearSelection}>
          <X className="h-4 w-4 mr-2" />
          Clear
        </Button>
      </div>
    </Card>
  );
}
