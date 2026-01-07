import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Plus, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getStatusBadgeVariant } from "@/lib/constants";

interface SearchAdGroupAdsViewProps {
  adGroup: any;
  campaign: any;
  entity: string;
  onAdSelected: (ad: any) => void;
  onAdCreated: (adId?: string) => void;
}

export function SearchAdGroupAdsView({
  adGroup,
  campaign,
  entity,
  onAdSelected,
  onAdCreated
}: SearchAdGroupAdsViewProps) {
  // Fetch ads for this ad group
  const { data: ads = [] } = useQuery({
    queryKey: ["ads", adGroup.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("ads")
        .select("*")
        .eq("ad_group_id", adGroup.id)
        .order("created_at", { ascending: false });
      return data || [];
    }
  });

  const handleCreateNew = () => {
    // Create a temporary "new ad" object with context pre-filled
    const newAd = {
      id: null,
      name: "",
      ad_type: "search",
      entity,
      campaign_id: campaign.id,
      ad_group_id: adGroup.id,
      headlines: ["", "", ""],
      descriptions: ["", ""],
      final_url: "",
      path1: "",
      path2: "",
      business_name: "",
      language: campaign.languages?.[0] || "EN"
    };
    onAdSelected(newAd);
  };

  // Status badge variant now centralized in constants.ts

  return (
    <ScrollArea className="h-full">
      <div className="p-lg space-y-lg">
        <div>
          <div className="flex items-center gap-xs text-body-sm text-muted-foreground mb-xs">
            <span>{entity}</span>
            <span>›</span>
            <span>{campaign.name}</span>
            <span>›</span>
            <span className="font-medium text-foreground">{adGroup.name}</span>
          </div>
          <h2 className="text-heading-lg font-semibold">Ads</h2>
          <p className="text-body-sm text-muted-foreground mt-xs">
            Create and manage search ads for this ad group
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create New Ad</CardTitle>
            <CardDescription>
              Add a search ad to {adGroup.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreateNew} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              New Search Ad
            </Button>
          </CardContent>
        </Card>

        {ads.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Existing Ads ({ads.length})</CardTitle>
              <CardDescription>Click an ad to edit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-xs">
                {ads.map(ad => (
                  <div
                    key={ad.id}
                    onClick={() => onAdSelected(ad)}
                    className="p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="font-medium">{ad.name}</div>
                      </div>
                      <Badge variant={getStatusBadgeVariant(ad.approval_status || "draft")}>
                        {ad.approval_status || "draft"}
                      </Badge>
                    </div>
                    {ad.headlines?.[0] && (
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {ad.headlines[0]}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {ad.language || "EN"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {ads.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No ads yet</p>
              <p className="text-sm">Create your first search ad to get started</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
