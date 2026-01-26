import { useState } from "react";
import { Copy, Check, ExternalLink, Link2 } from "lucide-react";
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getProductionUrl } from "@/lib/urlHelpers";

interface CampaignShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: string;
  isPublic: boolean;
  publicToken: string | null;
  clickCount: number;
  onRefresh: () => void;
}

export const CampaignShareDialog = ({
  open,
  onOpenChange,
  entity,
  isPublic,
  publicToken,
  clickCount,
  onRefresh,
}: CampaignShareDialogProps) => {
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const shareUrl = publicToken
    ? `${getProductionUrl()}/campaigns-log/review/${publicToken}`
    : "";

  const handleTogglePublic = async () => {
    setIsUpdating(true);
    try {
      // Check if an entity-wide access record exists
      const { data: existing } = await supabase
        .from("campaign_external_access")
        .select("id, access_token")
        .eq("entity", entity)
        .is("campaign_id", null)
        .maybeSingle();

      if (isPublic) {
        // Deactivate
        if (existing) {
          const { error } = await supabase
            .from("campaign_external_access")
            .update({ is_active: false })
            .eq("id", existing.id);
          if (error) throw error;
        }
        toast.success("Link deactivated");
      } else {
        // Activate
        const newToken = crypto.randomUUID();
        
        if (existing) {
          // Update existing record with new token
          const { error } = await supabase
            .from("campaign_external_access")
            .update({
              access_token: newToken,
              is_active: true,
            })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          // Insert new record
          const { error } = await supabase
            .from("campaign_external_access")
            .insert({
              entity,
              access_token: newToken,
              is_active: true,
              reviewer_email: "public@cfi.trade",
              reviewer_name: "Public Access",
            });
          if (error) throw error;
        }
        
        toast.success("Link activated");
      }
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update sharing settings");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Campaign Log</DialogTitle>
          <DialogDescription>
            Generate a public link to share the {entity} campaign log with external reviewers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="public-link">Enable public link</Label>
              <p className="text-xs text-muted-foreground">
                Anyone with the link can view this campaign log
              </p>
            </div>
            <Switch
              id="public-link"
              checked={isPublic}
              onCheckedChange={handleTogglePublic}
              disabled={isUpdating}
            />
          </div>

          {isPublic && publicToken && (
            <>
              <div className="space-y-2">
                <Label>Share link</Label>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="bg-muted"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success-text" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(shareUrl, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {clickCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  This link has been viewed {clickCount} time
                  {clickCount !== 1 ? "s" : ""}
                </p>
              )}
            </>
          )}

          {!isPublic && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
              <Link2 className="h-4 w-4" />
              Enable the public link to share this campaign log
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
