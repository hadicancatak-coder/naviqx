import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ExternalLink, Globe, Smartphone, FileText, StickyNote } from "lucide-react";

interface DealDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deal: any;
  onEdit: () => void;
  onDelete: () => void;
}

export function DealDetailDialog({ open, onOpenChange, deal, onEdit, onDelete }: DealDetailDialogProps) {
  if (!deal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <DialogTitle className="text-heading-md">{deal.name}</DialogTitle>
            <div className="flex items-center gap-sm">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-xs" />
                Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-xs" />
                Delete
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-lg mt-md">
          {/* Website */}
          {deal.website && (
            <div className="flex items-start gap-sm">
              <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-body-sm text-muted-foreground mb-xs">Website</p>
                <a
                  href={deal.website.startsWith('http') ? deal.website : `https://${deal.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-xs"
                >
                  {deal.website}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {/* App */}
          {deal.app_name && (
            <div className="flex items-start gap-sm">
              <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-body-sm text-muted-foreground mb-xs">App</p>
                <p>{deal.app_name}</p>
              </div>
            </div>
          )}

          {/* Description */}
          {deal.description && (
            <div className="flex items-start gap-sm">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-body-sm text-muted-foreground mb-xs">Description</p>
                <p className="text-body-sm whitespace-pre-wrap">{deal.description}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          {deal.notes && (
            <div className="flex items-start gap-sm">
              <StickyNote className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-body-sm text-muted-foreground mb-xs">Notes</p>
                <p className="text-body-sm whitespace-pre-wrap">{deal.notes}</p>
              </div>
            </div>
          )}

          {/* Empty state if no details */}
          {!deal.website && !deal.app_name && !deal.description && !deal.notes && (
            <p className="text-muted-foreground text-center py-md">No additional details added yet.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}