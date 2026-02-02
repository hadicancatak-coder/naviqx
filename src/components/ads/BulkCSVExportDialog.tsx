import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Download, FileText } from 'lucide-react';
import { adToGoogleEditorRow, convertToCSV } from '@/lib/googleEditorMapper';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

interface Ad {
  id: string;
  name?: string;
  approval_status?: string;
  [key: string]: unknown;
}

interface BulkCSVExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ads: Ad[];
}

export function BulkCSVExportDialog({ open, onOpenChange, ads }: BulkCSVExportDialogProps) {
  const [includeAll, setIncludeAll] = useState(true);
  const [onlyApproved, setOnlyApproved] = useState(false);
  const { toast } = useToast();

  const handleExport = () => {
    try {
      let adsToExport = ads;

      if (onlyApproved) {
        adsToExport = ads.filter(ad => ad.approval_status === 'approved');
      }

      if (adsToExport.length === 0) {
        toast({ 
          title: 'No ads to export', 
          description: 'No ads match the selected criteria', 
          variant: 'destructive' 
        });
        return;
      }

      const googleRows = adsToExport.map(adToGoogleEditorRow);
      const csv = convertToCSV(googleRows);

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `google-ads-export-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: `Exported ${adsToExport.length} ads to CSV` });
      onOpenChange(false);
    } catch (error: unknown) {
      toast({ 
        title: 'Export Failed', 
        description: error instanceof Error ? error.message : 'An error occurred', 
        variant: 'destructive' 
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-sm">
            <FileText className="h-5 w-5" />
            Export to Google Ads Editor CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-md">
          <div>
            <Label>Export Options</Label>
            <div className="mt-sm space-y-sm">
              <div className="flex items-center space-x-sm">
                <Checkbox 
                  id="only-approved" 
                  checked={onlyApproved}
                  onCheckedChange={(checked) => setOnlyApproved(checked as boolean)}
                />
                <label
                  htmlFor="only-approved"
                  className="text-body-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Only export approved ads
                </label>
              </div>
            </div>
          </div>

          <div className="bg-muted p-md rounded-lg space-y-sm">
            <div className="text-body-sm font-medium">Export Summary</div>
            <div className="text-body-sm text-muted-foreground">
              {onlyApproved 
                ? `${ads.filter(ad => ad.approval_status === 'approved').length} approved ads will be exported`
                : `${ads.length} ads will be exported`
              }
            </div>
          </div>

          <Button onClick={handleExport} className="w-full flex items-center gap-sm">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
