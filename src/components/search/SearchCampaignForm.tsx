import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SearchCampaignFormProps {
  entity: string;
  onCampaignCreated: (campaignId: string) => void;
}

const LANGUAGES = [
  { code: "EN", name: "English" },
  { code: "AR", name: "Arabic" }
];

export function SearchCampaignForm({ entity, onCampaignCreated }: SearchCampaignFormProps) {
  const [name, setName] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["EN"]);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch existing campaigns for this entity
  const { data: existingCampaigns = [], refetch } = useQuery({
    queryKey: ["search-campaigns", entity],
    queryFn: async () => {
      const { data } = await supabase
        .from("search_campaigns")
        .select("*")
        .eq("entity", entity)
        .order("created_at", { ascending: false });
      return data || [];
    },
    staleTime: 30 * 1000,
  });

  const toggleLanguage = (langCode: string) => {
    setSelectedLanguages(prev =>
      prev.includes(langCode)
        ? prev.filter(l => l !== langCode)
        : [...prev, langCode]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }

    if (selectedLanguages.length === 0) {
      toast.error("Please select at least one language");
      return;
    }

    setIsCreating(true);

    try {
      const { data, error } = await supabase
        .from("search_campaigns")
        .insert({
          name: name.trim(),
          entity,
          languages: selectedLanguages,
          status: "active"
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Campaign created successfully");
      setName("");
      setSelectedLanguages(["EN"]);
      refetch();
      onCampaignCreated(data.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to create campaign");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-lg space-y-lg">
        <div>
          <h2 className="text-heading-lg font-semibold">Campaigns for {entity}</h2>
          <p className="text-body-sm text-muted-foreground mt-1">
            Create a new campaign or select an existing one from the tree
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create New Campaign</CardTitle>
            <CardDescription>
              Set up a new search campaign for {entity}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-md">
            <div className="space-y-xs">
              <Label htmlFor="campaign-name">Campaign Name *</Label>
              <Input
                id="campaign-name"
                placeholder="e.g., Q4 Brand Campaign"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-xs">
              <Label>Languages *</Label>
              <div className="flex gap-md">
                {LANGUAGES.map(lang => (
                  <div key={lang.code} className="flex items-center space-x-2">
                    <Checkbox
                      id={`lang-${lang.code}`}
                      checked={selectedLanguages.includes(lang.code)}
                      onCheckedChange={() => toggleLanguage(lang.code)}
                    />
                    <label
                      htmlFor={`lang-${lang.code}`}
                      className="text-body-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {lang.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleCreate} 
              disabled={isCreating}
              className="w-full"
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Campaign
            </Button>
          </CardContent>
        </Card>

        {existingCampaigns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Existing Campaigns ({existingCampaigns.length})</CardTitle>
              <CardDescription>Click a campaign in the tree to manage ad groups</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {existingCampaigns.map(campaign => (
                  <div
                    key={campaign.id}
                    className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="font-medium">{campaign.name}</div>
                    <div className="text-body-sm text-muted-foreground">
                      {campaign.languages?.join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
