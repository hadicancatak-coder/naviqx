import { useState, useCallback } from "react";
import SearchAdEditor from "@/components/search/SearchAdEditor";
import { PageHeader } from "@/components/layout/PageHeader";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { SearchPlannerStructurePanel, SearchPlannerPreviewPanel, SearchPlannerQualityPanel } from "@/components/search-planner";
import { Search, FileText } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EditorContext {
  ad: any;
  adGroup: any;
  campaign: any;
  entity: string;
}

interface LiveFields {
  headlines: string[];
  descriptions: string[];
  sitelinks: { description: string; link: string }[];
  callouts: string[];
  landingPage: string;
  businessName: string;
}

interface SearchPlannerProps {
  adType?: "search" | "display";
}

export default function SearchPlanner({ adType = "search" }: SearchPlannerProps) {
  const [editorContext, setEditorContext] = useState<EditorContext | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<"preview" | "quality">("preview");
  const [liveFields, setLiveFields] = useState<LiveFields>({
    headlines: [],
    descriptions: [],
    sitelinks: [],
    callouts: [],
    landingPage: "",
    businessName: "",
  });

  const handleEditAd = (ad: any, adGroup: any, campaign: any, entity: string) => {
    setEditorContext({ ad, adGroup, campaign, entity });
    // Initialize live fields from ad data
    setLiveFields({
      headlines: Array.isArray(ad?.headlines) ? ad.headlines : [],
      descriptions: Array.isArray(ad?.descriptions) ? ad.descriptions : [],
      sitelinks: Array.isArray(ad?.sitelinks) ? ad.sitelinks : [],
      callouts: Array.isArray(ad?.callouts) ? ad.callouts : [],
      landingPage: ad?.landing_page || "",
      businessName: ad?.business_name || "",
    });
  };

  const handleCreateAd = (adGroup: any, campaign: any, entity: string) => {
    const newAd = {
      name: `New ${adType === 'search' ? 'Search' : 'Display'} Ad`,
      ad_group_id: adGroup.id,
      ad_group_name: adGroup.name,
      campaign_name: campaign.name,
      entity: entity,
      ad_type: adType,
      headlines: [],
      descriptions: [],
      sitelinks: [],
      callouts: [],
      landing_page: '',
      business_name: '',
      language: 'EN',
      approval_status: 'draft'
    };
    setEditorContext({ ad: newAd, adGroup, campaign, entity });
    setLiveFields({
      headlines: [],
      descriptions: [],
      sitelinks: [],
      callouts: [],
      landingPage: "",
      businessName: "",
    });
  };

  const handleCampaignClick = (campaign: any, entity: string) => {
    setEditorContext(null);
  };

  const handleSave = () => {
    setEditorContext(null);
  };

  const handleCancel = () => {
    setEditorContext(null);
  };

  // Handle live field updates from editor
  const handleFieldChange = useCallback((fields: Partial<LiveFields>) => {
    setLiveFields((prev) => ({ ...prev, ...fields }));
  }, []);

  // Use live fields for preview
  const headlines = liveFields.headlines.filter(Boolean);
  const descriptions = liveFields.descriptions.filter(Boolean);
  const sitelinks = liveFields.sitelinks.filter((s) => s.description || s.link);
  const callouts = liveFields.callouts.filter(Boolean);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="px-lg py-md border-b border-border/50 liquid-glass">
        <PageHeader
          icon={Search}
          title="Search Ads Planner"
          description="Create and manage search advertising campaigns"
        />
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* LEFT: Structure Panel */}
          <ResizablePanel defaultSize={22} minSize={18} maxSize={30} className="liquid-glass-elevated border-r border-border/30">
            <SearchPlannerStructurePanel
              onEditAd={handleEditAd}
              onCreateAd={handleCreateAd}
              onCampaignClick={handleCampaignClick}
              adType={adType}
            />
          </ResizablePanel>
          
          <ResizableHandle withHandle className="bg-border hover:bg-primary/20 transition-smooth" />
          
          {/* MIDDLE: Ad Editor (form only, no internal preview) */}
          <ResizablePanel defaultSize={48} minSize={35} className="overflow-hidden bg-white/5 backdrop-blur-xl">
            {editorContext ? (
              <SearchAdEditor
                ad={editorContext.ad}
                adGroup={editorContext.adGroup}
                campaign={editorContext.campaign}
                entity={editorContext.entity}
                adType={adType}
                onSave={handleSave}
                onCancel={handleCancel}
                showHeader={false}
                hidePreview={true}
                onFieldChange={handleFieldChange}
              />
            ) : (
              <div className="h-full flex items-center justify-center p-lg">
                <div className="text-center space-y-md">
                  <div className="w-20 h-20 rounded-xl bg-muted/50 backdrop-blur-sm flex items-center justify-center mx-auto">
                    <FileText className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <div className="space-y-xs">
                    <h3 className="text-heading-sm font-medium text-foreground">Select an Ad to Edit</h3>
                    <p className="text-body-sm text-muted-foreground max-w-sm">
                      Choose an ad from the structure panel on the left, or create a new one within an ad group
                    </p>
                  </div>
                </div>
              </div>
            )}
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-border hover:bg-primary/20 transition-smooth" />

          {/* RIGHT: Preview & Quality Panel */}
          <ResizablePanel defaultSize={30} minSize={25} maxSize={40} className="liquid-glass-elevated border-l border-border/30">
            {editorContext ? (
              <div className="h-full flex flex-col">
                {/* Tabs for Preview/Quality */}
                <div className="border-b border-border/50 bg-background/50 px-md pt-md">
                  <Tabs value={rightPanelTab} onValueChange={(v) => setRightPanelTab(v as "preview" | "quality")}>
                    <TabsList className="w-full grid grid-cols-2">
                      <TabsTrigger value="preview" className="text-body-sm">
                        Preview
                      </TabsTrigger>
                      <TabsTrigger value="quality" className="text-body-sm">
                        Quality & Compliance
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <ScrollArea className="flex-1">
                  {rightPanelTab === "preview" ? (
                    <SearchPlannerPreviewPanel
                      headlines={headlines}
                      descriptions={descriptions}
                      sitelinks={sitelinks}
                      callouts={callouts}
                      landingPage={liveFields.landingPage}
                      businessName={liveFields.businessName}
                    />
                  ) : (
                    <SearchPlannerQualityPanel
                      headlines={headlines}
                      descriptions={descriptions}
                      sitelinks={sitelinks}
                      callouts={callouts}
                      entity={editorContext.entity}
                    />
                  )}
                </ScrollArea>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-lg">
                <div className="text-center space-y-md">
                  <div className="w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center mx-auto">
                    <Search className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <div className="space-y-xs">
                    <h3 className="text-body font-medium text-muted-foreground">No Ad Selected</h3>
                    <p className="text-body-sm text-muted-foreground/70">
                      Preview and quality scores will appear here
                    </p>
                  </div>
                </div>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
