import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface SearchAdGroupFormProps {
  campaign: any;
  entity: string;
  onAdGroupCreated: (adGroupId: string) => void;
}

export function SearchAdGroupForm({ campaign, entity, onAdGroupCreated }: SearchAdGroupFormProps) {
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Fetch existing ad groups for this campaign
  const { data: existingAdGroups = [], refetch } = useQuery({
    queryKey: ["ad-groups", campaign.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("ad_groups")
        .select("*, ads(count)")
        .eq("campaign_id", campaign.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter an ad group name");
      return;
    }

    setIsCreating(true);

    try {
      const { data, error } = await supabase
        .from("ad_groups")
        .insert({
          name: name.trim(),
          campaign_id: campaign.id,
          status: "active"
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Ad group created successfully");
      setName("");
      refetch();
      onAdGroupCreated(data.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to create ad group");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-lg space-y-lg">
        <div>
          <div className="flex items-center gap-sm text-body-sm text-muted-foreground mb-sm">
            <span>{entity}</span>
            <span>›</span>
            <span className="font-medium text-foreground">{campaign.name}</span>
          </div>
          <h2 className="text-heading-lg font-semibold">Ad Groups</h2>
          <p className="text-body-sm text-muted-foreground mt-xs">
            Create ad groups to organize your search ads
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create New Ad Group</CardTitle>
            <CardDescription>
              Add an ad group to {campaign.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-md">
            <div className="space-y-sm">
              <Label htmlFor="adgroup-name">Ad Group Name *</Label>
              <Input
                id="adgroup-name"
                placeholder="e.g., Exact Match Keywords"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleCreate} 
              disabled={isCreating}
              className="w-full"
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Ad Group
            </Button>
          </CardContent>
        </Card>

        {existingAdGroups.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Ad Groups ({existingAdGroups.length})</CardTitle>
              <CardDescription>Click an ad group in the tree to create ads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-sm">
                {existingAdGroups.map(adGroup => {
                  const adCount = adGroup.ads?.[0]?.count || 0;
                  const matchTypes = Array.isArray(adGroup.match_types) ? adGroup.match_types as string[] : [];
                  return (
                    <div
                      key={adGroup.id}
                      className="p-sm border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{adGroup.name}</div>
                        <Badge variant="secondary">{adCount} {adCount === 1 ? 'ad' : 'ads'}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-xs mt-xs">
                        {adGroup.bidding_strategy && (
                          <Badge variant="outline" className="text-metadata">
                            {(adGroup.bidding_strategy as string).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </Badge>
                        )}
                        {matchTypes.map((mt: string) => (
                          <Badge key={mt} variant="outline" className="text-metadata text-muted-foreground">
                            {mt === 'exact' ? '[Exact]' : mt === 'phrase' ? '"Phrase"' : 'Broad'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
