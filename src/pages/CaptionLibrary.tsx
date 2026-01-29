import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Grid, Table as TableIcon, Upload, Download } from "lucide-react";
import { PageContainer, PageHeader, FilterBar, DataCard } from "@/components/layout";
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

  // Fetch captions from ad_elements table - unified query key for cache sync
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
        // Fixed: match stored format (uppercase)
        query = query.eq("language", languageFilter.toUpperCase());
      }
      if (statusFilter !== "all") {
        query = query.eq("google_status", statusFilter);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;

      // Client-side search filter
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
      // Handle all content formats consistently
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
        enContent.replace(/<[^>]*>/g, ''), // Strip HTML
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
    <PageContainer>
      <PageHeader
        title="Caption Library"
        description="Unified library for all your marketing copy elements"
        actions={
          <div className="flex items-center gap-sm">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "grid" | "table")}>
              <TabsList className="h-9">
                <TabsTrigger value="grid" className="px-sm">
                  <Grid className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="table" className="px-sm">
                  <TableIcon className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-sm" />
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-sm" />
              Export
            </Button>
            <Button onClick={handleCreate} className="rounded-full">
              <Plus className="h-4 w-4 mr-sm" />
              New Caption
            </Button>
          </div>
        }
      />

      <FilterBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search captions...",
        }}
      >
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] h-9 bg-card rounded-lg">
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
          <SelectTrigger className="w-[140px] h-9 bg-card rounded-lg">
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
          <SelectTrigger className="w-[130px] h-9 bg-card rounded-lg">
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
          <SelectTrigger className="w-[130px] h-9 bg-card rounded-lg">
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
      </FilterBar>

      {/* Type Stats */}
      <div className="flex gap-sm flex-wrap">
        {CAPTION_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => setTypeFilter(type.value === typeFilter ? "all" : type.value)}
            className={`px-sm py-xs rounded-full text-body-sm transition-smooth ${
              type.value === typeFilter
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {type.label} ({typeStats[type.value] || 0})
          </button>
        ))}
      </div>

      <DataCard noPadding>
        {isLoading ? (
          <div className="p-md">
            <TableSkeleton columns={6} rows={10} />
          </div>
        ) : !captions || captions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-xl text-center">
            <Grid className="h-12 w-12 text-muted-foreground mb-md" />
            <h3 className="text-heading-sm font-semibold mb-sm">No captions found</h3>
            <p className="text-body-sm text-muted-foreground mb-md">
              Create your first caption or adjust filters
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-sm" />
              Create Caption
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <CaptionGridView captions={captions} onEdit={handleEdit} />
        ) : (
          <CaptionTableView captions={captions} onEdit={handleEdit} />
        )}
      </DataCard>

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
    </PageContainer>
  );
}
