import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Megaphone } from "lucide-react";
import { AdSelectorDialog } from "./AdSelectorDialog";

interface AttachedAdsSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attachedAds: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAdsChange: (ads: any[]) => void;
  editable?: boolean;
}

export function AttachedAdsSection({ attachedAds, onAdsChange, editable = true }: AttachedAdsSectionProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);

  const handleRemoveAd = (adId: string) => {
    onAdsChange(attachedAds.filter((ad) => ad.id !== adId));
  };

  const handleAddAds = (selectedAds: any[]) => {
    // Merge with existing, avoid duplicates
    const existingIds = attachedAds.map((ad) => ad.id);
    const newAds = selectedAds.filter((ad) => !existingIds.includes(ad.id));
    onAdsChange([...attachedAds, ...newAds]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Attached Ads</h4>
          <Badge variant="secondary">{attachedAds.length}</Badge>
        </div>
        {editable && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectorOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Ads
          </Button>
        )}
      </div>

      {attachedAds.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg border-dashed">
          No ads attached to this campaign
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {attachedAds.map((ad) => (
            <Card key={ad.id} className="p-3 relative">
              {editable && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => handleRemoveAd(ad.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {ad.ad_type || "PPC"}
                  </Badge>
                  <Badge
                    variant={
                      ad.status === "approved"
                        ? "default"
                        : ad.status === "rejected"
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {ad.status}
                  </Badge>
                </div>
                <h5 className="font-medium text-sm line-clamp-1">{ad.headline || "Untitled Ad"}</h5>
                {ad.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{ad.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{ad.language || "EN"}</span>
                  {ad.entity && ad.entity.length > 0 && (
                    <>
                      <span>•</span>
                      <span>{ad.entity.join(", ")}</span>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AdSelectorDialog
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onSelectAds={handleAddAds}
        excludeIds={attachedAds.map((ad) => ad.id)}
      />
    </div>
  );
}
