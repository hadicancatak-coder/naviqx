import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Save, Folder, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { validateCampaign, type ValidationResult } from "@/lib/campaignValidation";
import { GoogleParityChecklist } from "./GoogleParityChecklist";

interface CampaignDetailPanelProps {
  campaign: {
    id: string;
    name: string;
    campaign_type?: string;
    status?: string;
    objective?: string | null;
    [key: string]: unknown;
  };
  entity: string;
}

// App campaign options
const APP_OBJECTIVES = [
  { value: 'installs', label: 'App Installs' },
  { value: 'engagement', label: 'App Engagement' },
  { value: 'pre_registration', label: 'App Pre-Registration' },
];

const OPTIMIZATION_GOALS = [
  { value: 'installs', label: 'Installs' },
  { value: 'in_app_action', label: 'In-app Action' },
];

const BIDDING_TYPES = [
  { value: 'target_cpi', label: 'Target CPI' },
  { value: 'target_cpa', label: 'Target CPA' },
];

const PLATFORMS = [
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iOS' },
];

const AUDIENCE_MODES = [
  { value: 'all', label: 'All users' },
  { value: 'new', label: 'New users only' },
  { value: 'existing', label: 'Existing users' },
];

// Display campaign options
const DISPLAY_OBJECTIVES = [
  { value: 'awareness', label: 'Awareness' },
  { value: 'consideration', label: 'Consideration' },
  { value: 'conversions', label: 'Conversions' },
];

export function CampaignDetailPanel({ campaign, entity }: CampaignDetailPanelProps) {
  const queryClient = useQueryClient();
  const campaignType = (campaign.campaign_type || 'search') as string;

  // Local form state
  const [name, setName] = useState(campaign.name);
  const [appObjective, setAppObjective] = useState((campaign.app_objective as string) || '');
  const [optimizationGoal, setOptimizationGoal] = useState((campaign.optimization_goal as string) || '');
  const [optimizationEvent, setOptimizationEvent] = useState((campaign.optimization_event as string) || '');
  const [biddingType, setBiddingType] = useState((campaign.bidding_type as string) || '');
  const [biddingTarget, setBiddingTarget] = useState((campaign.bidding_target as number)?.toString() || '');
  const [appPlatform, setAppPlatform] = useState((campaign.app_platform as string) || '');
  const [appStoreId, setAppStoreId] = useState((campaign.app_store_id as string) || '');
  const [audienceMode, setAudienceMode] = useState((campaign.audience_mode as string) || '');
  const [displayObjective, setDisplayObjective] = useState((campaign.display_objective as string) || '');

  // Derived store URL
  const appStoreUrl = useMemo(() => {
    if (!appStoreId) return '';
    if (appPlatform === 'android') return `https://play.google.com/store/apps/details?id=${appStoreId}`;
    if (appPlatform === 'ios') return `https://apps.apple.com/app/id${appStoreId}`;
    return '';
  }, [appPlatform, appStoreId]);

  // Fetch ad groups + ads for validation
  const { data: adGroups = [] } = useQuery({
    queryKey: ['campaign-detail-adgroups', campaign.id],
    queryFn: async () => {
      const { data: groups, error } = await supabase
        .from('ad_groups')
        .select('id, name, keywords')
        .eq('campaign_id', campaign.id);
      if (error) throw error;

      const { data: allAds, error: adsErr } = await supabase
        .from('ads')
        .select('ad_group_id, headlines, descriptions, landing_page, business_name, short_headlines, long_headline, cta_text')
        .in('ad_group_id', (groups || []).map(g => g.id));
      if (adsErr) throw adsErr;

      return (groups || []).map(g => ({
        ...g,
        ads: (allAds || []).filter(a => a.ad_group_id === g.id),
      }));
    },
  });

  // Validation
  const validation: ValidationResult = useMemo(() => {
    const campaignData = {
      id: campaign.id,
      name,
      campaign_type: campaignType,
      app_objective: appObjective || null,
      optimization_goal: optimizationGoal || null,
      app_platform: appPlatform || null,
      app_store_id: appStoreId || null,
      bidding_type: biddingType || null,
      audience_mode: audienceMode || null,
      display_objective: displayObjective || null,
    };
    return validateCampaign(campaignData, adGroups);
  }, [campaign.id, name, campaignType, appObjective, optimizationGoal, appPlatform, appStoreId, biddingType, audienceMode, displayObjective, adGroups]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates: Record<string, unknown> = { name };

      if (campaignType === 'app') {
        updates.app_objective = appObjective || null;
        updates.optimization_goal = optimizationGoal || null;
        updates.optimization_event = optimizationEvent || null;
        updates.bidding_type = biddingType || null;
        updates.bidding_target = biddingTarget ? parseFloat(biddingTarget) : null;
        updates.app_platform = appPlatform || null;
        updates.app_store_id = appStoreId || null;
        updates.app_store_url = appStoreUrl || null;
        updates.audience_mode = audienceMode || null;
      }

      if (campaignType === 'display') {
        updates.display_objective = displayObjective || null;
      }

      updates.readiness_status = validation.ready ? 'ready' : 'not_ready';

      const { error } = await supabase
        .from('search_campaigns')
        .update(updates)
        .eq('id', campaign.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Campaign settings saved');
      queryClient.invalidateQueries({ queryKey: ['search-campaigns-hierarchy'] });
    },
    onError: () => toast.error('Failed to save'),
  });

  const handleSave = useCallback(() => saveMutation.mutate(), [saveMutation]);

  return (
    <ScrollArea className="h-full">
      <div className="p-lg space-y-lg">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <Folder className="h-5 w-5 text-primary" />
            <h2 className="text-heading-sm font-semibold text-foreground">Campaign Settings</h2>
            <Badge variant="secondary" className="text-metadata capitalize">{campaignType}</Badge>
          </div>
          <Button onClick={handleSave} disabled={saveMutation.isPending} size="sm" className="gap-xs">
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>

        {/* Readiness Status */}
        <Card className={cn(
          "border-2 rounded-xl",
          validation.ready ? "border-success/50 bg-success-soft" : "border-destructive/50 bg-destructive-soft"
        )}>
          <CardContent className="p-md flex items-center gap-sm">
            {validation.ready ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <div>
              <p className={cn("text-body-sm font-semibold", validation.ready ? "text-success-text" : "text-destructive-text")}>
                {validation.ready ? 'READY' : 'NOT READY'}
              </p>
              {!validation.ready && validation.blocking.length > 0 && (
                <ul className="mt-xs space-y-xs">
                  {validation.blocking.map((reason, i) => (
                    <li key={i} className="text-metadata text-destructive-text flex items-start gap-xs">
                      <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {reason}
                    </li>
                  ))}
                </ul>
              )}
              {validation.warnings.length > 0 && (
                <ul className="mt-xs space-y-xs">
                  {validation.warnings.map((w, i) => (
                    <li key={i} className="text-metadata text-warning-text flex items-start gap-xs">
                      <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Campaign Name */}
        <Card className="bg-card border-border rounded-xl">
          <CardHeader className="p-md pb-sm">
            <CardTitle className="text-body-sm font-semibold">General</CardTitle>
          </CardHeader>
          <CardContent className="p-md pt-0 space-y-md">
            <div className="space-y-xs">
              <Label className="text-metadata font-medium text-muted-foreground">Campaign Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-elevated" />
            </div>
          </CardContent>
        </Card>

        {/* App Campaign Settings */}
        {campaignType === 'app' && (
          <Card className="bg-card border-border rounded-xl">
            <CardHeader className="p-md pb-sm">
              <CardTitle className="text-body-sm font-semibold">App Campaign Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-md pt-0 space-y-md">
              <div className="grid grid-cols-2 gap-md">
                <div className="space-y-xs">
                  <Label className="text-metadata font-medium text-muted-foreground">Objective</Label>
                  <Select value={appObjective} onValueChange={setAppObjective}>
                    <SelectTrigger className="bg-elevated"><SelectValue placeholder="Select objective" /></SelectTrigger>
                    <SelectContent>
                      {APP_OBJECTIVES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-xs">
                  <Label className="text-metadata font-medium text-muted-foreground">Optimization Goal</Label>
                  <Select value={optimizationGoal} onValueChange={setOptimizationGoal}>
                    <SelectTrigger className="bg-elevated"><SelectValue placeholder="Select goal" /></SelectTrigger>
                    <SelectContent>
                      {OPTIMIZATION_GOALS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {optimizationGoal === 'in_app_action' && (
                <div className="space-y-xs">
                  <Label className="text-metadata font-medium text-muted-foreground">In-App Event Name</Label>
                  <Input value={optimizationEvent} onChange={(e) => setOptimizationEvent(e.target.value)} placeholder="e.g. purchase, sign_up" className="bg-elevated" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-md">
                <div className="space-y-xs">
                  <Label className="text-metadata font-medium text-muted-foreground">Bidding Strategy</Label>
                  <Select value={biddingType} onValueChange={setBiddingType}>
                    <SelectTrigger className="bg-elevated"><SelectValue placeholder="Select bidding" /></SelectTrigger>
                    <SelectContent>
                      {BIDDING_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-xs">
                  <Label className="text-metadata font-medium text-muted-foreground">
                    {biddingType === 'target_cpi' ? 'Target CPI' : biddingType === 'target_cpa' ? 'Target CPA' : 'Bid Target'}
                  </Label>
                  <Input type="number" value={biddingTarget} onChange={(e) => setBiddingTarget(e.target.value)} placeholder="0.00" className="bg-elevated" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-md">
                <div className="space-y-xs">
                  <Label className="text-metadata font-medium text-muted-foreground">Platform</Label>
                  <Select value={appPlatform} onValueChange={setAppPlatform}>
                    <SelectTrigger className="bg-elevated"><SelectValue placeholder="Select platform" /></SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-xs">
                  <Label className="text-metadata font-medium text-muted-foreground">App ID / Package</Label>
                  <Input value={appStoreId} onChange={(e) => setAppStoreId(e.target.value)} placeholder="com.example.app" className="bg-elevated" />
                </div>
              </div>

              {appStoreUrl && (
                <div className="space-y-xs">
                  <Label className="text-metadata font-medium text-muted-foreground">Store URL (auto-derived)</Label>
                  <Input value={appStoreUrl} readOnly className="bg-muted text-muted-foreground" />
                </div>
              )}

              <div className="space-y-xs">
                <Label className="text-metadata font-medium text-muted-foreground">Audience Mode</Label>
                <Select value={audienceMode} onValueChange={setAudienceMode}>
                  <SelectTrigger className="bg-elevated"><SelectValue placeholder="Select audience" /></SelectTrigger>
                  <SelectContent>
                    {AUDIENCE_MODES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Display Campaign Settings */}
        {campaignType === 'display' && (
          <Card className="bg-card border-border rounded-xl">
            <CardHeader className="p-md pb-sm">
              <CardTitle className="text-body-sm font-semibold">Display Campaign Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-md pt-0 space-y-md">
              <div className="space-y-xs">
                <Label className="text-metadata font-medium text-muted-foreground">Objective</Label>
                <Select value={displayObjective} onValueChange={setDisplayObjective}>
                  <SelectTrigger className="bg-elevated"><SelectValue placeholder="Select objective" /></SelectTrigger>
                  <SelectContent>
                    {DISPLAY_OBJECTIVES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Google Parity Checklist */}
        <Card className="bg-card border-border rounded-xl">
          <CardContent className="p-md">
            <GoogleParityChecklist
              campaignType={campaignType}
              campaign={{
                app_objective: appObjective || null,
                optimization_goal: optimizationGoal || null,
                app_platform: appPlatform || null,
                app_store_id: appStoreId || null,
                audience_mode: audienceMode || null,
                bidding_type: biddingType || null,
                display_objective: displayObjective || null,
              }}
              adGroups={adGroups}
            />
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
