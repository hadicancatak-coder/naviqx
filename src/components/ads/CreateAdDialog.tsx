import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { ElementQuickInsert } from './ElementQuickInsert';
import { useSaveSocialElement } from '@/hooks/useSocialAdElements';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { Copy, Save, Sparkles } from 'lucide-react';
import { SearchAdPreview } from './SearchAdPreview';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface CreateAdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const AD_ENTITIES = ['CFI', 'Fortrade', 'Libertex', 'Plus500', 'Trade360', 'Trading212', 'eToro', 'XTB'];

export function CreateAdDialog({ open, onOpenChange, onComplete }: CreateAdDialogProps) {
  const [entity, setEntity] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [adGroupName, setAdGroupName] = useState('');
  const [adName, setAdName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { copy } = useCopyToClipboard();
  const saveElementMutation = useSaveSocialElement();

  // Search ad fields
  const [headlines, setHeadlines] = useState<string[]>(Array(15).fill(''));
  const [descriptions, setDescriptions] = useState<string[]>(Array(4).fill(''));
  const [landingPage, setLandingPage] = useState('');
  const [sitelinks, setSitelinks] = useState<string[]>(Array(4).fill(''));
  const [callouts, setCallouts] = useState<string[]>(Array(10).fill(''));
  const [businessName, setBusinessName] = useState('');


  const resetForm = () => {
    setEntity('');
    setCampaignName('');
    setAdGroupName('');
    setAdName('');
    setHeadlines(Array(15).fill(''));
    setDescriptions(Array(4).fill(''));
    setLandingPage('');
    setSitelinks(Array(4).fill(''));
    setCallouts(Array(10).fill(''));
    setBusinessName('');
  };

  const handleSaveAsElement = async (elementType: 'headline' | 'description' | 'sitelink' | 'callout', content: string) => {
    if (!content.trim()) {
      toast({ title: 'Error', description: 'Cannot save empty text', variant: 'destructive' });
      return;
    }

    try {
      await saveElementMutation.mutateAsync({
        content,
        elementType,
        entity: entity ? [entity] : [],
        language: 'EN',
      });
      
      toast({ title: 'Success', description: `Saved as ${elementType}` });
    } catch (error) {
      console.error('Error saving element:', error);
    }
  };

  const handleCreate = async () => {
    if (!entity || !campaignName || !adGroupName || !adName) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in entity, campaign name, ad group name, and ad name.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const adData: any = {
        name: adName,
        ad_name: adName,
        entity,
        campaign_name: campaignName,
        ad_group_name: adGroupName,
        ad_type: 'search',
        landing_page: landingPage,
        business_name: businessName,
        headlines: headlines.filter(h => h.trim()),
        descriptions: descriptions.filter(d => d.trim()),
        sitelinks: sitelinks.filter(s => s.trim()),
        callouts: callouts.filter(c => c.trim()),
      };

      const { error } = await supabase.from('ads').insert(adData);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Search ad created successfully!',
      });

      resetForm();
      onComplete();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
        <DialogHeader className="p-lg pb-md">
          <DialogTitle>Create New Ad</DialogTitle>
          <DialogDescription>
            Create a new search or display ad with live preview
          </DialogDescription>
        </DialogHeader>

        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left Panel - Form Inputs */}
          <ResizablePanel defaultSize={50} minSize={40}>
            <ScrollArea className="h-[calc(95vh-180px)] px-lg">
              <Tabs value="search" className="w-full">
                <TabsList className="grid w-full grid-cols-1 mb-md">
                  <TabsTrigger value="search">Search Ad</TabsTrigger>
                </TabsList>

                <TabsContent value="search" className="space-y-md mt-0">
                  {/* Common Fields */}
                  <div className="grid grid-cols-2 gap-md">
                    <div>
                      <Label>Entity</Label>
                      <Select value={entity || undefined} onValueChange={setEntity}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select entity" />
                        </SelectTrigger>
                        <SelectContent>
                          {AD_ENTITIES.map((ent) => (
                            <SelectItem key={ent} value={ent}>{ent}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Ad Name</Label>
                      <Input value={adName} onChange={(e) => setAdName(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-md">
                    <div>
                      <Label>Campaign Name</Label>
                      <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
                    </div>
                    <div>
                      <Label>Ad Group Name</Label>
                      <Input value={adGroupName} onChange={(e) => setAdGroupName(e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <Label>Landing Page URL</Label>
                    <Input 
                      type="url" 
                      value={landingPage} 
                      onChange={(e) => setLandingPage(e.target.value)} 
                      placeholder="https://example.com"
                    />
                  </div>

                  {/* Headlines */}
                  <div>
                    <div className="flex items-center justify-between mb-sm">
                      <Label>Headlines</Label>
                      <Badge variant="outline" className="text-metadata">Max 30 chars each</Badge>
                    </div>
                    {headlines.slice(0, 5).map((headline, index) => (
                      <div key={index} className="flex gap-xs mt-sm">
                        <ElementQuickInsert 
                          elementType="headline"
                          onInsert={(content) => {
                            const newHeadlines = [...headlines];
                            newHeadlines[index] = content;
                            setHeadlines(newHeadlines);
                          }}
                        />
                        <div className="flex-1 relative">
                          <Input
                            value={headline}
                            onChange={(e) => {
                              const newHeadlines = [...headlines];
                              newHeadlines[index] = e.target.value;
                              setHeadlines(newHeadlines);
                            }}
                            placeholder={`Headline ${index + 1}`}
                            maxLength={30}
                            className={headline.length > 30 ? 'border-destructive' : headline.length > 25 ? 'border-amber-500' : ''}
                          />
                          <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-metadata ${headline.length > 30 ? 'text-destructive' : headline.length > 25 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                            {headline.length}/30
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copy(headline, 'Headline copied')}
                          disabled={!headline.trim()}
                          title="Copy"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSaveAsElement('headline', headline)}
                          disabled={!headline.trim()}
                          title="Save as element"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Descriptions */}
                  <div>
                    <div className="flex items-center justify-between mb-sm">
                      <Label>Descriptions</Label>
                      <Badge variant="outline" className="text-metadata">Max 90 chars each</Badge>
                    </div>
                    {descriptions.map((description, index) => (
                      <div key={index} className="flex gap-xs mt-sm">
                        <ElementQuickInsert 
                          elementType="description"
                          onInsert={(content) => {
                            const newDescriptions = [...descriptions];
                            newDescriptions[index] = content;
                            setDescriptions(newDescriptions);
                          }}
                        />
                        <div className="flex-1 relative">
                          <Input
                            value={description}
                            onChange={(e) => {
                              const newDescriptions = [...descriptions];
                              newDescriptions[index] = e.target.value;
                              setDescriptions(newDescriptions);
                            }}
                            placeholder={`Description ${index + 1}`}
                            maxLength={90}
                            className={description.length > 90 ? 'border-destructive' : description.length > 80 ? 'border-amber-500' : ''}
                          />
                          <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-metadata ${description.length > 90 ? 'text-destructive' : description.length > 80 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                            {description.length}/90
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copy(description, 'Description copied')}
                          disabled={!description.trim()}
                          title="Copy"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSaveAsElement('description', description)}
                          disabled={!description.trim()}
                          title="Save as element"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Sitelinks */}
                  <div>
                    <div className="flex items-center justify-between mb-sm">
                      <Label>Sitelinks (optional)</Label>
                      <Badge variant="outline" className="text-metadata">Max 25 chars each</Badge>
                    </div>
                    {sitelinks.map((sitelink, index) => (
                      <div key={index} className="flex gap-xs mt-sm">
                        <ElementQuickInsert 
                          elementType="sitelink"
                          onInsert={(content) => {
                            const newSitelinks = [...sitelinks];
                            newSitelinks[index] = content;
                            setSitelinks(newSitelinks);
                          }}
                        />
                        <div className="flex-1 relative">
                          <Input
                            value={sitelink}
                            onChange={(e) => {
                              const newSitelinks = [...sitelinks];
                              newSitelinks[index] = e.target.value;
                              setSitelinks(newSitelinks);
                            }}
                            placeholder={`Sitelink ${index + 1}`}
                            maxLength={25}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-metadata text-muted-foreground">
                            {sitelink.length}/25
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copy(sitelink, 'Sitelink copied')}
                          disabled={!sitelink.trim()}
                          title="Copy"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSaveAsElement('sitelink', sitelink)}
                          disabled={!sitelink.trim()}
                          title="Save as element"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Callouts */}
                  <div>
                    <div className="flex items-center justify-between mb-sm">
                      <Label>Callouts (optional)</Label>
                      <Badge variant="outline" className="text-metadata">Max 25 chars each</Badge>
                    </div>
                    {callouts.slice(0, 4).map((callout, index) => (
                      <div key={index} className="flex gap-xs mt-sm">
                        <ElementQuickInsert 
                          elementType="callout"
                          onInsert={(content) => {
                            const newCallouts = [...callouts];
                            newCallouts[index] = content;
                            setCallouts(newCallouts);
                          }}
                        />
                        <div className="flex-1 relative">
                          <Input
                            value={callout}
                            onChange={(e) => {
                              const newCallouts = [...callouts];
                              newCallouts[index] = e.target.value;
                              setCallouts(newCallouts);
                            }}
                            placeholder={`Callout ${index + 1}`}
                            maxLength={25}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-metadata text-muted-foreground">
                            {callout.length}/25
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copy(callout, 'Callout copied')}
                          disabled={!callout.trim()}
                          title="Copy"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSaveAsElement('callout', callout)}
                          disabled={!callout.trim()}
                          title="Save as element"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div>
                    <Label>Business Name</Label>
                    <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                  </div>
                </TabsContent>

              </Tabs>
            </ScrollArea>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Live Preview */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <ScrollArea className="h-[calc(95vh-180px)] px-6">
              <div className="space-y-md">
                <div className="flex items-center gap-xs sticky top-0 bg-background py-md border-b">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Live Preview</h3>
                </div>

                <SearchAdPreview
                  headlines={headlines}
                  descriptions={descriptions}
                  landingPage={landingPage}
                  businessName={businessName}
                  sitelinks={sitelinks}
                  callouts={callouts}
                />
              </div>
            </ScrollArea>
          </ResizablePanel>
        </ResizablePanelGroup>

        <DialogFooter className="px-6 py-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Ad'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}