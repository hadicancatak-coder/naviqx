import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateAdTemplate } from '@/hooks/useAdTemplates';

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adData: {
    name: string;
    entity?: string;
    headlines: string[];
    descriptions: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sitelinks: any[];
    callouts: string[];
    landing_page?: string;
    ad_type: 'search' | 'display';
    business_name?: string;
    long_headline?: string;
    cta_text?: string;
  };
}

export function SaveAsTemplateDialog({ open, onOpenChange, adData }: SaveAsTemplateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createTemplate = useCreateAdTemplate();

  const handleSave = () => {
    createTemplate.mutate({
      name,
      description: description || undefined,
      is_public: false,
      ...adData,
    }, {
      onSuccess: () => {
        setName('');
        setDescription('');
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-md">
          <div>
            <Label htmlFor="template-name">Template Name *</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Holiday Sale Template"
            />
          </div>

          <div>
            <Label htmlFor="template-desc">Description</Label>
            <Textarea
              id="template-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this template for?"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name}>Save Template</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
