import { useState, useEffect } from "react";
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
  
  // Local state for immediate UI feedback
  const [localIsPublic, setLocalIsPublic] = useState(isPublic);
  const [localToken, setLocalToken] = useState(publicToken);
  
  // Sync local state with props when they change
  useEffect(() => {
    setLocalIsPublic(isPublic);
    setLocalToken(publicToken);
  }, [isPublic, publicToken]);

  const shareUrl = localToken
    ? `${getProductionUrl()}/campaigns-log/review/${localToken}`
    : "";

  const handleTogglePublic = async () => {
    setIsUpdating(true);
    try {
      // Get current user for created_by field
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check if an entity-wide access record exists
      const { data: existing } = await supabase
        .from("campaign_external_access")
        .select("id, access_token")
        .eq("entity", entity)
        .is("campaign_id", null)
        .maybeSingle();

      if (localIsPublic) {
        // Deactivate - immediate UI feedback
        setLocalIsPublic(false);
        setLocalToken(null);
        
        if (existing) {
          const { error } = await supabase
            .from("campaign_external_access")
            .update({ is_active: false })
            .eq("id", existing.id);
          if (error) throw error;
        }
        toast.success("Link deactivated");
      } else {
        // Activate - first deactivate any existing active tokens for this entity
        await supabase
          .from("campaign_external_access")
          .update({ is_active: false })
          .eq("entity", entity)
          .is("campaign_id", null)
          .eq("is_active", true);
        
        const newToken = crypto.randomUUID();
        
        // Immediate UI feedback
        setLocalIsPublic(true);
        setLocalToken(newToken);
        
        if (existing) {
          // Update existing record with new token
          const { error } = await supabase
            .from("campaign_external_access")
            .update({
              access_token: newToken,
              is_active: true,
              click_count: 0,
              last_accessed_at: null,
            })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          // Insert new record WITH created_by
          const { error } = await supabase
            .from("campaign_external_access")
            .insert({
              entity,
              access_token: newToken,
              is_active: true,
              reviewer_email: "public@cfi.trade",
              reviewer_name: "Public Access",
              created_by: user?.id,
            });
          if (error) throw error;
        }
        
        toast.success("Link activated");
      }
      onRefresh();
    } catch (error: any) {
      // Revert local state on error
      setLocalIsPublic(isPublic);
      setLocalToken(publicToken);
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
              checked={localIsPublic}
              onCheckedChange={handleTogglePublic}
              disabled={isUpdating}
            />
          </div>

          {localIsPublic && localToken && (
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

          {!localIsPublic && (
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
