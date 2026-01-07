import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateAdElement } from '@/hooks/useAdElements';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elementType: 'headline' | 'description' | 'sitelink' | 'callout';
}

export function BulkImportDialog({ open, onOpenChange, elementType }: BulkImportDialogProps) {
  const [text, setText] = useState('');
  const [entity, setEntity] = useState('');
  const [preview, setPreview] = useState<string[]>([]);
  const createElement = useCreateAdElement();

  const handlePreview = () => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    setPreview(lines);
  };

  const handleImport = async () => {
    for (const line of preview) {
      await createElement.mutateAsync({
        element_type: elementType,
        content: line,
        entity: entity ? [entity] : [],
        tags: [],
        google_status: 'pending',
        is_favorite: false,
      });
    }
    setText('');
    setPreview([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import {elementType.charAt(0).toUpperCase() + elementType.slice(1)}s</DialogTitle>
        </DialogHeader>

        <div className="space-y-md">
          <div>
            <Label htmlFor="entity">Entity (applies to all)</Label>
            <Select value={entity || undefined} onValueChange={setEntity}>
              <SelectTrigger>
                <SelectValue placeholder="Select entity..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FBK">FBK</SelectItem>
                <SelectItem value="FBC">FBC</SelectItem>
                <SelectItem value="CFI">CFI</SelectItem>
                <SelectItem value="LCFX">LCFX</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="bulk-text">Paste {elementType}s (one per line)</Label>
            <Textarea
              id="bulk-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Paste your ${elementType}s here...\nOne per line`}
              rows={8}
            />
          </div>

          {preview.length === 0 ? (
            <Button onClick={handlePreview} disabled={!text}>
              Preview Import
            </Button>
          ) : (
            <>
              <div>
                <h3 className="font-medium mb-xs">Preview ({preview.length} items)</h3>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>Entity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell className="font-mono text-sm">{item}</TableCell>
                          <TableCell>{entity || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex gap-xs">
                <Button variant="outline" onClick={() => setPreview([])}>
                  Edit
                </Button>
                <Button onClick={handleImport} className="flex-1">
                  Import {preview.length} Items
                </Button>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
