import { useState } from "react";
import type { AppStoreListing } from "@/domain/app-store";
import { AppleStorePreview } from "./AppleStorePreview";
import { GooglePlayPreview } from "./GooglePlayPreview";
import { AppStoreShareDialog } from "./AppStoreShareDialog";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";

interface Props {
  listing: AppStoreListing;
}

export function AppStorePreview({ listing }: Props) {
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-sm border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-heading-sm font-semibold text-foreground">Preview</h3>
          <p className="text-metadata text-muted-foreground">
            {listing.store_type === "apple" ? "App Store" : "Google Play"} · {listing.locale.toUpperCase()}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShareOpen(true)} className="transition-smooth">
          <Share2 className="h-4 w-4 mr-1" />
          Share
        </Button>
      </div>
      {listing.store_type === "apple" ? (
        <AppleStorePreview listing={listing} />
      ) : (
        <GooglePlayPreview listing={listing} />
      )}

      <AppStoreShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        listingId={listing.id}
        listingName={listing.name}
      />
    </div>
  );
}
