import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Copy, Check, Link2, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePublicAccessManagement, PublicAccessLink } from "@/hooks/usePublicAccess";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getUniversalReviewUrl } from "@/lib/urlHelpers";

interface AppStoreShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  listingName: string;
}

export function AppStoreShareDialog({
  open,
  onOpenChange,
  listingId,
  listingName,
}: AppStoreShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const queryClient = useQueryClient();

  const { generateLink, toggleActive } = usePublicAccessManagement();

  const linkQueryKey = ['public-access-link', 'app_store', listingId];

  const { data: existingLink, isLoading: checkingLink } = useQuery({
    queryKey: linkQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_access_links')
        .select('*')
        .eq('resource_type', 'app_store')
        .eq('resource_id', listingId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PublicAccessLink | null;
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const handleGenerateLink = async () => {
    try {
      await generateLink.mutateAsync({
        resourceType: 'app_store',
        entity: 'app_store',
        resourceId: listingId,
        isPublic,
        metadata: { listingName },
      });
      // Immediately refresh dialog-specific query + admin list
      queryClient.invalidateQueries({ queryKey: linkQueryKey });
      queryClient.invalidateQueries({ queryKey: ['public-access-links'] });
      toast.success('Review link created');
    } catch {
      toast.error('Failed to create link');
    }
  };

  const reviewUrl = existingLink
    ? getUniversalReviewUrl(existingLink.access_token)
    : '';

  const handleCopy = async () => {
    if (!reviewUrl) return;
    await navigator.clipboard.writeText(reviewUrl);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleActive = async () => {
    if (!existingLink) return;
    const newState = !existingLink.is_active;
    await toggleActive.mutateAsync({ id: existingLink.id, isActive: newState });
    // Refresh both dialog and admin queries
    queryClient.invalidateQueries({ queryKey: linkQueryKey });
    queryClient.invalidateQueries({ queryKey: ['public-access-links'] });
    toast.success(newState ? 'Link activated' : 'Link deactivated');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Share Listing for Review
          </DialogTitle>
          <DialogDescription>
            Share &ldquo;{listingName}&rdquo; with external stakeholders for feedback.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {checkingLink ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : existingLink ? (
            <>
              <div className="space-y-2">
                <Label>Review Link</Label>
                <div className="flex gap-2">
                  <Input readOnly value={reviewUrl} className="text-body-sm" />
                  <Button size="icon" variant="outline" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-metadata text-muted-foreground">
                <span>{existingLink.click_count} views</span>
                {existingLink.last_accessed_at && (
                  <span>Last accessed: {new Date(existingLink.last_accessed_at).toLocaleDateString()}</span>
                )}
              </div>

              <div className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <p className="text-body-sm font-medium">Link Active</p>
                  <p className="text-metadata text-muted-foreground">Deactivate to prevent access</p>
                </div>
                <Switch checked={existingLink.is_active} onCheckedChange={handleToggleActive} />
              </div>

              <Button variant="outline" className="w-full" onClick={() => window.open(reviewUrl, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview Review Page
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <p className="text-body-sm font-medium">Public Access</p>
                  <p className="text-metadata text-muted-foreground">Anyone with the link can view</p>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>

              <Button className="w-full" onClick={handleGenerateLink} disabled={generateLink.isPending}>
                {generateLink.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Generate Review Link
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
