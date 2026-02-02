import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ENTITIES } from "@/lib/constants";

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEntity?: string;
  defaultAdType?: "search" | "display";
  onSuccess?: () => void;
}

export function CreateCampaignDialog({ open, onOpenChange, defaultEntity, defaultAdType = "search", onSuccess }: CreateCampaignDialogProps) {
  const [name, setName] = useState("");
  const [entity, setEntity] = useState(defaultEntity || "UAE");
  const [languages, setLanguages] = useState<string[]>(["EN"]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleLanguage = (lang: string) => {
    setLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const handleCreate = async () => {
    if (!entity.trim()) {
      toast.error("Please select an entity");
      return;
    }

    if (!name.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }

    if (languages.length === 0) {
      toast.error("Please select at least one language");
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("search_campaigns")
        .insert({
          name: name.trim(),
          entity: entity.trim(),
          languages,
          status: "active",
          created_by: user.id
        });

      if (error) throw error;

      toast.success("Campaign created successfully");
      setName("");
      setEntity(defaultEntity || "UAE");
      setLanguages(["EN"]);
      onSuccess?.();
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to create campaign");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Campaign</DialogTitle>
          <DialogDescription>
            Create a new ad campaign
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-md py-md">
          <div className="space-y-sm">
            <Label htmlFor="entity">Entity *</Label>
            <Select value={entity || undefined} onValueChange={setEntity}>
              <SelectTrigger id="entity">
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                {ENTITIES.map(ent => (
                  <SelectItem key={ent} value={ent}>{ent}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-sm">
            <Label htmlFor="campaign-name">Campaign Name *</Label>
            <Input
              id="campaign-name"
              placeholder="e.g., Q4 Brand Campaign"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-sm">
            <Label>Languages *</Label>
            <div className="flex gap-md">
              <div className="flex items-center space-x-sm">
                <Checkbox
                  id="lang-en"
                  checked={languages.includes("EN")}
                  onCheckedChange={() => toggleLanguage("EN")}
                />
                <label htmlFor="lang-en" className="text-body-sm font-medium cursor-pointer">
                  English
                </label>
              </div>
              <div className="flex items-center space-x-sm">
                <Checkbox
                  id="lang-ar"
                  checked={languages.includes("AR")}
                  onCheckedChange={() => toggleLanguage("AR")}
                />
                <label htmlFor="lang-ar" className="text-body-sm font-medium cursor-pointer">
                  Arabic
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-sm">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isLoading} className="flex-1">
              {isLoading && <Loader2 className="mr-sm h-4 w-4 animate-spin" />}
              Create Campaign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
