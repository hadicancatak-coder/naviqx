import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { parseCSV, googleEditorRowToAd } from '@/lib/googleEditorMapper';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BulkCSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

export function BulkCSVImportDialog({ open, onOpenChange, onImportComplete }: BulkCSVImportDialogProps) {
  const [preview, setPreview] = useState<Array<{
    campaign_name?: string;
    ad_group_name?: string;
    headlines?: string[];
    descriptions?: string[];
    [key: string]: unknown;
  }>>([]);
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const googleRows = parseCSV(csv);
        const ads = googleRows.map(googleEditorRowToAd);
        setPreview(ads);
        setErrors([]);
      } catch (error) {
        setErrors(['Failed to parse CSV file. Please check the format.']);
        toast({ 
          title: 'Parse Error', 
          description: 'Could not parse CSV file', 
          variant: 'destructive' 
        });
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setImporting(true);
    setErrors([]);
    const importErrors: string[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const [index, ad] of preview.entries()) {
        try {
          const { error } = await supabase.from('ads').insert({
            ...ad,
            name: `${ad.campaign_name} - ${ad.ad_group_name}`,
            entity: 'CFI',
            created_by: user.id,
          });

          if (error) {
            importErrors.push(`Row ${index + 1}: ${error.message}`);
          }
        } catch (err: unknown) {
          importErrors.push(`Row ${index + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      if (importErrors.length === 0) {
        toast({ title: `Successfully imported ${preview.length} ads` });
        onImportComplete?.();
        onOpenChange(false);
        setPreview([]);
      } else {
        setErrors(importErrors);
        toast({ 
          title: 'Partial Import', 
          description: `${preview.length - importErrors.length} ads imported, ${importErrors.length} failed`, 
          variant: 'destructive' 
        });
      }
    } catch (error: unknown) {
      toast({ 
        title: 'Import Failed', 
        description: error instanceof Error ? error.message : 'An error occurred', 
        variant: 'destructive' 
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Bulk Import from Google Ads Editor CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-md">
          {preview.length === 0 ? (
            <div className="space-y-md">
              <div>
                <Label htmlFor="csv-file">Upload Google Ads Editor CSV</Label>
                <div className="mt-sm flex items-center gap-md">
                  <Button asChild variant="outline">
                    <label htmlFor="csv-file" className="cursor-pointer flex items-center gap-sm">
                      <Upload className="h-4 w-4" />
                      Choose File
                      <input
                        id="csv-file"
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Upload a CSV file exported from Google Ads Editor. The file should include Campaign, Ad group, Headlines, Descriptions, and Final URL columns.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <>
              {errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-xs">Import Errors:</div>
                    <ul className="list-disc list-inside space-y-xs">
                      {errors.slice(0, 5).map((err, i) => (
                        <li key={i} className="text-body-sm">{err}</li>
                      ))}
                      {errors.length > 5 && <li className="text-body-sm">...and {errors.length - 5} more</li>}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <h3 className="font-medium mb-sm">Preview ({preview.length} ads)</h3>
                <div className="border rounded-lg max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Ad Group</TableHead>
                        <TableHead>Headlines</TableHead>
                        <TableHead>Descriptions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((ad, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell className="font-medium">{ad.campaign_name}</TableCell>
                          <TableCell>{ad.ad_group_name}</TableCell>
                          <TableCell className="text-body-sm">{ad.headlines?.length || 0} headlines</TableCell>
                          <TableCell className="text-body-sm">{ad.descriptions?.length || 0} descriptions</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex gap-sm">
                <Button variant="outline" onClick={() => setPreview([])}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={importing} className="flex-1">
                  {importing ? 'Importing...' : `Import ${preview.length} Ads`}
                </Button>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
