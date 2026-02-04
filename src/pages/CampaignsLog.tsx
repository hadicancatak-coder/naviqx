import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Upload, BookOpen, Share2, Download, MessageSquare } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CampaignTable } from "@/components/campaigns/CampaignTable";
import { CreateUtmCampaignDialog } from "@/components/campaigns/CreateUtmCampaignDialog";
import { CampaignBulkImportDialog } from "@/components/campaigns/CampaignBulkImportDialog";
import { CampaignShareDialogUnified } from "@/components/campaigns/CampaignShareDialogUnified";
import { CampaignBulkBar } from "@/components/campaigns/CampaignBulkBar";
import { EntityCommentsDialog } from "@/components/campaigns/EntityCommentsDialog";
import { useUtmCampaigns } from "@/hooks/useUtmCampaigns";
import { useSystemEntities } from "@/hooks/useSystemEntities";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader } from "@/components/layout";
import { toast } from "sonner";

export default function CampaignsLog() {
  const { loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [createCampaignDialogOpen, setCreateCampaignDialogOpen] = useState(false);
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareEntity, setShareEntity] = useState<string>("");
  const [entityCommentsOpen, setEntityCommentsOpen] = useState(false);

  const { data: entities = [] } = useSystemEntities();
  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useUtmCampaigns({ withTracking: true });
  
  // Fetch entity comment count for badge
  const { data: entityCommentCount = 0 } = useQuery({
    queryKey: ["entity-comment-count", entityFilter],
    queryFn: async () => {
      if (!entityFilter || entityFilter === "all") return 0;
      const { count } = await supabase
        .from("external_campaign_review_comments")
        .select("*", { count: "exact", head: true })
        .eq("entity", entityFilter)
        .eq("comment_type", "entity_feedback");
      return count || 0;
    },
    enabled: !!entityFilter && entityFilter !== "all",
  });
  
  // Fetch entity share info when opening share dialog
  const handleOpenShareDialog = useCallback((entity: string) => {
    setShareEntity(entity);
    setShareDialogOpen(true);
  }, []);

  // Filter campaigns based on search and entity
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (entityFilter === "all") return true;
      return c.tracking?.some(t => t.entity === entityFilter);
    });
  }, [campaigns, searchTerm, entityFilter]);

  const handleSelectCampaign = useCallback((id: string) => {
    setSelectedCampaigns(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedCampaigns.length === filteredCampaigns.length) {
      setSelectedCampaigns([]);
    } else {
      setSelectedCampaigns(filteredCampaigns.map(c => c.id));
    }
  }, [selectedCampaigns.length, filteredCampaigns]);

  const handleExportCSV = useCallback(() => {
    const campaignsToExport = selectedCampaigns.length > 0 
      ? filteredCampaigns.filter(c => selectedCampaigns.includes(c.id))
      : filteredCampaigns;
    
    const headers = ["Name", "Landing Page", "Type", "Entities", "Status"];
    const rows = campaignsToExport.map(c => [
      c.name,
      c.landing_page || "",
      c.campaign_type || "",
      c.tracking?.map(t => t.entity).join("; ") || "",
      c.tracking?.[0]?.status || ""
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(v => `"${v}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `campaigns_export_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success(`Exported ${campaignsToExport.length} campaigns`);
  }, [filteredCampaigns, selectedCampaigns]);

  // Loading states
  if (authLoading || isLoadingCampaigns) {
    return (
      <PageContainer size="wide">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="wide" className="pb-20">
      <PageHeader
        icon={BookOpen}
        title="Campaign Log"
        description={`${filteredCampaigns.length} campaigns`}
        actions={
          <div className="flex items-center gap-sm">
            <Button onClick={handleExportCSV} variant="outline" size="sm">
              <Download className="size-4" />
              Export
            </Button>
            <Button onClick={() => setBulkImportDialogOpen(true)} variant="outline" size="sm">
              <Upload className="size-4" />
              Import
            </Button>
            <Button onClick={() => setCreateCampaignDialogOpen(true)} size="sm">
              <Plus className="size-4" />
              Add Campaign
            </Button>
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="flex items-center gap-sm mb-md">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input 
            placeholder="Search campaigns..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="pl-xl bg-card" 
          />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[180px] bg-card">
            <SelectValue placeholder="All Entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {entities.map((e) => (
              <SelectItem key={e.name} value={e.name}>{e.emoji} {e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {entityFilter !== "all" && (
          <>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setEntityCommentsOpen(true)}
            >
              <MessageSquare className="size-4" />
              Entity Feedback
              {entityCommentCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {entityCommentCount}
                </Badge>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleOpenShareDialog(entityFilter)}
            >
              <Share2 className="size-4" />
              Share {entityFilter}
            </Button>
          </>
        )}
        
        {selectedCampaigns.length > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {selectedCampaigns.length} selected
          </Badge>
        )}
      </div>

      {/* Campaign Table */}
      <CampaignTable
        selectedCampaigns={selectedCampaigns}
        onSelectionChange={setSelectedCampaigns}
        entityFilter={entityFilter}
        searchTerm={searchTerm}
      />

      {/* Bulk Actions Bar */}
      <CampaignBulkBar
        selectedCampaigns={selectedCampaigns}
        onClearSelection={() => setSelectedCampaigns([])}
        entities={entities}
        campaigns={filteredCampaigns}
      />

      {/* Dialogs */}
      <CreateUtmCampaignDialog 
        open={createCampaignDialogOpen} 
        onOpenChange={setCreateCampaignDialogOpen} 
      />
      <CampaignBulkImportDialog 
        open={bulkImportDialogOpen} 
        onOpenChange={setBulkImportDialogOpen} 
      />
      <CampaignShareDialogUnified
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        entity={shareEntity}
      />
      <EntityCommentsDialog
        open={entityCommentsOpen}
        onOpenChange={setEntityCommentsOpen}
        entityName={entityFilter}
      />
    </PageContainer>
  );
}
