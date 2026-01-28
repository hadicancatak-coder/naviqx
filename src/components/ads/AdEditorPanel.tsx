import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, X, AlertCircle, Sparkles } from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchAdPreview } from "./SearchAdPreview";
import { ElementQuickInsert } from "./ElementQuickInsert";
import { AdVariationGeneratorDialog } from "./AdVariationGeneratorDialog";
import { QualityMetricsPanel } from "./QualityMetricsPanel";
import { AdVersionHistory } from "./AdVersionHistory";
import { AdBreadcrumbs } from "./AdBreadcrumbs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import type { AdVariation } from "@/lib/adVariationGenerator";

interface AdEditorPanelProps {
  ad: any | null;
  onSave: (adData: any) => void;
  onCancel: () => void;
  isCreating: boolean;
}

export default function AdEditorPanel({ ad, onSave, onCancel, isCreating }: AdEditorPanelProps) {
  const [adType, setAdType] = useState<"search" | "display">(ad?.ad_type || "search");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showVariationGenerator, setShowVariationGenerator] = useState(false);

  // Form state
  const [adName, setAdName] = useState("");
  const [campaign, setCampaign] = useState("");
  const [adGroup, setAdGroup] = useState("");
  const [entity, setEntity] = useState("");
  const [headlines, setHeadlines] = useState<string[]>(["", "", ""]);
  const [descriptions, setDescriptions] = useState<string[]>(["", ""]);
  const [finalUrl, setFinalUrl] = useState("");
  const [path1, setPath1] = useState("");
  const [path2, setPath2] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [sitelinks, setSitelinks] = useState<Array<{ text: string; url: string; desc1?: string; desc2?: string }>>([]);
  const [callouts, setCallouts] = useState<string[]>([]);

  // Display ad state
  const [longHeadline, setLongHeadline] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState("");
  const [ctaText, setCtaText] = useState("Learn More");
  const [language, setLanguage] = useState("EN");
  const [adStrength, setAdStrength] = useState(5);

  // Fetch campaigns and entities
  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data } = await supabase.from("utm_campaigns").select("*");
      return data || [];
    },
  });

  const { data: entities = [] } = useQuery({
    queryKey: ["entities"],
    queryFn: async () => {
      const { data } = await supabase.from("entity_presets").select("*");
      return data || [];
    },
  });

  // Load ad data when editing
  useEffect(() => {
    if (ad) {
      setAdType(ad.ad_type || "search");
      setAdName(ad.name || "");
      setCampaign(ad.campaign || "");
      setAdGroup(ad.ad_group || "");
      setEntity(ad.entity || "");
      setHeadlines(ad.headlines || ["", "", ""]);
      setDescriptions(ad.descriptions || ["", ""]);
      setFinalUrl(ad.final_url || "");
      setPath1(ad.path1 || "");
      setPath2(ad.path2 || "");
      setBusinessName(ad.business_name || "");
      setSitelinks(ad.sitelinks || []);
      setCallouts(ad.callouts || []);
      setLongHeadline(ad.long_headline || "");
      setImages(ad.images || []);
      setLogoUrl(ad.logo_url || "");
      setHasChanges(false);
    } else if (isCreating) {
      // Reset form for new ad
      setAdName("");
      setCampaign("");
      setAdGroup("");
      setEntity("");
      
      // Initialize with 5 headlines/descriptions for display ads, 3/2 for search ads
      if (adType === "display") {
        setHeadlines(["", "", "", "", ""]);
        setDescriptions(["", "", "", "", ""]);
      } else {
        setHeadlines(["", "", ""]);
        setDescriptions(["", ""]);
      }
      
      setFinalUrl("");
      setPath1("");
      setPath2("");
      setBusinessName("");
      setSitelinks([]);
      setCallouts([]);
      setLongHeadline("");
      setImages([]);
      setLogoUrl("");
      setCtaText("Learn More");
      setLanguage("EN");
      setHasChanges(false);
    }
  }, [ad, isCreating]);

  const handleFieldChange = (setter: Function) => (value: any) => {
    setter(value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!adName.trim()) {
      toast.error("Please enter an ad name");
      return;
    }

    setIsSaving(true);
    try {
      const adData = {
        name: adName,
        ad_type: adType,
        campaign,
        ad_group: adGroup,
        entity,
        headlines,
        descriptions,
        final_url: finalUrl,
        path1,
        path2,
        business_name: businessName,
        sitelinks,
        callouts,
        long_headline: longHeadline,
        images,
        logo_url: logoUrl,
        approval_status: ad?.approval_status || "draft",
      };

      await onSave(adData);
      setHasChanges(false);
      toast.success(isCreating ? "Ad created successfully" : "Ad updated successfully");
    } catch (error) {
      logger.error("Error saving ad:", error);
      toast.error("Failed to save ad");
    } finally {
      setIsSaving(false);
    }
  };

  const updateHeadline = (index: number, value: string) => {
    const newHeadlines = [...headlines];
    newHeadlines[index] = value;
    handleFieldChange(setHeadlines)(newHeadlines);
  };

  const updateDescription = (index: number, value: string) => {
    const newDescriptions = [...descriptions];
    newDescriptions[index] = value;
    handleFieldChange(setDescriptions)(newDescriptions);
  };

  const addHeadline = () => {
    if (headlines.length < 15) {
      handleFieldChange(setHeadlines)([...headlines, ""]);
    }
  };

  const addDescription = () => {
    if (descriptions.length < 4) {
      handleFieldChange(setDescriptions)([...descriptions, ""]);
    }
  };

  const removeHeadline = (index: number) => {
    if (headlines.length > 3) {
      handleFieldChange(setHeadlines)(headlines.filter((_, i) => i !== index));
    }
  };

  const removeDescription = (index: number) => {
    if (descriptions.length > 2) {
      handleFieldChange(setDescriptions)(descriptions.filter((_, i) => i !== index));
    }
  };

  const handleApplyVariation = (variation: AdVariation) => {
    handleFieldChange(setHeadlines)(variation.headlines);
    handleFieldChange(setDescriptions)(variation.descriptions);
    
    // Convert sitelinks to proper format
    const formattedSitelinks = variation.sitelinks.map(text => ({
      text,
      url: '',
      desc1: '',
      desc2: '',
    }));
    handleFieldChange(setSitelinks)(formattedSitelinks);
    handleFieldChange(setCallouts)(variation.callouts);
    
    toast.success(`Applied variation with ${variation.score}/100 quality score`);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumbs */}
      <AdBreadcrumbs 
        entity={entity}
        campaign={campaign}
        adGroup={adGroup}
        adName={adName}
      />
      
      {/* Header */}
      <div className="border-b p-md flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <h2 className="text-heading-md font-semibold">
            {isCreating ? "Create New Ad" : `Edit: ${adName || "Untitled Ad"}`}
          </h2>
          {hasChanges && (
            <Badge variant="outline" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Unsaved changes
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-sm">
          <Button
            variant="outline"
            onClick={() => setShowVariationGenerator(true)}
            disabled={isSaving}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Variations
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel - Form */}
        <ResizablePanel defaultSize={55} minSize={40}>
          <ScrollArea className="h-full">
            <div className="p-lg space-y-lg">
              {/* Basic Info */}
              <Card className="mt-md">
                <CardContent className="pt-lg space-y-md">
                  <div>
                    <Label htmlFor="adName">Ad Name *</Label>
                    <Input
                      id="adName"
                      value={adName}
                      onChange={(e) => handleFieldChange(setAdName)(e.target.value)}
                      placeholder="e.g., CFI Trading Platform - UK"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-md">
                    <div>
                      <Label htmlFor="campaign">Campaign</Label>
                      <Select value={campaign} onValueChange={handleFieldChange(setCampaign)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select campaign" />
                        </SelectTrigger>
                        <SelectContent>
                          {campaigns.map((c: any) => (
                            <SelectItem key={c.id} value={c.name}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="adGroup">Ad Group</Label>
                      <Input
                        id="adGroup"
                        value={adGroup}
                        onChange={(e) => handleFieldChange(setAdGroup)(e.target.value)}
                        placeholder="e.g., Trading Platforms"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="entity">Entity</Label>
                    <Select value={entity} onValueChange={handleFieldChange(setEntity)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select entity" />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="max-h-[200px]">
                          {entities.flatMap((preset: any) => 
                            preset.entities.map((entityName: string) => (
                              <SelectItem key={`${preset.id}-${entityName}`} value={entityName}>
                                {entityName}
                              </SelectItem>
                            ))
                          )}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Headlines */}
              <Card>
                <CardContent className="pt-lg space-y-sm">
                  <div className="flex items-center justify-between">
                    <Label>Headlines (3-15)</Label>
                    <Button size="sm" variant="outline" onClick={addHeadline} disabled={headlines.length >= 15}>
                      Add Headline
                    </Button>
                  </div>
                  {headlines.map((headline, index) => (
                    <div key={index} className="flex gap-sm items-start">
                      <div className="flex-1">
                        <Input
                          value={headline}
                          onChange={(e) => updateHeadline(index, e.target.value)}
                          placeholder={`Headline ${index + 1}`}
                          maxLength={30}
                        />
                        <p className="text-metadata text-muted-foreground mt-1">
                          {headline.length}/30 characters
                        </p>
                      </div>
                      <ElementQuickInsert
                        elementType="headline"
                        onInsert={(content) => updateHeadline(index, content)}
                      />
                      {headlines.length > 3 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeHeadline(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Descriptions */}
              <Card>
                <CardContent className="pt-lg space-y-sm">
                  <div className="flex items-center justify-between">
                    <Label>Descriptions (2-4)</Label>
                    <Button size="sm" variant="outline" onClick={addDescription} disabled={descriptions.length >= 4}>
                      Add Description
                    </Button>
                  </div>
                  {descriptions.map((description, index) => (
                    <div key={index} className="flex gap-sm items-start">
                      <div className="flex-1">
                        <Input
                          value={description}
                          onChange={(e) => updateDescription(index, e.target.value)}
                          placeholder={`Description ${index + 1}`}
                          maxLength={90}
                        />
                        <p className="text-metadata text-muted-foreground mt-1">
                          {description.length}/90 characters
                        </p>
                      </div>
                      <ElementQuickInsert
                        elementType="description"
                        onInsert={(content) => updateDescription(index, content)}
                      />
                      {descriptions.length > 2 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeDescription(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* URL Fields */}
              <Card>
                <CardContent className="pt-lg space-y-md">
                  <div>
                    <Label htmlFor="finalUrl">Final URL</Label>
                    <Input
                      id="finalUrl"
                      value={finalUrl}
                      onChange={(e) => handleFieldChange(setFinalUrl)(e.target.value)}
                      placeholder="https://example.com/landing-page"
                    />
                  </div>
                  <div>
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      value={businessName}
                      onChange={(e) => handleFieldChange(setBusinessName)(e.target.value)}
                      placeholder="Your Business"
                      maxLength={25}
                    />
                  </div>
                </CardContent>
              </Card>

            </div>
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Preview + Quality Metrics */}
        <ResizablePanel defaultSize={45} minSize={30}>
          <ScrollArea className="h-full">
            <div className="p-lg space-y-md">
              {/* Live Preview */}
              <Card className="p-md">
                <h3 className="text-body-sm font-semibold mb-sm">Live Preview</h3>
                <div className="scale-95 origin-top">
                  <SearchAdPreview
                    headlines={headlines.filter(h => h.trim())}
                    descriptions={descriptions.filter(d => d.trim())}
                    landingPage={finalUrl}
                    businessName={businessName}
                    sitelinks={sitelinks.map(s => ({ text: s.text, url: s.url || '' }))}
                    callouts={callouts}
                  />
                </div>
              </Card>

              {/* Quality Metrics Panel */}
              <QualityMetricsPanel
                adStrength={adStrength}
                headlines={headlines.map(h => ({ text: h }))}
                descriptions={descriptions.map(d => ({ text: d }))}
                sitelinks={sitelinks}
                callouts={callouts}
                finalUrl={finalUrl}
                businessName={businessName}
              />

              {/* Version History */}
              {ad?.id && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Version History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AdVersionHistory adId={ad.id} />
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Variation Generator Dialog */}
      <AdVariationGeneratorDialog
        open={showVariationGenerator}
        onOpenChange={setShowVariationGenerator}
        entity={entity}
        onSelectVariation={handleApplyVariation}
      />
    </div>
  );
}
