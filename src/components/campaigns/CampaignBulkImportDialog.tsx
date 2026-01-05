import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Upload, FileSpreadsheet, CheckCircle2, XCircle, RefreshCw, Loader2 } from "lucide-react";
import { useUpsertUtmCampaigns } from "@/hooks/useUtmCampaigns";
import { CAMPAIGN_TYPES, type CampaignType } from "@/domain/campaigns";
import { toast } from "sonner";

interface CampaignBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  name: string;
  landing_page: string;
  campaign_type: string;
  description: string;
  isValid: boolean;
  errors: string[];
  isUpdate: boolean;
}

export function CampaignBulkImportDialog({ open, onOpenChange }: CampaignBulkImportDialogProps) {
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set());
  
  const upsertMutation = useUpsertUtmCampaigns();

  const downloadTemplate = () => {
    const headers = ["name", "landing_page", "campaign_type", "description"];
    const exampleRow = ["Summer Sale 2025", "https://example.com/promo", "Performance", "Q2 promotional campaign"];
    const csvContent = [headers.join(","), exampleRow.join(",")].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "campaign_import_template.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
    const nameIdx = headers.indexOf("name");
    const landingPageIdx = headers.indexOf("landing_page");
    const typeIdx = headers.indexOf("campaign_type");
    const descIdx = headers.indexOf("description");
    
    if (nameIdx === -1) {
      toast.error("CSV must have a 'name' column");
      return [];
    }
    
    const rows: ParsedRow[] = [];
    const seenNames = new Set<string>();
    
    for (let i = 1; i < lines.length; i++) {
      // Handle quoted CSV values
      const values: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (const char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      const name = values[nameIdx]?.replace(/"/g, "").trim() || "";
      const landing_page = landingPageIdx >= 0 ? values[landingPageIdx]?.replace(/"/g, "").trim() || "" : "";
      const campaign_type = typeIdx >= 0 ? values[typeIdx]?.replace(/"/g, "").trim() || "" : "";
      const description = descIdx >= 0 ? values[descIdx]?.replace(/"/g, "").trim() || "" : "";
      
      const errors: string[] = [];
      
      if (!name) {
        errors.push("Name is required");
      } else if (seenNames.has(name.toLowerCase())) {
        errors.push("Duplicate name in file");
      }
      
      if (campaign_type && !CAMPAIGN_TYPES.includes(campaign_type as CampaignType)) {
        errors.push(`Invalid type. Valid: ${CAMPAIGN_TYPES.join(", ")}`);
      }
      
      if (name) seenNames.add(name.toLowerCase());
      
      rows.push({
        name,
        landing_page,
        campaign_type,
        description,
        isValid: errors.length === 0,
        errors,
        isUpdate: existingNames.has(name.toLowerCase()),
      });
    }
    
    return rows;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }
    
    const text = await file.text();
    const parsed = parseCSV(text);
    
    if (parsed.length === 0) {
      toast.error("No valid data found in CSV");
      return;
    }
    
    setParsedData(parsed);
    setStep("preview");
    e.target.value = "";
  };

  const handleImport = async () => {
    const validRows = parsedData.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }
    
    try {
      await upsertMutation.mutateAsync(validRows.map(r => ({
        name: r.name,
        landing_page: r.landing_page || undefined,
        campaign_type: r.campaign_type || undefined,
        description: r.description || undefined,
      })));
      handleClose();
    } catch {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    setStep("upload");
    setParsedData([]);
    setExistingNames(new Set());
    onOpenChange(false);
  };

  const validCount = parsedData.filter(r => r.isValid).length;
  const invalidCount = parsedData.filter(r => !r.isValid).length;
  const updateCount = parsedData.filter(r => r.isValid && r.isUpdate).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-sm">
            <FileSpreadsheet className="size-5" />
            Bulk Import Campaigns
          </DialogTitle>
          <DialogDescription>
            Import campaigns from a CSV file. Existing campaigns (matched by name) will be updated.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-md py-md">
            <Alert>
              <AlertDescription className="text-body-sm">
                <strong>CSV Format:</strong> name (required), landing_page, campaign_type, description
                <br />
                <strong>Valid types:</strong> {CAMPAIGN_TYPES.join(", ")}
              </AlertDescription>
            </Alert>
            
            <div className="flex items-center gap-md">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download />
                Download Template
              </Button>
              
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Button>
                  <Upload />
                  Upload CSV
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="flex-1 flex flex-col gap-md overflow-hidden">
            <div className="flex items-center gap-sm flex-wrap">
              <Badge variant="default" className="bg-success/15 text-success border-success/30">
                <CheckCircle2 className="size-3 mr-1" />
                {validCount} valid
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive">
                  <XCircle className="size-3 mr-1" />
                  {invalidCount} invalid
                </Badge>
              )}
              {updateCount > 0 && (
                <Badge variant="secondary">
                  <RefreshCw className="size-3 mr-1" />
                  {updateCount} will update
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Landing Page</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((row, idx) => (
                    <TableRow key={idx} className={!row.isValid ? "bg-destructive/5" : ""}>
                      <TableCell>
                        {row.isValid ? (
                          row.isUpdate ? (
                            <RefreshCw className="size-4 text-warning" />
                          ) : (
                            <CheckCircle2 className="size-4 text-success" />
                          )
                        ) : (
                          <XCircle className="size-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {row.name || <span className="text-muted-foreground italic">Empty</span>}
                        {row.errors.length > 0 && (
                          <div className="text-metadata text-destructive mt-1">
                            {row.errors.join(", ")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {row.landing_page || "—"}
                      </TableCell>
                      <TableCell>{row.campaign_type || "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {row.description || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          {step === "preview" && (
            <Button variant="ghost" onClick={() => setStep("upload")}>
              Back
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {step === "preview" && (
            <Button 
              onClick={handleImport} 
              disabled={validCount === 0 || upsertMutation.isPending}
            >
              {upsertMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Importing...
                </>
              ) : (
                <>Import {validCount} Campaigns</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
