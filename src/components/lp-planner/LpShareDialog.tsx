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
import { LpMap, useUpdateLpMap } from "@/hooks/useLpMaps";
import { getUniversalReviewUrl } from "@/lib/urlHelpers";

interface LpShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  map: LpMap;
  onRefresh: () => void;
}

export const LpShareDialog = ({
  open,
  onOpenChange,
  map,
  onRefresh,
}: LpShareDialogProps) => {
  const [copied, setCopied] = useState(false);

  const updateMap = useUpdateLpMap();

  const shareUrl = getUniversalReviewUrl(map.public_token);

  const handleTogglePublic = async () => {
    await updateMap.mutateAsync({
      id: map.id,
      is_public: !map.is_public,
    });
    onRefresh();
    toast.success(
      map.is_public ? "Link deactivated" : "Link activated"
    );
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
          <DialogTitle>Share LP Map</DialogTitle>
          <DialogDescription>
            Generate a public link to share this LP map with external reviewers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="public-link">Enable public link</Label>
              <p className="text-xs text-muted-foreground">
                Anyone with the link can view this map
              </p>
            </div>
            <Switch
              id="public-link"
              checked={map.is_public}
              onCheckedChange={handleTogglePublic}
            />
          </div>

          {map.is_public && (
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

              {map.click_count > 0 && (
                <p className="text-xs text-muted-foreground">
                  This link has been viewed {map.click_count} time
                  {map.click_count !== 1 ? "s" : ""}
                </p>
              )}
            </>
          )}

          {!map.is_public && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
              <Link2 className="h-4 w-4" />
              Enable the public link to share this map
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
