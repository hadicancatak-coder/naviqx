import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Upload, FileSpreadsheet, CheckCircle2, XCircle, RefreshCw, Loader2 } from "lucide-react";
import { useUpsertUtmCampaigns } from "@/hooks/useUtmCampaigns";
import { CAMPAIGN_TYPES, CAMPAIGN_STATUSES, type CampaignType, type CampaignStatus } from "@/domain/campaigns";
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
  asset_link: string;
  version_number: string;
  version_notes: string;
  status: string;
  platform: string;
  entity: string;
  launch_date: string;
  campaign_link: string;
  hubspot_utm_campaign: string;
  isValid: boolean;
  errors: string[];
  isUpdate: boolean;
  hasVersionData: boolean;
}

// Column name mappings: user's CSV header -> internal field
const COLUMN_MAPPINGS: Record<string, string> = {
  // Name variations
  "name": "name",
  "campaign name": "name",
  "campaign_name": "name",
  
  // Landing page variations
  "landing_page": "landing_page",
  "lp link": "landing_page",
  "lp_link": "landing_page",
  "landingpage": "landing_page",
  
  // Campaign type variations
  "campaign_type": "campaign_type",
  "campaign type": "campaign_type",
  "type": "campaign_type",
  
  // Status variations
  "status": "status",
  "campaign status": "status",
  "campaign_status": "status",
  
  // Platform variations
  "platform": "platform",
  "platfrom": "platform", // Common typo
  
  // Entity variations
  "entity": "entity",
  
  // Launch date variations
  "launch_date": "launch_date",
  "launch date": "launch_date",
  "launchdate": "launch_date",
  
  // Campaign link variations
  "campaign_link": "campaign_link",
  "campaign link": "campaign_link",
  "campaignlink": "campaign_link",
  
  // Hubspot UTM Campaign variations
  "hubspot_utm_campaign": "hubspot_utm_campaign",
  "hubspot utm campaign": "hubspot_utm_campaign",
  "hubspot": "hubspot_utm_campaign",
  
  // Description
  "description": "description",
  
  // Version fields
  "asset_link": "asset_link",
  "version_number": "version_number",
  "version": "version_number",
  "version_notes": "version_notes",
};

export function CampaignBulkImportDialog({ open, onOpenChange }: CampaignBulkImportDialogProps) {
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set());
  
  const upsertMutation = useUpsertUtmCampaigns();

  const downloadTemplate = () => {
    const headers = ["Campaign Name", "LP Link", "Campaign Type", "Campaign Status", "Platform", "Entity", "Launch Date", "Campaign Link", "Hubspot UTM Campaign", "Version", "Description"];
    const exampleRow = [
      "Summer Sale 2025",
      "https://example.com/promo",
      "Performance",
      "Active",
      "META",
      "Kuwait",
      "22/12/2026",
      "https://ads.facebook.com/...",
      "Summer_Sale_2025",
      "1",
      "Q2 promotional campaign"
    ];
    const csvContent = [headers.join(","), exampleRow.map(v => `"${v}"`).join(",")].join("\n");
    
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
    
    // Parse headers and map to internal field names
    const rawHeaders = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
    const headerMapping: Record<number, string> = {};
    
    rawHeaders.forEach((header, idx) => {
      const mappedField = COLUMN_MAPPINGS[header];
      if (mappedField) {
        headerMapping[idx] = mappedField;
      }
    });
    
    // Check required columns
    const hasName = Object.values(headerMapping).includes("name");
    const hasLandingPage = Object.values(headerMapping).includes("landing_page");
    const hasEntity = Object.values(headerMapping).includes("entity");
    
    if (!hasName) {
      toast.error("CSV must have a 'Campaign Name' or 'name' column");
      return [];
    }
    if (!hasLandingPage) {
      toast.error("CSV must have a 'LP Link' or 'landing_page' column");
      return [];
    }
    if (!hasEntity) {
      toast.error("CSV must have an 'Entity' column");
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
      
      // Extract values based on mapping
      const getValue = (field: string): string => {
        const idx = Object.entries(headerMapping).find(([_, f]) => f === field)?.[0];
        if (idx !== undefined) {
          return values[parseInt(idx)]?.replace(/"/g, "").trim() || "";
        }
        return "";
      };
      
      const name = getValue("name");
      const landing_page = getValue("landing_page");
      const campaign_type = getValue("campaign_type");
      const description = getValue("description");
      const asset_link = getValue("asset_link");
      const version_number = getValue("version_number");
      const version_notes = getValue("version_notes");
      const status = getValue("status");
      const platform = getValue("platform");
      const entity = getValue("entity");
      const launch_date = getValue("launch_date");
      const campaign_link = getValue("campaign_link");
      const hubspot_utm_campaign = getValue("hubspot_utm_campaign");
      
      const errors: string[] = [];
      
      // Validate required fields
      if (!name) {
        errors.push("Campaign Name is required");
      } else if (seenNames.has(name.toLowerCase())) {
        errors.push("Duplicate name in file");
      }
      
      if (!landing_page) {
        errors.push("LP Link is required");
      }
      
      if (!entity) {
        errors.push("Entity is required");
      }
      
      // Validate campaign_type if provided
      if (campaign_type && !CAMPAIGN_TYPES.includes(campaign_type as CampaignType)) {
        errors.push(`Invalid type. Valid: ${CAMPAIGN_TYPES.join(", ")}`);
      }
      
      // Validate status if provided
      if (status && !CAMPAIGN_STATUSES.includes(status as CampaignStatus)) {
        errors.push(`Invalid status. Valid: ${CAMPAIGN_STATUSES.join(", ")}`);
      }
      
      // Validate version_number if provided
      if (version_number) {
        const vNum = parseInt(version_number, 10);
        if (isNaN(vNum) || vNum <= 0) {
          errors.push("Version number must be a positive integer");
        }
      }
      
      // Validate URL formats if provided
      if (landing_page) {
        try {
          new URL(landing_page);
        } catch {
          errors.push("LP Link must be a valid URL");
        }
      }
      
      if (campaign_link) {
        try {
          new URL(campaign_link);
        } catch {
          errors.push("Campaign Link must be a valid URL");
        }
      }
      
      if (name) seenNames.add(name.toLowerCase());
      
      const hasVersionData = !!(asset_link || version_number || version_notes);
      
      rows.push({
        name,
        landing_page,
        campaign_type,
        description,
        asset_link,
        version_number,
        version_notes,
        status,
        platform,
        entity,
        launch_date,
        campaign_link,
        hubspot_utm_campaign,
        isValid: errors.length === 0,
        errors,
        isUpdate: existingNames.has(name.toLowerCase()),
        hasVersionData,
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
        asset_link: r.asset_link || undefined,
        version_number: r.version_number ? parseInt(r.version_number, 10) : undefined,
        version_notes: r.version_notes || undefined,
        status: r.status || undefined,
        platform: r.platform || undefined,
        entity: r.entity || undefined,
        launch_date: r.launch_date || undefined,
        campaign_link: r.campaign_link || undefined,
        hubspot_utm_campaign: r.hubspot_utm_campaign || undefined,
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
  const versionCount = parsedData.filter(r => r.isValid && r.hasVersionData).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
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
              <AlertDescription className="text-body-sm space-y-1">
                <div><strong>Required columns:</strong> Campaign Name, LP Link, Entity</div>
                <div><strong>Optional columns:</strong> Campaign Type, Campaign Status, Platform, Launch Date, Campaign Link, Hubspot UTM Campaign, Version, Description</div>
                <div><strong>Valid types:</strong> {CAMPAIGN_TYPES.join(", ")}</div>
                <div><strong>Valid statuses:</strong> {CAMPAIGN_STATUSES.join(", ")}</div>
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
              {versionCount > 0 && (
                <Badge variant="outline" className="border-primary/30 text-primary">
                  <FileSpreadsheet className="size-3 mr-1" />
                  {versionCount} with versions
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>LP Link</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Launch Date</TableHead>
                    <TableHead>Campaign Status</TableHead>
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
                      <TableCell>
                        {row.entity ? (
                          <Badge variant="outline" className="text-xs">{row.entity}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-muted-foreground">
                        {row.landing_page ? (
                          <a 
                            href={row.landing_page} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                            title={row.landing_page}
                          >
                            {(() => {
                              try {
                                return new URL(row.landing_page).hostname;
                              } catch {
                                return row.landing_page.slice(0, 30);
                              }
                            })()}
                          </a>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{row.campaign_type || "—"}</TableCell>
                      <TableCell>{row.platform || "—"}</TableCell>
                      <TableCell>{row.launch_date || "—"}</TableCell>
                      <TableCell>
                        {row.status ? (
                          <Badge variant="outline" className="text-xs">{row.status}</Badge>
                        ) : "—"}
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
