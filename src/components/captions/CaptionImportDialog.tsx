import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, FileSpreadsheet, AlertCircle, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CaptionImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedRow {
  type: string;
  content: string;
  entity: string[];
  language: string;
  status: string;
  valid: boolean;
  errors: string[];
}

const VALID_TYPES = ["headline", "description", "primary_text", "sitelink", "callout"];
const VALID_LANGUAGES = ["EN", "AR", "ES", "AZ"];
const VALID_STATUSES = ["pending", "approved", "rejected"];

export function CaptionImportDialog({ open, onOpenChange, onSuccess }: CaptionImportDialogProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState<"upload" | "preview">("upload");

  const downloadTemplate = () => {
    const headers = ["type", "content", "entity", "language", "status"];
    const exampleRows = [
      ["headline", "Get 50% Off Today!", "CFI", "EN", "pending"],
      ["description", "Trade with confidence on our award-winning platform.", "CFI; CFIUAE", "EN", "approved"],
      ["callout", "24/7 Support", "CFI", "AR", "pending"],
      ["sitelink", "Open Account", "CFIUAE", "EN", "approved"],
    ];

    const csv = [headers, ...exampleRows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "caption-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return [];

    // Parse header
    const headerLine = lines[0];
    const headers = headerLine.split(",").map((h) => 
      h.trim().replace(/^["']|["']$/g, "").toLowerCase()
    );

    const typeIdx = headers.indexOf("type");
    const contentIdx = headers.indexOf("content");
    const entityIdx = headers.indexOf("entity");
    const languageIdx = headers.indexOf("language");
    const statusIdx = headers.indexOf("status");

    if (typeIdx === -1 || contentIdx === -1) {
      toast.error("CSV must have 'type' and 'content' columns");
      return [];
    }

    return lines.slice(1).map((line) => {
      // Parse CSV line handling quoted values
      const values: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (const char of line) {
        if (char === '"' && !inQuotes) {
          inQuotes = true;
        } else if (char === '"' && inQuotes) {
          inQuotes = false;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const type = values[typeIdx]?.toLowerCase().trim() || "";
      const content = values[contentIdx]?.trim() || "";
      const entityStr = entityIdx !== -1 ? values[entityIdx]?.trim() || "" : "";
      const language = languageIdx !== -1 ? values[languageIdx]?.toUpperCase().trim() || "EN" : "EN";
      const status = statusIdx !== -1 ? values[statusIdx]?.toLowerCase().trim() || "pending" : "pending";

      const entity = entityStr
        .split(/[;,]/)
        .map((e) => e.trim())
        .filter(Boolean);

      const errors: string[] = [];

      if (!VALID_TYPES.includes(type)) {
        errors.push(`Invalid type: ${type}`);
      }
      if (!content) {
        errors.push("Content is required");
      }
      if (!VALID_LANGUAGES.includes(language)) {
        errors.push(`Invalid language: ${language}`);
      }
      if (!VALID_STATUSES.includes(status)) {
        errors.push(`Invalid status: ${status}`);
      }

      return {
        type,
        content,
        entity,
        language,
        status,
        valid: errors.length === 0,
        errors,
      };
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setParsedData(parsed);
      if (parsed.length > 0) {
        setStep("preview");
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!user?.id) {
      toast.error("You must be logged in to import");
      return;
    }

    const validRows = parsedData.filter((row) => row.valid);
    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    setIsImporting(true);

    try {
      const insertData = validRows.map((row) => ({
        created_by: user.id,
        element_type: row.type,
        content: { text: row.content },
        entity: row.entity,
        language: row.language,
        google_status: row.status,
      }));

      const { error } = await supabase.from("ad_elements").insert(insertData);

      if (error) throw error;

      toast.success(`Successfully imported ${validRows.length} captions`);
      onSuccess();
      handleClose();
    } catch (error: any) {
      toast.error("Failed to import: " + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setStep("upload");
    onOpenChange(false);
  };

  const validCount = parsedData.filter((r) => r.valid).length;
  const invalidCount = parsedData.filter((r) => !r.valid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Captions</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import captions into the library
          </DialogDescription>
        </DialogHeader>

        {step === "upload" ? (
          <div className="flex-1 space-y-md">
            {/* Template Download */}
            <div className="flex items-center justify-between p-md rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-sm">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Download Template</p>
                  <p className="text-body-sm text-muted-foreground">
                    Use our CSV template to format your data correctly
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
            </div>

            {/* Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors",
                "hover:border-primary hover:bg-primary/5",
                file ? "border-success bg-success/5" : "border-border"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Upload className={cn("h-12 w-12 mx-auto mb-md", file ? "text-success" : "text-muted-foreground")} />
              {file ? (
                <p className="text-success font-medium">{file.name}</p>
              ) : (
                <>
                  <p className="text-foreground font-medium mb-1">Click to upload or drag & drop</p>
                  <p className="text-body-sm text-muted-foreground">CSV files only</p>
                </>
              )}
            </div>

            {/* Format Guide */}
            <div className="text-body-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">CSV Format:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><strong>type</strong>: headline, description, primary_text, sitelink, callout</li>
                <li><strong>content</strong>: The caption text (required)</li>
                <li><strong>entity</strong>: Entity names separated by semicolon (e.g., "CFI; CFIUAE")</li>
                <li><strong>language</strong>: EN, AR, ES, or AZ (default: EN)</li>
                <li><strong>status</strong>: pending, approved, or rejected (default: pending)</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-md overflow-hidden flex flex-col">
            {/* Summary */}
            <div className="flex gap-md">
              <div className="flex items-center gap-xs px-sm py-xs rounded-lg bg-success/15 text-success">
                <Check className="h-4 w-4" />
                <span className="font-medium">{validCount} valid</span>
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center gap-xs px-sm py-xs rounded-lg bg-destructive/15 text-destructive">
                  <X className="h-4 w-4" />
                  <span className="font-medium">{invalidCount} invalid</span>
                </div>
              )}
            </div>

            {/* Preview Table */}
            <div className="flex-1 overflow-auto border border-border rounded-lg">
              <table className="w-full text-body-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-left px-3 py-2 font-medium">Type</th>
                    <th className="text-left px-3 py-2 font-medium">Content</th>
                    <th className="text-left px-3 py-2 font-medium">Entity</th>
                    <th className="text-left px-3 py-2 font-medium">Lang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsedData.map((row, idx) => (
                    <tr key={idx} className={cn(!row.valid && "bg-destructive/5")}>
                      <td className="px-3 py-2">
                        {row.valid ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            <span className="text-destructive text-metadata">{row.errors[0]}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 capitalize">{row.type}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate">{row.content}</td>
                      <td className="px-3 py-2">{row.entity.join(", ") || "-"}</td>
                      <td className="px-3 py-2">{row.language}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "preview" && (
            <Button variant="outline" onClick={() => setStep("upload")}>
              Back
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {step === "preview" && (
            <Button onClick={handleImport} disabled={isImporting || validCount === 0}>
              {isImporting ? "Importing..." : `Import ${validCount} Captions`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
