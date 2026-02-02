import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateAdElement, AdElement } from '@/hooks/useAdElements';

interface UpdateGoogleStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  element: AdElement;
}

export function UpdateGoogleStatusDialog({ open, onOpenChange, element }: UpdateGoogleStatusDialogProps) {
  const [status, setStatus] = useState(element.google_status || 'pending');
  const [notes, setNotes] = useState(element.google_status_notes || '');
  const updateElement = useUpdateAdElement();

  // Reset state when element changes
  useEffect(() => {
    setStatus(element.google_status || 'pending');
    setNotes(element.google_status_notes || '');
  }, [element.id, element.google_status, element.google_status_notes]);

  const handleSave = () => {
    updateElement.mutate({
      id: element.id,
      updates: {
        google_status: status,
        google_status_notes: notes,
        google_status_date: new Date().toISOString(),
      }
    }, {
      onSuccess: () => onOpenChange(false)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Google Status</DialogTitle>
        </DialogHeader>

        <div className="space-y-md">
          <div>
            <Label>Google Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as 'pending' | 'approved' | 'limited' | 'rejected')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="limited">Limited</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this status update..."
              rows={3}
            />
          </div>

          {element.google_status_date && (
            <p className="text-body-sm text-muted-foreground">
              Last updated: {new Date(element.google_status_date).toLocaleDateString()}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Update Status</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
