import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { KeywordStrategySection } from './KeywordStrategySection';
import { calculateAdStrength } from '@/lib/adQualityScore';
import { toast } from 'sonner';
import { 
  ChevronRight, 
  FileText, 
  Plus, 
  Settings2, 
  Target, 
  Tags,
  Save,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const BIDDING_STRATEGIES = [
  { value: 'maximize_clicks', label: 'Maximize Clicks' },
  { value: 'maximize_conversions', label: 'Maximize Conversions' },
  { value: 'target_cpa', label: 'Target CPA' },
  { value: 'target_roas', label: 'Target ROAS' },
  { value: 'manual_cpc', label: 'Manual CPC' },
  { value: 'maximize_conversion_value', label: 'Maximize Conversion Value' },
  { value: 'target_impression_share', label: 'Target Impression Share' },
];

const MATCH_TYPES = [
  { value: 'exact', label: 'Exact', notation: '[keyword]', color: 'bg-primary/10 text-primary border-primary/30' },
  { value: 'phrase', label: 'Phrase', notation: '"keyword"', color: 'bg-warning/10 text-warning-text border-warning/30' },
  { value: 'broad', label: 'Broad', notation: 'keyword', color: 'bg-muted text-muted-foreground border-border' },
];

interface AdGroupDetailPanelProps {
  adGroup: {
    id: string;
    name: string;
    bidding_strategy?: string | null;
    match_types?: unknown;
    keywords?: unknown;
    campaign_id?: string;
  };
  campaign: { id: string; name: string };
  entity: string;
  onEditAd: (ad: unknown) => void;
  onCreateAd: () => void;
  onAdGroupUpdated?: () => void;
}

export function AdGroupDetailPanel({
  adGroup,
  campaign,
  entity,
  onEditAd,
  onCreateAd,
  onAdGroupUpdated,
}: AdGroupDetailPanelProps) {
  const queryClient = useQueryClient();
  
  const [biddingStrategy, setBiddingStrategy] = useState(adGroup.bidding_strategy || '');
  const [matchTypes, setMatchTypes] = useState<string[]>(
    Array.isArray(adGroup.match_types) ? (adGroup.match_types as string[]) : []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch ads for this ad group
  const { data: ads = [] } = useQuery({
    queryKey: ['ads-for-adgroup', adGroup.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .eq('ad_group_id', adGroup.id)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const handleBiddingChange = useCallback((value: string) => {
    setBiddingStrategy(value);
    setHasChanges(true);
  }, []);

  const handleMatchTypeToggle = useCallback((type: string) => {
    setMatchTypes(prev => {
      const next = prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type];
      setHasChanges(true);
      return next;
    });
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('ad_groups')
        .update({
          bidding_strategy: biddingStrategy || null,
          match_types: matchTypes,
        })
        .eq('id', adGroup.id);

      if (error) throw error;
      toast.success('Ad group settings saved');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['ad-groups-hierarchy'] });
      onAdGroupUpdated?.();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const formatBiddingLabel = (value: string) => {
    const found = BIDDING_STRATEGIES.find(s => s.value === value);
    return found?.label || value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const getAdStrength = (ad: { headlines: unknown; descriptions: unknown; sitelinks: unknown; callouts: unknown }) => {
    const h = Array.isArray(ad.headlines) ? (ad.headlines as string[]) : [];
    const d = Array.isArray(ad.descriptions) ? (ad.descriptions as string[]) : [];
    const s = Array.isArray(ad.sitelinks)
      ? (ad.sitelinks as { description?: string; text?: string }[]).map(x => x?.description || x?.text || '')
      : [];
    const c = Array.isArray(ad.callouts)
      ? (ad.callouts as (string | { text?: string })[]).map(x => (typeof x === 'string' ? x : x?.text || ''))
      : [];
    const result = calculateAdStrength(h, d, s, c);
    return typeof result === 'number' ? result : result.score;
  };

  const strengthColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const currentMatchTypes = matchTypes.length > 0 ? matchTypes : ['broad'];

  return (
    <ScrollArea className="h-full">
      <div className="p-lg space-y-lg">
        {/* Breadcrumb Header */}
        <div className="space-y-xs">
          <div className="flex items-center gap-xs text-metadata text-muted-foreground">
            <span>{entity}</span>
            <ChevronRight className="h-3 w-3" />
            <span>{campaign.name}</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{adGroup.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-heading-md font-semibold text-foreground">{adGroup.name}</h2>
            {hasChanges && (
              <Button size="sm" onClick={handleSaveSettings} disabled={isSaving} className="gap-xs">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            )}
          </div>
        </div>

        {/* Bidding Strategy Card */}
        <Card className="p-card space-y-sm">
          <div className="flex items-center gap-sm">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-body font-semibold text-foreground">Bidding Strategy</h3>
              <p className="text-metadata text-muted-foreground">How your ads compete in auctions</p>
            </div>
          </div>
          <Select value={biddingStrategy} onValueChange={handleBiddingChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select bidding strategy">
                {biddingStrategy ? formatBiddingLabel(biddingStrategy) : 'Select bidding strategy'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {BIDDING_STRATEGIES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {/* Match Types Card */}
        <Card className="p-card space-y-sm">
          <div className="flex items-center gap-sm">
            <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <Target className="h-4 w-4 text-warning-text" />
            </div>
            <div>
              <h3 className="text-body font-semibold text-foreground">Match Types</h3>
              <p className="text-metadata text-muted-foreground">How closely search queries must match your keywords</p>
            </div>
          </div>
          <div className="space-y-sm">
            {MATCH_TYPES.map(type => (
              <label
                key={type.value}
                className={cn(
                  "flex items-center gap-sm p-sm rounded-lg border cursor-pointer transition-smooth",
                  matchTypes.includes(type.value)
                    ? "border-primary/30 bg-primary/5"
                    : "border-border hover:bg-card-hover"
                )}
              >
                <Checkbox
                  checked={matchTypes.includes(type.value)}
                  onCheckedChange={() => handleMatchTypeToggle(type.value)}
                />
                <div className="flex-1">
                  <span className="text-body-sm font-medium text-foreground">{type.label}</span>
                  <span className="text-metadata text-muted-foreground ml-sm">{type.notation}</span>
                </div>
                <Badge variant="outline" className={cn('text-metadata', type.color)}>
                  {type.label}
                </Badge>
              </label>
            ))}
          </div>
        </Card>

        {/* Keyword Strategy */}
        <Card className="p-card space-y-sm">
          <div className="flex items-center gap-sm mb-xs">
            <div className="h-8 w-8 rounded-lg bg-info/10 flex items-center justify-center">
              <Tags className="h-4 w-4 text-info-text" />
            </div>
            <div>
              <h3 className="text-body font-semibold text-foreground">Keywords</h3>
              <p className="text-metadata text-muted-foreground">Target keywords for this ad group (max 20)</p>
            </div>
          </div>
          <KeywordStrategySection adGroupId={adGroup.id} matchTypes={currentMatchTypes} />
        </Card>

        {/* Ads Summary */}
        <Card className="p-card space-y-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-sm">
              <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-success-text" />
              </div>
              <div>
                <h3 className="text-body font-semibold text-foreground">Ads</h3>
                <p className="text-metadata text-muted-foreground">{ads.length} ad{ads.length !== 1 ? 's' : ''} in this group</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={onCreateAd} className="gap-xs">
              <Plus className="h-4 w-4" />
              Add Ad
            </Button>
          </div>

          {ads.length === 0 ? (
            <div className="text-center py-md text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-xs opacity-40" />
              <p className="text-body-sm">No ads yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-xs">
              {ads.map(ad => {
                const score = getAdStrength(ad);
                return (
                  <button
                    key={ad.id}
                    className="w-full flex items-center gap-sm p-sm rounded-lg border border-border hover:bg-card-hover hover:border-primary/20 transition-smooth text-left"
                    onClick={() => onEditAd(ad)}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 text-body-sm text-foreground truncate">{ad.name}</span>
                    <Badge variant="outline" className={cn('text-metadata', strengthColor(score))}>
                      {score}%
                    </Badge>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </ScrollArea>
  );
}
