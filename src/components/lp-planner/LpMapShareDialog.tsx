import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Copy, Check, Link2, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePublicAccessManagement, PublicAccessLink } from "@/hooks/usePublicAccess";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface LpMapShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapId: string;
  mapName: string;
  entity: string;
}

export function LpMapShareDialog({
  open,
  onOpenChange,
  mapId,
  mapName,
  entity,
}: LpMapShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  
  const { generateLink, toggleActive } = usePublicAccessManagement();

  // Check for existing link
  const { data: existingLink, isLoading: checkingLink } = useQuery({
    queryKey: ['public-access-link', 'lp_map', mapId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_access_links')
        .select('*')
        .eq('resource_type', 'lp_map')
        .eq('resource_id', mapId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as PublicAccessLink | null;
    },
    enabled: open,
  });

  // Reset copied state when dialog closes
  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const handleGenerateLink = async () => {
    try {
      await generateLink.mutateAsync({
        resourceType: 'lp_map',
        entity,
        resourceId: mapId,
        isPublic,
        metadata: { mapName },
      });
      toast.success('Review link created');
    } catch (error) {
      toast.error('Failed to create link');
    }
  };

  const handleCopy = async () => {
    if (!existingLink) return;
    const url = `${window.location.origin}/ads/lp/review/${existingLink.access_token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleActive = async () => {
    if (!existingLink) return;
    await toggleActive.mutateAsync({ id: existingLink.id, isActive: !existingLink.is_active });
    toast.success(existingLink.is_active ? 'Link deactivated' : 'Link activated');
  };

  const reviewUrl = existingLink
    ? `${window.location.origin}/ads/lp/review/${existingLink.access_token}`
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Share LP Map for Review
          </DialogTitle>
          <DialogDescription>
            Share "{mapName}" with external stakeholders for feedback.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {checkingLink ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : existingLink ? (
            <>
              {/* Existing link display */}
              <div className="space-y-2">
                <Label>Review Link</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={reviewUrl}
                    className="text-body-sm"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-metadata text-muted-foreground">
                <span>{existingLink.click_count} views</span>
                {existingLink.last_accessed_at && (
                  <span>
                    Last accessed: {new Date(existingLink.last_accessed_at).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Toggle active */}
              <div className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <p className="text-body-sm font-medium">Link Active</p>
                  <p className="text-metadata text-muted-foreground">
                    Deactivate to prevent access
                  </p>
                </div>
                <Switch
                  checked={existingLink.is_active}
                  onCheckedChange={handleToggleActive}
                />
              </div>

              {/* Open in new tab */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(reviewUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview Review Page
              </Button>
            </>
          ) : (
            <>
              {/* Generate new link */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="text-body-sm font-medium">Public Access</p>
                    <p className="text-metadata text-muted-foreground">
                      Anyone with the link can view (no login required)
                    </p>
                  </div>
                  <Switch
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleGenerateLink}
                  disabled={generateLink.isPending}
                >
                  {generateLink.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  Generate Review Link
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
