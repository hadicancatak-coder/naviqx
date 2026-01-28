import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Sparkles } from "lucide-react";
import { normalizeUrl } from "@/lib/urlHelpers";
import { AlertBanner } from "@/components/layout/AlertBanner";
import { EnhancedMultiSelect } from "./EnhancedMultiSelect";
import { GeneratedLinksPreview } from "./GeneratedLinksPreview";
import { AddCampaignDialog } from "./AddCampaignDialog";
import { useUtmCampaigns } from "@/hooks/useUtmCampaigns";
import { useUtmPlatforms, useCreatePlatform } from "@/hooks/useUtmPlatforms";
import { useSystemEntities, useCreateEntity } from "@/hooks/useSystemEntities";
import { useSystemCities } from "@/hooks/useSystemCities";
import { useCreateUtmLink } from "@/hooks/useUtmLinks";
import { useUtmLpTypes } from "@/hooks/useUtmLpTypes";
import { toast } from "sonner";
import { detectLPMetadata } from "@/lib/lpDetector";
import { LPDetectionCard } from "./LPDetectionCard";
import { buildUtmUrl, generateUtmCampaignByPurpose, generateUtmContent } from "@/lib/utmHelpers";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function UtmBuilder() {
  const [lpUrl, setLpUrl] = useState("");
  const [detection, setDetection] = useState<ReturnType<typeof detectLPMetadata> | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [webinarName, setWebinarName] = useState("");
  const [city, setCity] = useState("");
  const [deviceType, setDeviceType] = useState<"desktop" | "mobile">("desktop");
  const [withExtensions, setWithExtensions] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState<any[]>([]);
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [selectedLpType, setSelectedLpType] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  const { data: campaigns = [] } = useUtmCampaigns();
  const { data: platforms = [] } = useUtmPlatforms();
  const { data: entities = [] } = useSystemEntities();
  const { data: cities = [] } = useSystemCities();
  const { data: lpTypes = [] } = useUtmLpTypes();
  const createUtmLink = useCreateUtmLink();
  const createPlatform = useCreatePlatform();
  const createEntity = useCreateEntity();

  const platformOptions = platforms.map(p => ({ value: p.name, label: p.name }));
  const entityOptions = entities.map(e => ({ value: e.name, label: e.emoji ? `${e.emoji} ${e.name}` : e.name }));

  const mapPurposeToLpType = (purpose: string): string | null => {
    const mapping: Record<string, string> = { 'AO': 'Always On', 'Webinar': 'Webinars', 'Seminar': 'Seminar', 'Homepage': 'Homepage' };
    const lpTypeName = mapping[purpose];
    const lpType = lpTypes.find(t => t.name === lpTypeName);
    return lpType?.id || null;
  };

  const cleanInputUrl = (url: string): string => {
    if (!url.trim()) return url;
    
    try {
      const urlObj = new URL(normalizeUrl(url));
      
      // Remove all UTM parameters
      urlObj.searchParams.delete('utm_source');
      urlObj.searchParams.delete('utm_medium');
      urlObj.searchParams.delete('utm_campaign');
      urlObj.searchParams.delete('utm_content');
      urlObj.searchParams.delete('utm_term');
      
      return urlObj.toString();
    } catch (e) {
      // If parsing fails, strip query string at minimum
      return url.split('?')[0];
    }
  };

  const handleLpChange = (value: string) => {
    const cleanedUrl = cleanInputUrl(value);
    setLpUrl(cleanedUrl);
    if (cleanedUrl.trim()) {
      const detected = detectLPMetadata(cleanedUrl);
      setDetection(detected);
      if (detected.purpose) {
        const mappedLpType = mapPurposeToLpType(detected.purpose);
        setSelectedLpType(mappedLpType);
      }
      if (detected.purpose === 'Webinar' && detected.extractedWebinarName) setWebinarName(detected.extractedWebinarName);
      if (detected.purpose === 'Seminar' && detected.extractedCity) setCity(detected.extractedCity);
    } else {
      setDetection(null);
      setSelectedLpType(null);
    }
  };

  const handleGenerate = () => {
    if (!lpUrl.trim()) { toast.error("Please enter a landing page URL"); return; }
    if (!detection) { toast.error("LP metadata could not be detected"); return; }
    if (selectedPlatforms.length === 0) { toast.error("Please select at least one platform"); return; }
    if (detection.purpose === 'AO' && selectedEntities.length === 0) { toast.error("Please select at least one entity for AO campaigns"); return; }
    if (detection.purpose === 'AO' && !selectedCampaign) { toast.error("Please select a campaign for AO links"); return; }
    if (detection.purpose === 'Webinar' && !webinarName.trim()) { toast.error("Please enter a webinar name"); return; }
    if (detection.purpose === 'Seminar' && !city.trim()) { toast.error("Please select a city for the seminar"); return; }

    const links: any[] = [];
    const purpose = detection.purpose!;

    selectedPlatforms.forEach((platformName) => {
      const platform = platforms.find(p => p.name === platformName);
      if (!platform) { toast.error(`Platform "${platformName}" not found`); return; }
      if (!platform.utm_medium) { toast.error(`Platform "${platformName}" has no UTM medium assigned. Please configure it in Settings.`); return; }
      
      const utmMedium = platform.utm_medium;
      
      if (purpose === 'AO') {
        selectedEntities.forEach((entityName) => {
          const entity = entities.find(e => e.name === entityName);
          const campaignName = selectedCampaign || entityName;
          const utmCampaign = generateUtmCampaignByPurpose('AO', platformName, campaignName);
          const utmContent = generateUtmContent(lpUrl, campaignName);
          const websiteParam = entity?.website_param || entity?.code || entityName.toLowerCase();
          
          const url = buildUtmUrl({
            baseUrl: lpUrl, utmSource: platformName.toLowerCase().replace(/\s+/g, ''), utmMedium, utmCampaign, utmContent,
            utmTerm: deviceType === 'mobile' ? 'mobile' : undefined,
            customParams: withExtensions ? { extensions: 'true', entity: websiteParam } : { entity: websiteParam },
          });
          
          links.push({ id: `${platformName}-${entityName}-${Date.now()}`, full_url: url, base_url: lpUrl, utm_source: platformName.toLowerCase().replace(/\s+/g, ''),
            utm_medium: utmMedium, utm_campaign: utmCampaign, utm_term: entityName, utm_content: utmContent, lp_type_id: selectedLpType,
            platform: platformName, purpose: 'AO', entity: [entityName], name: `${platformName} - ${entityName}`, deviceType, websiteParam });
        });
      } else if (purpose === 'Webinar') {
        const utmCampaign = selectedCampaign 
          ? `${selectedCampaign.toLowerCase()}_webinar_${webinarName.toLowerCase()}`
          : generateUtmCampaignByPurpose('Webinar', platformName, undefined, webinarName);
        const utmContent = generateUtmContent(lpUrl, webinarName);
        const url = buildUtmUrl({ baseUrl: lpUrl, utmSource: platformName.toLowerCase().replace(/\s+/g, ''), utmMedium, utmCampaign, utmContent, utmTerm: deviceType === 'mobile' ? 'mobile' : undefined });
        links.push({ id: crypto.randomUUID(), name: `${platformName} - ${webinarName}`, full_url: url, base_url: lpUrl, utm_source: platformName.toLowerCase().replace(/\s+/g, ''),
          utm_medium: utmMedium, utm_campaign: utmCampaign, utm_content: utmContent, lp_type_id: selectedLpType, platform: platformName,
          entity: [detection.country || 'Global'], deviceType, purpose: 'Webinar' });
      } else if (purpose === 'Seminar') {
        const utmCampaign = selectedCampaign
          ? `${selectedCampaign.toLowerCase()}_seminar_${city.toLowerCase()}`
          : generateUtmCampaignByPurpose('Seminar', platformName, undefined, undefined, city);
        const utmContent = generateUtmContent(lpUrl, city);
        const url = buildUtmUrl({ baseUrl: lpUrl, utmSource: platformName.toLowerCase().replace(/\s+/g, ''), utmMedium, utmCampaign, utmContent, utmTerm: deviceType === 'mobile' ? 'mobile' : undefined });
        links.push({ id: crypto.randomUUID(), name: `${platformName} - ${city} Seminar`, full_url: url, base_url: lpUrl, utm_source: platformName.toLowerCase().replace(/\s+/g, ''),
          utm_medium: utmMedium, utm_campaign: utmCampaign, utm_content: utmContent, lp_type_id: selectedLpType, platform: platformName,
          entity: [detection.country || city], deviceType, purpose: 'Seminar' });
      }
    });

    setGeneratedLinks(links);
    toast.success(`Generated ${links.length} link${links.length > 1 ? 's' : ''}`);
  };

  return (
    <>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" />UTM Builder</CardTitle>
          <CardDescription>Generate UTM tracking links with AI-powered detection</CardDescription></CardHeader>
        <CardContent className="space-y-md">
          <AlertBanner variant="info">You are responsible for ensuring the accuracy of the generated links. AI detection may not be 100% accurate.</AlertBanner>
          <div className="space-y-sm"><Label htmlFor="lp-url">Landing Page URL *</Label>
            <Input id="lp-url" type="url" placeholder="https://cfi.trade/ar/seminar/amman" value={lpUrl} onChange={(e) => handleLpChange(e.target.value)} /></div>
          {detection && <LPDetectionCard detection={detection} />}
          {detection && detection.purpose && (<>
            <div className="space-y-sm"><Label>Platforms *</Label>
              <EnhancedMultiSelect options={platformOptions} selected={selectedPlatforms} onChange={setSelectedPlatforms} placeholder="Select platforms..." allowCustom={true}
                customPlaceholder="Add new platform" onAddCustom={async (name) => { await createPlatform.mutateAsync({ name, utm_medium: 'referral', is_active: true }); }} /></div>
            
            <div className="space-y-sm">
              <div className="flex items-center justify-between">
                <Label>Campaign {detection.purpose === 'AO' ? '*' : '(Optional)'}</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowAddCampaign(true)}
                >
                  <Plus className="h-4 w-4 mr-xs" />
                  Add Campaign
                </Button>
              </div>
              <Select value={selectedCampaign || ''} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.name}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {detection.purpose === 'AO' && (<div className="space-y-sm"><Label>Entities (Countries) *</Label>
              <EnhancedMultiSelect options={entityOptions} selected={selectedEntities} onChange={setSelectedEntities} placeholder="Select entities..." allowCustom={true}
                customPlaceholder="Add new entity" onAddCustom={async (name) => { const code = name.toLowerCase().replace(/\s+/g, '_'); await createEntity.mutateAsync({ name, code, is_active: true, display_order: entities.length, emoji: null }); }} /></div>)}
            {detection.purpose === 'Webinar' && (<div className="space-y-sm"><Label htmlFor="webinar-name">Webinar Name *</Label>
              <Input id="webinar-name" value={webinarName} onChange={(e) => setWebinarName(e.target.value)} placeholder="e.g., Introduction to Trading" /></div>)}
            {detection.purpose === 'Seminar' && (<div className="space-y-sm"><Label htmlFor="city">City *</Label>
              <Select value={city} onValueChange={setCity}><SelectTrigger id="city"><SelectValue placeholder="Select a city" /></SelectTrigger>
                <SelectContent>{cities.map((c) => (<SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>))}</SelectContent></Select></div>)}
            <div className="space-y-sm"><Label>Device Type</Label>
              <ToggleGroup type="single" value={deviceType} onValueChange={(value: "desktop" | "mobile") => value && setDeviceType(value)}>
                <ToggleGroupItem value="desktop">Desktop</ToggleGroupItem><ToggleGroupItem value="mobile">Mobile</ToggleGroupItem></ToggleGroup></div>
            {detection.purpose === 'AO' && (<div className="flex items-center space-x-sm">
              <Checkbox id="extensions" checked={withExtensions} onCheckedChange={(checked) => setWithExtensions(checked === true)} />
              <Label htmlFor="extensions" className="text-body-sm cursor-pointer">Include extensions parameter (for AO campaigns)</Label></div>)}
            <div className="space-y-sm"><Label htmlFor="lp-type">Landing Page Type</Label>
              <Select value={selectedLpType || ''} onValueChange={setSelectedLpType}><SelectTrigger id="lp-type"><SelectValue placeholder="Auto-detected from URL" /></SelectTrigger>
                <SelectContent>{lpTypes.map(type => (<SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>))}</SelectContent></Select>
              {detection?.purpose && (<p className="text-metadata text-muted-foreground">{mapPurposeToLpType(detection.purpose) ? '✓ Auto-detected' : '⚠️ Please select manually'}</p>)}</div>
            <Button onClick={handleGenerate} className="w-full">Generate UTM Links</Button>
            {detection.purpose === 'AO' && (<Button variant="outline" className="w-full" onClick={() => setShowAddCampaign(true)}><Plus className="h-4 w-4 mr-sm" />Add New Campaign</Button>)}
          </>)}</CardContent></Card>
      <GeneratedLinksPreview links={generatedLinks} onCopy={(url) => { navigator.clipboard.writeText(url); toast.success("Link copied to clipboard"); }}
        onSave={(link) => createUtmLink.mutate(link)} onClear={() => setGeneratedLinks([])} />
      <AddCampaignDialog open={showAddCampaign} onOpenChange={setShowAddCampaign} />
    </>
  );
}
