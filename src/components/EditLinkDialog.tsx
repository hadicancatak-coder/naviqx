import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  text: string;
  url: string;
  onSave: (newUrl: string, newText: string) => void;
}

export function EditLinkDialog({ open, onOpenChange, text, url, onSave }: EditLinkDialogProps) {
  const [editUrl, setEditUrl] = useState(url);
  const [editText, setEditText] = useState(text);

  useEffect(() => {
    if (open) {
      setEditUrl(url);
      setEditText(text);
    }
  }, [open, url, text]);

  const handleSave = () => {
    onSave(editUrl, editText);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Link</DialogTitle>
        </DialogHeader>
        <div className="space-y-md py-md">
          <div className="space-y-xs">
            <Label htmlFor="edit-link-text">Text</Label>
            <Input
              id="edit-link-text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Link text"
            />
          </div>
          <div className="space-y-xs">
            <Label htmlFor="edit-link-url">URL</Label>
            <Input
              id="edit-link-url"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
