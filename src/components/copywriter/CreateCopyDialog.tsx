import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { CopywriterCopy, useCreateCopywriterCopy, useUpdateCopywriterCopy } from "@/hooks/useCopywriterCopies";
import { ENTITIES } from "@/lib/constants";
import { syncCopyToPlanners } from "@/lib/copywriterSync";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/editor/RichTextEditor";

interface CreateCopyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCopy?: CopywriterCopy | null;
}

const PLATFORMS = ["ppc", "facebook", "instagram", "tiktok", "snap", "reddit", "whatsapp"];
const ELEMENT_TYPES = ["headline", "description", "primary_text", "callout", "sitelink"];

const CHARACTER_LIMITS = {
  headline: { ppc: 30, social: 60 },
  description: { ppc: 90, social: 125 },
  primary_text: { ppc: 125, social: 125 },
  callout: { ppc: 25, social: 25 },
  sitelink: { ppc: 25, social: 25 },
};

export function CreateCopyDialog({ open, onOpenChange, editingCopy }: CreateCopyDialogProps) {
  const { toast } = useToast();
  const createCopy = useCreateCopywriterCopy();
  const updateCopy = useUpdateCopywriterCopy();

  const [elementType, setElementType] = useState(editingCopy?.element_type || "headline");
  const [platforms, setPlatforms] = useState<string[]>(editingCopy?.platform || []);
  const [entities, setEntities] = useState<string[]>(editingCopy?.entity || []);
  const [campaigns, setCampaigns] = useState<string[]>(editingCopy?.campaigns || []);
  const [campaignInput, setCampaignInput] = useState("");
  const [contentEn, setContentEn] = useState(editingCopy?.content_en || "");
  const [contentAr, setContentAr] = useState(editingCopy?.content_ar || "");
  const [contentAz, setContentAz] = useState(editingCopy?.content_az || "");
  const [contentEs, setContentEs] = useState(editingCopy?.content_es || "");
  const [region, setRegion] = useState(editingCopy?.region || "");

  const togglePlatform = (platform: string) => {
    setPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const toggleEntity = (entity: string) => {
    setEntities((prev) =>
      prev.includes(entity) ? prev.filter((e) => e !== entity) : [...prev, entity]
    );
  };

  const addCampaign = () => {
    if (campaignInput.trim() && !campaigns.includes(campaignInput.trim())) {
      setCampaigns([...campaigns, campaignInput.trim()]);
      setCampaignInput("");
    }
  };

  const removeCampaign = (campaign: string) => {
    setCampaigns(campaigns.filter((c) => c !== campaign));
  };

  const getCharLimit = (type: string) => {
    const limits = CHARACTER_LIMITS[type as keyof typeof CHARACTER_LIMITS];
    if (!limits) return 125;
    const hasSocial = platforms.some((p) => p !== "ppc");
    return hasSocial ? limits.social : limits.ppc;
  };

  const handleSave = async (syncToPlanner: boolean = false) => {
    if (platforms.length === 0 || entities.length === 0) {
      toast({
        title: "Missing required fields",
        description: "Please select at least one platform and entity",
        variant: "destructive",
      });
      return;
    }

    const copyData = {
      element_type: elementType,
      platform: platforms,
      entity: entities,
      campaigns,
      tags: [...entities, elementType],
      content_en: contentEn || null,
      content_ar: contentAr || null,
      content_az: contentAz || null,
      content_es: contentEs || null,
      region: region || null,
      char_limit_en: null,
      char_limit_ar: null,
      char_limit_az: null,
      char_limit_es: null,
      status: "draft",
    };

    try {
      if (editingCopy) {
        await updateCopy.mutateAsync({ id: editingCopy.id, updates: copyData });
        if (syncToPlanner) {
          await syncCopyToPlanners({ copy: { ...editingCopy, ...copyData } });
          toast({ title: "Synced to planners successfully" });
        }
      } else {
        await createCopy.mutateAsync(copyData);
        if (syncToPlanner) {
          // Sync after creation would need the ID, handle in onSuccess
          toast({ title: "Copy created. Sync it from the list." });
        }
      }
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const charLimit = getCharLimit(elementType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingCopy ? "Edit Copy" : "Create New Copy"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-md">
          <div>
            <Label>Element Type</Label>
            <Select value={elementType} onValueChange={setElementType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ELEMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Platforms</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {PLATFORMS.map((platform) => (
                <Badge
                  key={platform}
                  variant={platforms.includes(platform) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => togglePlatform(platform)}
                >
                  {platform}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Entities</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {ENTITIES.map((entity) => (
                <Badge
                  key={entity}
                  variant={entities.includes(entity) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleEntity(entity)}
                >
                  {entity}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Region</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger>
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MENA">MENA</SelectItem>
                <SelectItem value="LATAM">LATAM</SelectItem>
                <SelectItem value="Global">Global</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Campaigns</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={campaignInput}
                onChange={(e) => setCampaignInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCampaign())}
                placeholder="Add campaign name..."
              />
              <Button type="button" onClick={addCampaign}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {campaigns.map((campaign) => (
                <Badge key={campaign} variant="secondary">
                  {campaign}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => removeCampaign(campaign)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <Tabs defaultValue="en" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="ar">Arabic</TabsTrigger>
              <TabsTrigger value="az">Azerbaijani</TabsTrigger>
              <TabsTrigger value="es">Spanish</TabsTrigger>
            </TabsList>
            <TabsContent value="en" className="space-y-2">
              <RichTextEditor
                value={contentEn}
                onChange={setContentEn}
                placeholder="Enter English content..."
                minHeight="100px"
              />
              <div className="text-xs text-right text-muted-foreground">
                {contentEn.length}/{charLimit}
              </div>
            </TabsContent>
            <TabsContent value="ar" className="space-y-2">
              <RichTextEditor
                value={contentAr}
                onChange={setContentAr}
                placeholder="أدخل المحتوى العربي..."
                minHeight="100px"
              />
              <div className="text-xs text-left text-muted-foreground">
                {contentAr.length}/{charLimit}
              </div>
            </TabsContent>
            <TabsContent value="az" className="space-y-2">
              <RichTextEditor
                value={contentAz}
                onChange={setContentAz}
                placeholder="Azərbaycan məzmunu daxil edin..."
                minHeight="100px"
              />
              <div className="text-xs text-right text-muted-foreground">
                {contentAz.length}/{charLimit}
              </div>
            </TabsContent>
            <TabsContent value="es" className="space-y-2">
              <RichTextEditor
                value={contentEs}
                onChange={setContentEs}
                placeholder="Ingrese contenido en español..."
                minHeight="100px"
              />
              <div className="text-xs text-right text-muted-foreground">
                {contentEs.length}/{charLimit}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => handleSave(false)}>Save</Button>
          <Button onClick={() => handleSave(true)}>Save & Sync to Planner</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
