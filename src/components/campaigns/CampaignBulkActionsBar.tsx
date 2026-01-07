import { Button } from "@/components/ui/button";
import { X, Trash2, Building2, Download } from "lucide-react";
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
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { useSystemEntities } from "@/hooks/useSystemEntities";

interface CampaignBulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onAssignToEntity?: (entity: string) => void;
  onDelete?: () => void;
  onExport?: () => void;
  className?: string;
}

export function CampaignBulkActionsBar({
  selectedCount,
  onClearSelection,
  onAssignToEntity,
  onDelete,
  onExport,
  className = "",
}: CampaignBulkActionsBarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { data: entities = [] } = useSystemEntities();

  if (selectedCount === 0) return null;

  const handleDelete = () => {
    onDelete?.();
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-overlay shadow-xl border-2 ${className}`}>
        <div className="flex items-center gap-md p-md flex-wrap">
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
            >
              <X />
              Clear
            </Button>

            {onAssignToEntity && (
              <Select onValueChange={onAssignToEntity}>
                <SelectTrigger className="w-[160px]">
                  <Building2 className="size-4 mr-2" />
                  <SelectValue placeholder="Assign to Entity" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((entity) => (
                    <SelectItem key={entity.name} value={entity.name}>
                      {entity.emoji} {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
              >
                <Download />
                Export
              </Button>
            )}

            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 />
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
            <AlertDialogTitle>Delete {selectedCount} campaigns?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected campaigns.
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
    </>
  );
}
