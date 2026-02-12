import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useSystemEntities } from "@/hooks/useSystemEntities";

export function AssetImportDialog() {
  const [open, setOpen] = useState(false);
  const [entity, setEntity] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { data: systemEntities } = useSystemEntities();

  const handleImport = async () => {
    if (!file || !entity) {
      toast.error("Please select a file and entity");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("entity", entity);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-asset-intelligence`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Import failed");

      toast.success(
        `Imported ${result.summary.unique_assets} unique assets from ${result.summary.total_parsed} records for ${entity}`
      );
      queryClient.invalidateQueries({ queryKey: ["asset-intelligence"] });
      queryClient.invalidateQueries({ queryKey: ["asset-insights"] });
      setOpen(false);
      setFile(null);
      setEntity("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-xs">
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="liquid-glass-elevated rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-heading-sm font-semibold">Import Asset Data</DialogTitle>
        </DialogHeader>
        <div className="space-y-md">
          <div>
            <label className="text-metadata font-medium text-muted-foreground mb-xs block">
              Country / Entity
            </label>
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger className="bg-elevated border-input">
                <SelectValue placeholder="Select entity..." />
              </SelectTrigger>
              <SelectContent className="liquid-glass-dropdown">
                {(systemEntities || []).map((e) => (
                  <SelectItem key={e.name} value={e.name}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-metadata font-medium text-muted-foreground mb-xs block">
              CSV File
            </label>
            <label className="flex flex-col items-center justify-center gap-sm p-lg border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-card-hover transition-smooth">
              <FileUp className="h-8 w-8 text-muted-foreground" />
              <span className="text-body-sm text-muted-foreground">
                {file ? file.name : "Click to select CSV file"}
              </span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          <Button
            onClick={handleImport}
            disabled={!file || !entity || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-xs" />
                Importing...
              </>
            ) : (
              "Import Assets"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
