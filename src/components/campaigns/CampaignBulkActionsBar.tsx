import { Button } from "@/components/ui/button";
import { X, Trash2, Building2, Download, Play, Pause, FileEdit, Check } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { useSystemEntities } from "@/hooks/useSystemEntities";
import { ENTITY_TRACKING_STATUSES, EntityTrackingStatus } from "@/domain/campaigns";

interface CampaignBulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onAssignToEntities?: (entities: string[], status: EntityTrackingStatus) => void;
  onDelete?: () => void;
  onExport?: () => void;
  onBulkStatusChange?: (status: EntityTrackingStatus) => void;
  className?: string;
}

export function CampaignBulkActionsBar({
  selectedCount,
  onClearSelection,
  onAssignToEntities,
  onDelete,
  onExport,
  onBulkStatusChange,
  className = "",
}: CampaignBulkActionsBarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [assignStatus, setAssignStatus] = useState<EntityTrackingStatus>("Live");
  const { data: entities = [] } = useSystemEntities();

  if (selectedCount === 0) return null;

  const handleDelete = () => {
    onDelete?.();
    setShowDeleteDialog(false);
  };

  const handleEntityToggle = (entityName: string) => {
    setSelectedEntities(prev => 
      prev.includes(entityName) 
        ? prev.filter(e => e !== entityName) 
        : [...prev, entityName]
    );
  };

  const handleAssign = () => {
    if (selectedEntities.length > 0 && onAssignToEntities) {
      onAssignToEntities(selectedEntities, assignStatus);
      setSelectedEntities([]);
    }
  };

  const statusOptions: { value: EntityTrackingStatus; label: string; icon: React.ReactNode }[] = [
    { value: "Live", label: "Set Live", icon: <Play className="size-4" /> },
    { value: "Paused", label: "Set Paused", icon: <Pause className="size-4" /> },
    { value: "Draft", label: "Set Draft", icon: <FileEdit className="size-4" /> },
  ];

  const assignStatusOptions: { value: EntityTrackingStatus; label: string }[] = [
    { value: "Live", label: "As Live" },
    { value: "Paused", label: "As Paused" },
    { value: "Draft", label: "As Draft" },
  ];

  return (
    <>
      <Card className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-sticky shadow-xl border-2 ${className}`}>
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

            {onBulkStatusChange && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Play className="size-4" />
                    Set Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  {statusOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => onBulkStatusChange(option.value)}
                      className="gap-2"
                    >
                      {option.icon}
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {onAssignToEntities && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Building2 className="size-4" />
                    Assign to Entities
                    {selectedEntities.length > 0 && (
                      <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-metadata">
                        {selectedEntities.length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56">
                  <DropdownMenuLabel>Select Entities</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {entities.map((entity) => (
                    <DropdownMenuCheckboxItem
                      key={entity.name}
                      checked={selectedEntities.includes(entity.name)}
                      onCheckedChange={() => handleEntityToggle(entity.name)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {entity.emoji} {entity.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Assign Status</DropdownMenuLabel>
                  {assignStatusOptions.map((option) => (
                    <DropdownMenuCheckboxItem
                      key={option.value}
                      checked={assignStatus === option.value}
                      onCheckedChange={() => setAssignStatus(option.value)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {option.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <div className="p-2">
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={handleAssign}
                      disabled={selectedEntities.length === 0}
                    >
                      <Check className="size-4" />
                      Assign to {selectedEntities.length} {selectedEntities.length === 1 ? 'Entity' : 'Entities'}
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
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
