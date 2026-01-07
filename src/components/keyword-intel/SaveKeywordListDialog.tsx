import { useState } from "react";
import { Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSystemEntities } from "@/hooks/useSystemEntities";

interface KeywordRowForSave {
  keyword: string;
  opportunity_score?: number;
  clicks: number;
  impressions: number;
  ctr: number;
  cost: number;
  conversions: number;
  campaign: string;
  ad_group: string;
  match_type: string;
}

interface SaveKeywordListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keywords: KeywordRowForSave[];
  onSave: (data: { name: string; entity: string; description?: string }) => void;
  isSaving: boolean;
}

export function SaveKeywordListDialog({
  open,
  onOpenChange,
  keywords,
  onSave,
  isSaving,
}: SaveKeywordListDialogProps) {
  const { data: entities = [] } = useSystemEntities();
  const [name, setName] = useState("");
  const [entity, setEntity] = useState("");
  const [description, setDescription] = useState("");

  const handleSave = () => {
    if (!name || !entity) return;
    onSave({ name, entity, description: description || undefined });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName("");
      setEntity("");
      setDescription("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save Keyword Analysis
          </DialogTitle>
          <DialogDescription>
            Save {keywords.length} keywords with their opportunity scores for future reference.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-md py-md">
          <div className="grid gap-xs">
            <Label htmlFor="name">List Name *</Label>
            <Input
              id="name"
              placeholder="e.g., CFI UK - Dec 2024 SQR"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-xs">
            <Label htmlFor="entity">Trading Entity *</Label>
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger id="entity">
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                {entities.map((e) => (
                  <SelectItem key={e.id} value={e.name}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-xs">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Notes about this analysis..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            <p className="font-medium mb-1">Summary</p>
            <p>{keywords.length} keywords will be saved</p>
            {keywords.length > 0 && (
              <p className="text-xs mt-1">
                Top score: {Math.max(...keywords.map((k) => k.opportunity_score || 0))} | 
                Avg score: {Math.round(keywords.reduce((sum, k) => sum + (k.opportunity_score || 0), 0) / keywords.length)}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name || !entity || isSaving}>
            {isSaving ? "Saving..." : "Save List"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
