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
import { useQueryClient } from "@tanstack/react-query";

interface SearchAdsShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: string;
}

export function SearchAdsShareDialog({
  open,
  onOpenChange,
  entity,
}: SearchAdsShareDialogProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Local state for link data
  const [isActive, setIsActive] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [clickCount, setClickCount] = useState(0);

  // Fetch existing link on mount
  useEffect(() => {
    if (open && entity) {
      void fetchExistingLink();
    }
  }, [open, entity]);

  const fetchExistingLink = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from("public_access_links")
        .select("*")
        .eq("entity", entity)
        .eq("resource_type", "search_ads")
        .is("resource_id", null)
        .eq("is_active", true)
        .maybeSingle();

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

  const shareUrl = token
    ? `${getProductionUrl()}/ads/search/review/${token}`
    : "";

  const handleTogglePublic = async () => {
    setIsUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (isActive) {
        // Deactivate
        setIsActive(false);
        setToken(null);

        const { error } = await supabase
          .from("public_access_links")
          .update({ is_active: false })
          .eq("entity", entity)
          .eq("resource_type", "search_ads")
          .is("resource_id", null);

        if (error) throw error;
        toast.success("Link deactivated");
      } else {
        // Deactivate any existing first
        await supabase
          .from("public_access_links")
          .update({ is_active: false })
          .eq("entity", entity)
          .eq("resource_type", "search_ads")
          .is("resource_id", null);

        // Generate new token
        const newToken = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
        
        setIsActive(true);
        setToken(newToken);
        setClickCount(0);

        // Check for existing record to update
        const { data: existing } = await supabase
          .from("public_access_links")
          .select("id")
          .eq("entity", entity)
          .eq("resource_type", "search_ads")
          .is("resource_id", null)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from("public_access_links")
            .update({
              access_token: newToken,
              is_active: true,
              is_public: true,
              click_count: 0,
              last_accessed_at: null,
            })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase.from("public_access_links") as any).insert({
            access_token: newToken,
            resource_type: "search_ads",
            entity,
            is_active: true,
            is_public: true,
            created_by: user?.id,
          });
          if (error) throw error;
        }

        toast.success("Link activated");
      }

      // Invalidate admin queries
      queryClient.invalidateQueries({ queryKey: ["public-access-links"] });
    } catch (error: unknown) {
      // Revert on error
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Search Ads for Review</DialogTitle>
          <DialogDescription>
            Generate a public link to share {entity} search ads with external reviewers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
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
                    Anyone with the link can view search ads for {entity}
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
