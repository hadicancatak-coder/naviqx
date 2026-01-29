import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DealFormData {
  name: string;
  website: string;
  app_name: string;
  description: string;
  notes: string;
}

interface DealFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deal?: any;
  onSave: (dealData: DealFormData) => void;
}

export function DealFormDialog({ open, onOpenChange, deal, onSave }: DealFormDialogProps) {
  const [formData, setFormData] = useState<DealFormData>({
    name: '',
    website: '',
    app_name: '',
    description: '',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: deal?.name || '',
        website: deal?.website || '',
        app_name: deal?.app_name || '',
        description: deal?.description || '',
        notes: deal?.notes || '',
      });
    }
  }, [open, deal]);

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      return;
    }
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{deal ? 'Edit Brand Deal' : 'Add Brand Deal'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-md">
          <div className="space-y-sm">
            <Label htmlFor="name">Brand Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter brand or company name"
            />
          </div>

          <div className="space-y-sm">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          <div className="space-y-sm">
            <Label htmlFor="app_name">App</Label>
            <Input
              id="app_name"
              value={formData.app_name}
              onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
              placeholder="App name (if applicable)"
            />
          </div>

          <div className="space-y-sm">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the brand and potential collaboration"
              rows={3}
            />
          </div>

          <div className="space-y-sm">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes, contact info, etc."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.name.trim()}>
            {deal ? 'Update' : 'Add Deal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}