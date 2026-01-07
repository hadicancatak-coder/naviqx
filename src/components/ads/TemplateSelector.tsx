import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAdTemplates, useDeleteAdTemplate } from '@/hooks/useAdTemplates';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: any) => void;
}

export function TemplateSelector({ open, onOpenChange, onSelect }: TemplateSelectorProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const { data: templates, isLoading } = useAdTemplates();
  const deleteTemplate = useDeleteAdTemplate();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (showDeleteConfirm) {
      deleteTemplate.mutate(showDeleteConfirm);
      setShowDeleteConfirm(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Load from Template</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
        ) : templates && templates.length > 0 ? (
          <div className="grid gap-md md:grid-cols-2">
            {templates.map((template) => (
              <Card 
                key={template.id} 
                className="p-md hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  onSelect(template);
                  onOpenChange(false);
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                    )}
                  </div>
                  <AlertDialog open={showDeleteConfirm === template.id} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(template.id); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="z-overlay" onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this template?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                
                 <div className="flex gap-2 mt-3">
                  <Badge variant={(template as any).ad_type === 'display' ? 'default' : 'outline'}>
                    {(template as any).ad_type === 'display' ? 'Display' : 'Search'}
                  </Badge>
                  {template.entity && (
                    <Badge variant="outline">{template.entity}</Badge>
                  )}
                  <Badge variant="secondary">
                    {(template as any).ad_type === 'display' 
                      ? `${((template as any).short_headlines?.filter((h: string) => h).length || 0)} headlines`
                      : `${(template.headlines?.length || 0)} headlines`
                    }
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">No templates saved yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create an approved ad and save it as a template
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
