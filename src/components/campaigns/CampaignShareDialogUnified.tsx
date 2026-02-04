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
import { getUniversalReviewUrl } from "@/lib/urlHelpers";

interface CampaignShareDialogUnifiedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: string;
}

export function CampaignShareDialogUnified({
  open,
  onOpenChange,
  entity,
}: CampaignShareDialogUnifiedProps) {
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for the access link
  const [linkData, setLinkData] = useState<{
    id: string;
    access_token: string;
    is_active: boolean;
    click_count: number;
  } | null>(null);

  // Load existing link on mount
  useEffect(() => {
    if (open) {
      loadExistingLink();
    }
  }, [open, entity]);

  const loadExistingLink = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("public_access_links")
        .select("id, access_token, is_active, click_count")
        .eq("entity", entity)
        .eq("resource_type", "campaign")
        .is("resource_id", null)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      setLinkData(data);
    } catch (error) {
      console.error("Error loading link:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const shareUrl = linkData?.access_token
    ? getUniversalReviewUrl(linkData.access_token)
    : "";

  const handleTogglePublic = async () => {
    setIsUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (linkData?.is_active) {
        // Deactivate existing link
        const { error } = await supabase
          .from("public_access_links")
          .update({ is_active: false })
          .eq("id", linkData.id);
        
        if (error) throw error;
        setLinkData(null);
        toast.success("Link deactivated");
      } else {
        // First deactivate any existing active links for this entity
        await supabase
          .from("public_access_links")
          .update({ is_active: false })
          .eq("entity", entity)
          .eq("resource_type", "campaign")
          .is("resource_id", null)
          .eq("is_active", true);

        // Generate new token
        const newToken = crypto.randomUUID().replace(/-/g, "").slice(0, 24);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from("public_access_links") as any)
          .insert({
            access_token: newToken,
            resource_type: "campaign",
            entity,
            is_active: true,
            is_public: true,
            created_by: user?.id,
            metadata: {},
          })
          .select("id, access_token, is_active, click_count")
          .single();

        if (error) throw error;
        setLinkData(data);
        toast.success("Link activated");
      }
    } catch (error: unknown) {
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
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="public-link">Enable public link</Label>
                  <p className="text-xs text-muted-foreground">
                    Anyone with the link can view this campaign log
                  </p>
                </div>
                <Switch
                  id="public-link"
                  checked={!!linkData?.is_active}
                  onCheckedChange={handleTogglePublic}
                  disabled={isUpdating}
                />
              </div>

              {linkData?.is_active && linkData?.access_token && (
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

                  {linkData.click_count > 0 && (
                    <p className="text-xs text-muted-foreground">
                      This link has been viewed {linkData.click_count} time
                      {linkData.click_count !== 1 ? "s" : ""}
                    </p>
                  )}
                </>
              )}

              {!linkData?.is_active && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
                  <Link2 className="h-4 w-4" />
                  Enable the public link to share this campaign log
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
