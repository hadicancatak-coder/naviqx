import { useState, useMemo } from "react";
import type { AppStoreListing } from "@/domain/app-store";
import { AppleStorePreview } from "./AppleStorePreview";
import { GooglePlayPreview } from "./GooglePlayPreview";
import { AppStoreShareDialog } from "./AppStoreShareDialog";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";

interface Props {
  listing: AppStoreListing;
}

function getCompleteness(listing: AppStoreListing) {
  if (listing.store_type === "apple") {
    const fields = [
      listing.app_name,
      listing.subtitle,
      listing.promotional_text,
      listing.description,
      listing.keywords,
      listing.whats_new,
      listing.primary_category,
      listing.secondary_category,
      (listing.screenshot_notes ?? []).length > 0 ? "filled" : null,
    ];
    const filled = fields.filter(Boolean).length;
    return { filled, total: fields.length };
  }
  // Google Play: no secondary_category field in editor, so exclude it
  const fields = [
    listing.app_name,
    listing.short_description,
    listing.description,
    listing.whats_new,
    listing.primary_category,
    (listing.tags ?? []).length > 0 ? "filled" : null,
    (listing.screenshot_notes ?? []).length > 0 ? "filled" : null,
  ];
  const filled = fields.filter(Boolean).length;
  return { filled, total: fields.length };
}

export function AppStorePreview({ listing }: Props) {
  const [shareOpen, setShareOpen] = useState(false);
  const completeness = useMemo(() => getCompleteness(listing), [listing]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-sm border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-heading-sm font-semibold text-foreground">Preview</h3>
          <div className="flex items-center gap-sm">
            <p className="text-metadata text-muted-foreground">
              {listing.store_type === "apple" ? "App Store" : "Google Play"} · {listing.locale.toUpperCase()}
            </p>
            <span className="text-metadata font-medium text-primary">
              {completeness.filled}/{completeness.total} fields
            </span>
          </div>
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
