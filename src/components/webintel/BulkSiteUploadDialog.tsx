import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { WebIntelSite } from "@/hooks/useWebIntelSites";

interface BulkSiteUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (sites: Omit<WebIntelSite, "id" | "created_at" | "updated_at" | "created_by">[]) => void;
}

export function BulkSiteUploadDialog({
  open,
  onOpenChange,
  onImport,
}: BulkSiteUploadDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [previewData, setPreviewData] = useState<any[]>([]);

  const downloadTemplate = () => {
    const headers = ['Name', 'URL', 'Country', 'Type', 'Category', 'Entity', 'Tags', 'Notes'];
    const sampleRow = [
      'Gulf News',
      'https://gulfnews.com',
      'UAE',
      'Website',
      'News',
      'Gulf News Publishing',
      'GDN,Direct',
      'Premium news publisher'
    ];
    
    const csv = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'web-intel-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const text = await file.text();
      const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')));
      
      if (rows.length < 2) {
        toast.error("CSV file must contain at least a header and one data row");
        setUploading(false);
        return;
      }

      const headers = rows[0];
      const dataRows = rows.slice(1).filter(row => row.length >= 3 && row[0] && row[1]);

      if (dataRows.length > 10000) {
        toast.error("Maximum 10,000 sites allowed per import");
        setUploading(false);
        return;
      }

      const sites: Omit<WebIntelSite, "id" | "created_at" | "updated_at" | "created_by">[] = [];
      
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        
        const site: Omit<WebIntelSite, "id" | "created_at" | "updated_at" | "created_by"> = {
          name: row[0] || '',
          url: row[1] || '',
          country: row[2] || 'UAE',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type: (row[3] as any) || 'Website',
          category: row[4] || undefined,
          estimated_monthly_traffic: undefined,
          entity: row[5] || undefined,
          tags: row[6] ? row[6].split(',').map(t => t.trim()) : [],
          notes: row[7] || undefined,
        };

        // Validate required fields
        if (!site.name || !site.url) {
          toast.error(`Row ${i + 2}: Missing required fields (Name or URL)`);
          continue;
        }

        // Validate URL format
        try {
          new URL(site.url.startsWith('http') ? site.url : `https://${site.url}`);
        } catch {
          toast.error(`Row ${i + 2}: Invalid URL format`);
          continue;
        }

        sites.push(site);
        setProgress(Math.round(((i + 1) / dataRows.length) * 100));
      }

      setPreviewData(sites.slice(0, 10));
      
      if (sites.length === 0) {
        toast.error("No valid sites found in CSV");
        setUploading(false);
        return;
      }

      toast.success(`Parsed ${sites.length} sites. Review and confirm import.`);
      
      // Auto-import after successful parse
      setTimeout(() => {
        onImport(sites);
        setUploading(false);
        setProgress(0);
        setPreviewData([]);
        onOpenChange(false);
      }, 1000);

    } catch (error) {
      logger.error('CSV parsing error:', error);
      toast.error("Failed to parse CSV file");
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk Upload Sites</DialogTitle>
        </DialogHeader>

        <div className="space-y-lg">
          <div>
            <h3 className="font-semibold mb-sm">Instructions</h3>
            <ol className="text-body-sm text-muted-foreground space-y-xs list-decimal list-inside">
              <li>Download the CSV template</li>
              <li>Fill in your site data (up to 10,000 sites)</li>
              <li>Upload the completed CSV file</li>
              <li>Review the preview and confirm import</li>
            </ol>
          </div>

          <div className="flex gap-md">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            
            <div className="flex-1">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={uploading}
                className="cursor-pointer"
              />
            </div>
          </div>

          {uploading && (
            <div className="space-y-sm">
              <div className="flex items-center justify-between text-body-sm">
                <span>Processing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {previewData.length > 0 && (
            <div>
              <h3 className="font-semibold mb-sm">Preview (First 10 sites)</h3>
              <div className="border rounded-lg overflow-auto max-h-60">
                <table className="w-full text-body-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-sm">Name</th>
                      <th className="text-left p-sm">URL</th>
                      <th className="text-left p-sm">Country</th>
                      <th className="text-left p-sm">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((site, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-sm">{site.name}</td>
                        <td className="p-sm max-w-xs truncate">{site.url}</td>
                        <td className="p-sm">{site.country}</td>
                        <td className="p-sm">{site.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
