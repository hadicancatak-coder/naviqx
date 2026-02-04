import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Grid, Table as TableIcon, Upload, Download, Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSystemEntities } from "@/hooks/useSystemEntities";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { CaptionGridView } from "@/components/captions/CaptionGridView";
import { CaptionTableView } from "@/components/captions/CaptionTableView";
import { CaptionDialog } from "@/components/captions/CaptionDialog";
import { CaptionImportDialog } from "@/components/captions/CaptionImportDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";

const CAPTION_TYPES = [
  { value: "headline", label: "Headline" },
  { value: "description", label: "Description" },
  { value: "primary_text", label: "Primary Text" },
  { value: "sitelink", label: "Sitelink" },
  { value: "callout", label: "Callout" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
  { value: "es", label: "Spanish" },
  { value: "az", label: "Azerbaijani" },
];

const STATUS_OPTIONS = [
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
];

// True Apple Liquid Glass styles
const glassStyles = {
  surface: {
    background: "rgba(18,18,18,0.45)",
    backdropFilter: "blur(32px) saturate(150%)",
    WebkitBackdropFilter: "blur(32px) saturate(150%)",
    border: "1px solid rgba(255,255,255,0.06)",
    boxShadow: "0 10px 40px rgba(0,0,0,0.65)",
    borderRadius: "16px",
  } as React.CSSProperties,
  highlight: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0))",
};

export type Caption = {
  id: string;
  element_type: string;
  content: Record<string, unknown> | string;
  entity: string[];
  language: string;
  google_status: string;
  created_at: string;
  updated_at: string;
  use_count: number;
  is_favorite: boolean;
  tags: string[];
  created_by: string;
};

export default function CaptionLibrary() {
  const queryClient = useQueryClient();
  const { data: systemEntities = [] } = useSystemEntities();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingCaption, setEditingCaption] = useState<Caption | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: captions, isLoading } = useQuery({
    queryKey: ["ad-elements", { type: typeFilter, entity: entityFilter, language: languageFilter, status: statusFilter, search: debouncedSearch }],
    queryFn: async () => {
      let query = supabase.from("ad_elements").select("*");

      if (typeFilter !== "all") {
        query = query.eq("element_type", typeFilter);
      }
      if (entityFilter !== "all") {
        query = query.contains("entity", [entityFilter]);
      }
      if (languageFilter !== "all") {
        query = query.eq("language", languageFilter.toUpperCase());
      }
      if (statusFilter !== "all") {
        query = query.eq("google_status", statusFilter);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;

      let filtered = data || [];
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        filtered = filtered.filter((item) => {
          const contentObj = item.content as Record<string, unknown>;
          const contentText = typeof item.content === "string" 
            ? item.content 
            : (contentObj?.text as string) || (contentObj?.en as string) || JSON.stringify(item.content);
          return contentText.toLowerCase().includes(searchLower);
        });
      }

      return filtered as Caption[];
    },
  });

  const handleCreate = () => {
    setEditingCaption(null);
    setDialogOpen(true);
  };

  const handleEdit = (caption: Caption) => {
    setEditingCaption(caption);
    setDialogOpen(true);
  };

  const exportToCSV = () => {
    if (!captions || captions.length === 0) {
      toast.error("No captions to export");
      return;
    }

    const headers = ["Type", "EN Content", "AR Content", "Entity", "Language", "Status", "Uses", "Created"];
    const rows = captions.map((c) => {
      let enContent = "";
      let arContent = "";
      
      if (typeof c.content === "string") {
        enContent = c.content;
      } else if (c.content) {
        const contentObj = c.content as Record<string, string>;
        enContent = contentObj.text || contentObj.en || "";
        arContent = contentObj.ar || "";
      }
      
      return [
        c.element_type,
        enContent.replace(/<[^>]*>/g, ''),
        arContent.replace(/<[^>]*>/g, ''),
        c.entity?.join("; ") || "",
        c.language || "EN",
        c.google_status || "pending",
        c.use_count || 0,
        format(new Date(c.created_at), "yyyy-MM-dd"),
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `captions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const typeStats = captions?.reduce((acc, c) => {
    acc[c.element_type] = (acc[c.element_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div 
      className="min-h-[calc(100vh-60px)] p-6 space-y-6 -mx-md -mt-md -mb-lg relative z-10"
      style={{
        background: "radial-gradient(circle at top, #1b1b1b 0%, #0c0c0c 55%, #050505 100%)",
      }}
    >
      {/* Header */}
      <div 
        className="p-6 relative overflow-hidden"
        style={glassStyles.surface}
      >
        <div 
          className="absolute inset-0 pointer-events-none rounded-[16px]"
          style={{ background: glassStyles.highlight }}
        />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 
              className="text-2xl font-semibold"
              style={{ color: "rgba(235,235,235,0.95)" }}
            >
              Caption Library
            </h1>
            <p style={{ color: "rgba(180,180,180,0.7)" }}>
              Unified library for all your marketing copy elements
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "grid" | "table")}>
              <TabsList 
                className="h-9 border-0 p-0.5"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  borderRadius: "10px",
                }}
              >
                <TabsTrigger 
                  value="grid" 
                  className="px-3 data-[state=active]:bg-white/15 data-[state=active]:shadow-none rounded-lg"
                  style={{ color: "rgba(235,235,235,0.9)" }}
                >
                  <Grid className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger 
                  value="table" 
                  className="px-3 data-[state=active]:bg-white/15 data-[state=active]:shadow-none rounded-lg"
                  style={{ color: "rgba(235,235,235,0.9)" }}
                >
                  <TableIcon className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setImportDialogOpen(true)}
              className="border-0 hover:bg-white/10"
              style={{ 
                color: "rgba(235,235,235,0.9)",
                background: "rgba(255,255,255,0.06)",
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={exportToCSV}
              className="border-0 hover:bg-white/10"
              style={{ 
                color: "rgba(235,235,235,0.9)",
                background: "rgba(255,255,255,0.06)",
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button 
              onClick={handleCreate} 
              className="rounded-full border-0 hover:bg-white/15"
              style={{
                background: "rgba(255,255,255,0.12)",
                color: "rgba(235,235,235,0.95)",
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Caption
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div 
        className="p-4 relative overflow-hidden"
        style={glassStyles.surface}
      >
        <div 
          className="absolute inset-0 pointer-events-none rounded-[16px]"
          style={{ background: glassStyles.highlight }}
        />
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search 
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" 
              style={{ color: "rgba(180,180,180,0.6)" }}
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search captions..."
              className="pl-9 border-0 focus-visible:ring-1 focus-visible:ring-white/20"
              style={{ 
                color: "rgba(235,235,235,0.95)",
                background: "rgba(255,255,255,0.06)",
              }}
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger 
              className="w-[140px] h-9 border-0"
              style={{ 
                background: "rgba(255,255,255,0.06)", 
                color: "rgba(235,235,235,0.9)",
              }}
            >
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {CAPTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger 
              className="w-[140px] h-9 border-0"
              style={{ 
                background: "rgba(255,255,255,0.06)", 
                color: "rgba(235,235,235,0.9)",
              }}
            >
              <SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {systemEntities.map((entity) => (
                <SelectItem key={entity.id} value={entity.name}>
                  {entity.emoji} {entity.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={languageFilter} onValueChange={setLanguageFilter}>
            <SelectTrigger 
              className="w-[130px] h-9 border-0"
              style={{ 
                background: "rgba(255,255,255,0.06)", 
                color: "rgba(235,235,235,0.9)",
              }}
            >
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger 
              className="w-[130px] h-9 border-0"
              style={{ 
                background: "rgba(255,255,255,0.06)", 
                color: "rgba(235,235,235,0.9)",
              }}
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Type Stats Pills */}
      <div className="flex gap-2 flex-wrap">
        {CAPTION_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => setTypeFilter(type.value === typeFilter ? "all" : type.value)}
            className="px-4 py-2 text-sm transition-all"
            style={{
              background: type.value === typeFilter 
                ? "rgba(255,255,255,0.15)" 
                : "rgba(18,18,18,0.45)",
              backdropFilter: "blur(32px) saturate(150%)",
              WebkitBackdropFilter: "blur(32px) saturate(150%)",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.65)",
              borderRadius: "16px",
              color: "rgba(235,235,235,0.9)",
            }}
          >
            {type.label} ({typeStats[type.value] || 0})
          </button>
        ))}
      </div>

      {/* Data Card */}
      <div 
        className="relative overflow-hidden"
        style={glassStyles.surface}
      >
        <div 
          className="absolute inset-0 pointer-events-none rounded-[16px]"
          style={{ background: glassStyles.highlight }}
        />
        <div className="relative z-10">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton columns={6} rows={10} />
            </div>
          ) : !captions || captions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Grid className="h-12 w-12 mb-4" style={{ color: "rgba(180,180,180,0.5)" }} />
              <h3 
                className="text-lg font-semibold mb-2"
                style={{ color: "rgba(235,235,235,0.95)" }}
              >
                No captions found
              </h3>
              <p 
                className="text-sm mb-4"
                style={{ color: "rgba(180,180,180,0.7)" }}
              >
                Create your first caption or adjust filters
              </p>
              <Button 
                onClick={handleCreate}
                className="border-0 hover:bg-white/15"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  color: "rgba(235,235,235,0.95)",
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Caption
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            <CaptionGridView captions={captions} onEdit={handleEdit} />
          ) : (
            <CaptionTableView captions={captions} onEdit={handleEdit} />
          )}
        </div>
      </div>

      <CaptionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        caption={editingCaption}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["ad-elements"] });
          setDialogOpen(false);
        }}
      />

      <CaptionImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["ad-elements"] });
        }}
      />
    </div>
  );
}
