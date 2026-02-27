import type { PublicAccessLink } from "@/hooks/usePublicAccess";
import type { AppStoreListing } from "@/domain/app-store";
import { AppleStorePreview } from "@/components/app-store/AppleStorePreview";
import { GooglePlayPreview } from "@/components/app-store/GooglePlayPreview";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  accessData: PublicAccessLink;
  listing: AppStoreListing | null | undefined;
  isLoading?: boolean;
}

export function AppStoreReviewContent({ listing, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[500px] w-[300px] mx-auto rounded-[36px]" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Listing not found or no longer available.
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      <div className="text-center">
        <h2 className="text-heading-md font-semibold text-foreground">{listing.name}</h2>
        <p className="text-body-sm text-muted-foreground mt-xs">
          {listing.store_type === "apple" ? "Apple App Store" : "Google Play Store"} · {listing.locale.toUpperCase()}
        </p>
      </div>

      <div className="flex justify-center">
        {listing.store_type === "apple" ? (
          <AppleStorePreview listing={listing} />
        ) : (
          <GooglePlayPreview listing={listing} />
        )}
      </div>
    </div>
  );
}
