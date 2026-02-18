import { useState, useEffect } from "react";
import { Copy, Check, ExternalLink, Link2, Layers, FolderOpen, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getUniversalReviewUrl } from "@/lib/urlHelpers";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type ShareScope = "entity" | "campaign" | "ad_group";

const SCOPE_OPTIONS: { value: ShareScope; label: string; description: string; icon: typeof Layers }[] = [
  { value: "entity", label: "Entity", description: "All campaigns", icon: Layers },
  { value: "campaign", label: "Campaign", description: "Single campaign", icon: FolderOpen },
  { value: "ad_group", label: "Ad Group", description: "Single ad group", icon: FileText },
];

interface SearchAdsShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: string;
  selectedCampaignId?: string;
  selectedAdGroupId?: string;
}

export function SearchAdsShareDialog({
  open,
  onOpenChange,
  entity,
  selectedCampaignId,
  selectedAdGroupId,
}: SearchAdsShareDialogProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Scope state
  const [scope, setScope] = useState<ShareScope>(
    selectedAdGroupId ? "ad_group" : selectedCampaignId ? "campaign" : "entity"
  );
  const [selectedCampaign, setSelectedCampaign] = useState<string>(selectedCampaignId || "");
  const [selectedAdGroup, setSelectedAdGroup] = useState<string>(selectedAdGroupId || "");

  // Link state
  const [isActive, setIsActive] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [clickCount, setClickCount] = useState(0);

  // Fetch campaigns for entity
  const { data: campaigns = [] } = useQuery({
    queryKey: ["share-campaigns", entity],
    queryFn: async () => {
      const { data } = await supabase
        .from("search_campaigns")
        .select("id, name, campaign_type")
        .eq("entity", entity)
        .order("name");
      return data || [];
    },
    enabled: open && !!entity,
  });

  // Fetch ad groups for selected campaign
  const { data: adGroups = [] } = useQuery({
    queryKey: ["share-ad-groups", selectedCampaign],
    queryFn: async () => {
      const { data } = await supabase
        .from("ad_groups")
        .select("id, name")
        .eq("campaign_id", selectedCampaign)
        .order("name");
      return data || [];
    },
    enabled: open && !!selectedCampaign && scope === "ad_group",
  });

  // Sync defaults when dialog opens
  useEffect(() => {
    if (open) {
      if (selectedAdGroupId) {
        setScope("ad_group");
        setSelectedAdGroup(selectedAdGroupId);
        setSelectedCampaign(selectedCampaignId || "");
      } else if (selectedCampaignId) {
        setScope("campaign");
        setSelectedCampaign(selectedCampaignId);
      } else {
        setScope("entity");
      }
    }
  }, [open, selectedCampaignId, selectedAdGroupId]);

  // Get resource_id based on scope
  const getResourceId = (): string | null => {
    if (scope === "campaign" && selectedCampaign) return selectedCampaign;
    if (scope === "ad_group" && selectedAdGroup) return selectedAdGroup;
    return null;
  };

  // Fetch existing link on mount / scope change
  useEffect(() => {
    if (open && entity) {
      void fetchExistingLink();
    }
  }, [open, entity, scope, selectedCampaign, selectedAdGroup]);

  const fetchExistingLink = async () => {
    setIsLoading(true);
    try {
      const resourceId = getResourceId();
      let query = supabase
        .from("public_access_links")
        .select("*")
        .eq("entity", entity)
        .eq("resource_type", "search_ads")
        .eq("is_active", true);

      if (resourceId) {
        query = query.eq("resource_id", resourceId);
      } else {
        query = query.is("resource_id", null);
      }

      const { data } = await query.maybeSingle();

      if (data) {
        setIsActive(true);
        setToken(data.access_token);
        setClickCount(data.click_count || 0);
      } else {
        setIsActive(false);
        setToken(null);
        setClickCount(0);
      }
    } catch (error) {
      console.error("Error fetching existing link:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const shareUrl = token ? getUniversalReviewUrl(token) : "";

  const handleTogglePublic = async () => {
    if (scope === "campaign" && !selectedCampaign) {
      toast.error("Please select a campaign");
      return;
    }
    if (scope === "ad_group" && !selectedAdGroup) {
      toast.error("Please select an ad group");
      return;
    }

    setIsUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const resourceId = getResourceId();

      if (isActive) {
        setIsActive(false);
        setToken(null);

        let deactivateQuery = supabase
          .from("public_access_links")
          .update({ is_active: false })
          .eq("entity", entity)
          .eq("resource_type", "search_ads");

        if (resourceId) {
          deactivateQuery = deactivateQuery.eq("resource_id", resourceId);
        } else {
          deactivateQuery = deactivateQuery.is("resource_id", null);
        }

        const { error } = await deactivateQuery;
        if (error) throw error;
        toast.success("Link deactivated");
      } else {
        // Deactivate existing for same scope
        let deactivateQuery = supabase
          .from("public_access_links")
          .update({ is_active: false })
          .eq("entity", entity)
          .eq("resource_type", "search_ads");

        if (resourceId) {
          deactivateQuery = deactivateQuery.eq("resource_id", resourceId);
        } else {
          deactivateQuery = deactivateQuery.is("resource_id", null);
        }
        await deactivateQuery;

        const newToken = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
        setIsActive(true);
        setToken(newToken);
        setClickCount(0);

        // Check for existing record
        let existingQuery = supabase
          .from("public_access_links")
          .select("id")
          .eq("entity", entity)
          .eq("resource_type", "search_ads");

        if (resourceId) {
          existingQuery = existingQuery.eq("resource_id", resourceId);
        } else {
          existingQuery = existingQuery.is("resource_id", null);
        }

        const { data: existing } = await existingQuery.maybeSingle();

        const metadata = { scope };

        if (existing) {
          const { error } = await supabase
            .from("public_access_links")
            .update({
              access_token: newToken,
              is_active: true,
              is_public: true,
              click_count: 0,
              last_accessed_at: null,
              metadata,
            })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase.from("public_access_links") as any).insert({
            access_token: newToken,
            resource_type: "search_ads",
            resource_id: resourceId,
            entity,
            is_active: true,
            is_public: true,
            created_by: user?.id,
            metadata,
          });
          if (error) throw error;
        }

        toast.success("Link activated");
      }

      queryClient.invalidateQueries({ queryKey: ["public-access-links"] });
    } catch (error: unknown) {
      void fetchExistingLink();
      toast.error(error instanceof Error ? error.message : "Failed to update sharing settings");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const scopeLabel = scope === "entity" 
    ? `all ${entity} campaigns` 
    : scope === "campaign" 
      ? campaigns.find(c => c.id === selectedCampaign)?.name || "selected campaign"
      : adGroups.find(ag => ag.id === selectedAdGroup)?.name || "selected ad group";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Search Ads for Review</DialogTitle>
          <DialogDescription>
            Generate a public link to share search ads with external reviewers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Scope Selector */}
          <div className="space-y-2">
            <Label>Share Scope</Label>
            <div className="grid grid-cols-3 gap-2">
              {SCOPE_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const isSelected = scope === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setScope(opt.value);
                      setIsActive(false);
                      setToken(null);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg border transition-smooth text-center",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:bg-card-hover text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-metadata font-medium">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campaign Selector (for campaign or ad_group scope) */}
          {(scope === "campaign" || scope === "ad_group") && (
            <div className="space-y-2">
              <Label>Campaign</Label>
              <Select value={selectedCampaign} onValueChange={(v) => { setSelectedCampaign(v); setSelectedAdGroup(""); setIsActive(false); setToken(null); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Ad Group Selector (for ad_group scope) */}
          {scope === "ad_group" && selectedCampaign && (
            <div className="space-y-2">
              <Label>Ad Group</Label>
              <Select value={selectedAdGroup} onValueChange={(v) => { setSelectedAdGroup(v); setIsActive(false); setToken(null); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ad group" />
                </SelectTrigger>
                <SelectContent>
                  {adGroups.map(ag => (
                    <SelectItem key={ag.id} value={ag.id}>{ag.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="public-link">Enable public link</Label>
                  <p className="text-xs text-muted-foreground">
                    Anyone with the link can view {scopeLabel}
                  </p>
                </div>
                <Switch
                  id="public-link"
                  checked={isActive}
                  onCheckedChange={handleTogglePublic}
                  disabled={isUpdating}
                />
              </div>

              {isActive && token && (
                <>
                  <div className="space-y-2">
                    <Label>Share link</Label>
                    <div className="flex gap-2">
                      <Input value={shareUrl} readOnly className="bg-muted" />
                      <Button variant="outline" size="icon" onClick={handleCopyLink}>
                        {copied ? <Check className="h-4 w-4 text-success-text" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => window.open(shareUrl, "_blank")}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {clickCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      This link has been viewed {clickCount} time{clickCount !== 1 ? "s" : ""}
                    </p>
                  )}
                </>
              )}

              {!isActive && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
                  <Link2 className="h-4 w-4" />
                  Enable the public link to share search ads for external review
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
