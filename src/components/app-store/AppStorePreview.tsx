import type { AppStoreListing } from "@/domain/app-store";
import { AppleStorePreview } from "./AppleStorePreview";
import { GooglePlayPreview } from "./GooglePlayPreview";

interface Props {
  listing: AppStoreListing;
}

export function AppStorePreview({ listing }: Props) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-sm border-b border-border">
        <h3 className="text-heading-sm font-semibold text-foreground">Preview</h3>
        <p className="text-metadata text-muted-foreground">
          {listing.store_type === "apple" ? "App Store" : "Google Play"} · {listing.locale.toUpperCase()}
        </p>
      </div>
      {listing.store_type === "apple" ? (
        <AppleStorePreview listing={listing} />
      ) : (
        <GooglePlayPreview listing={listing} />
      )}
    </div>
  );
}
