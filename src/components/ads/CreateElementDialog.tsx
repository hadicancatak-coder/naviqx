import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateAdElement } from '@/hooks/useAdElements';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ENTITIES } from '@/lib/constants';

interface CreateElementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elementType: 'headline' | 'description' | 'sitelink' | 'callout';
}

export function CreateElementDialog({ open, onOpenChange, elementType }: CreateElementDialogProps) {
  const [content, setContent] = useState('');
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [tags, setTags] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState<'EN' | 'AR'>('EN');
  const createElement = useCreateAdElement();

  // Auto-detect language
  useEffect(() => {
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
    setDetectedLanguage(arabicRegex.test(content) ? 'AR' : 'EN');
  }, [content]);

  const handleSave = () => {
    createElement.mutate({
      element_type: elementType,
      content: { text: content },
      entity: selectedEntities,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      google_status: 'pending',
      is_favorite: false,
      platform: 'ppc',
    }, {
      onSuccess: () => {
        setContent('');
        setSelectedEntities([]);
        setTags('');
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {elementType.charAt(0).toUpperCase() + elementType.slice(1)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-md">
          <div>
            <Label htmlFor="content">Content</Label>
            {elementType === 'description' ? (
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`Enter ${elementType} content...`}
                rows={3}
              />
            ) : (
              <Input
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`Enter ${elementType} content...`}
              />
            )}
          </div>

          <div>
            <Label>Countries (Select Multiple)</Label>
            <ScrollArea className="h-[200px] border rounded-md p-md mt-xs">
              <div className="space-y-xs">
                {ENTITIES.map((entity) => (
                  <div key={entity} className="flex items-center space-x-2">
                    <Checkbox
                      id={entity}
                      checked={selectedEntities.includes(entity)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedEntities([...selectedEntities, entity]);
                        } else {
                          setSelectedEntities(selectedEntities.filter(e => e !== entity));
                        }
                      }}
                    />
                    <label htmlFor={entity} className="text-sm cursor-pointer">
                      {entity}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {selectedEntities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedEntities.map((ent) => (
                  <Badge key={ent} variant="outline" className="text-xs">
                    {ent}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Detected Language</Label>
            <div className="mt-2">
              <Badge variant={detectedLanguage === 'AR' ? 'secondary' : 'default'}>
                {detectedLanguage === 'AR' ? 'Arabic (AR)' : 'English (EN)'}
              </Badge>
            </div>
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="promo, sale, new..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!content}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
