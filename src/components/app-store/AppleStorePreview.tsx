import type { AppStoreListing } from "@/domain/app-store";
import { Star, PlayCircle } from "lucide-react";
import logoEmblem from "@/assets/cfi-logo-emblem.png";

interface Props {
  listing: AppStoreListing;
}

export function AppleStorePreview({ listing }: Props) {
  const dir = listing.locale === "ar" ? "rtl" : "ltr";
  const screenshotSlots = Array.from({ length: 10 }, (_, i) => listing.screenshot_notes?.[i] ?? `Screenshot ${i + 1}`);
  const appPreviewSlots = Array.from({ length: 3 }, (_, i) => `App Preview ${i + 1}`);

  return (
    <div className="flex flex-col items-center py-lg">
      <div className="w-[300px] rounded-[36px] border-[3px] border-foreground/20 bg-background shadow-xl overflow-hidden">
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-20 h-5 rounded-full bg-foreground/10" />
        </div>

        <div className="px-md pb-lg space-y-md" dir={dir}>
          <div className="flex items-start gap-sm">
            <img src={logoEmblem} alt="App icon" className="w-16 h-16 rounded-2xl shadow-sm" />
            <div className="flex-1 min-w-0">
              <p className="text-body font-semibold text-foreground truncate">{listing.app_name || "App Name"}</p>
              <p className="text-metadata text-muted-foreground truncate">{listing.subtitle || "Subtitle"}</p>
              <div className="flex items-center gap-xs mt-xs">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-3 w-3 fill-warning text-warning" />
                ))}
                <span className="text-metadata text-muted-foreground">4.8</span>
              </div>
            </div>
          </div>

          <div className="flex justify-start">
            <div className="bg-primary text-primary-foreground text-metadata font-semibold px-lg py-1 rounded-full">GET</div>
          </div>

          <div className="space-y-xs">
            <h4 className="text-body-sm font-semibold text-foreground">Screenshots</h4>
            <div className="flex gap-xs overflow-x-auto pb-xs">
              {screenshotSlots.map((label, i) => (
                <div
                  key={i}
                  className="w-[88px] h-[156px] rounded-lg bg-muted flex-shrink-0 flex items-center justify-center px-xs text-center"
                >
                  <span className="text-metadata text-muted-foreground line-clamp-3">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-xs">
            <h4 className="text-body-sm font-semibold text-foreground">App Previews</h4>
            <div className="flex gap-xs overflow-x-auto pb-xs">
              {appPreviewSlots.map((label) => (
                <div key={label} className="w-[140px] h-[78px] rounded-lg bg-muted flex-shrink-0 flex items-center justify-center gap-xs">
                  <PlayCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-metadata text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {listing.promotional_text && <p className="text-body-sm text-foreground">{listing.promotional_text}</p>}

          <div>
            <p className="text-body-sm text-foreground line-clamp-3">{listing.description || "App description will appear here…"}</p>
            <button className="text-metadata text-primary font-medium mt-xs">more</button>
          </div>

          {listing.whats_new && (
            <div>
              <h4 className="text-body-sm font-semibold text-foreground mb-xs">What&apos;s New</h4>
              <p className="text-metadata text-muted-foreground line-clamp-3">{listing.whats_new}</p>
            </div>
          )}

          {listing.keywords && (
            <div>
              <h4 className="text-body-sm font-semibold text-foreground mb-xs">Keywords</h4>
              <p className="text-metadata text-muted-foreground">{listing.keywords}</p>
            </div>
          )}

          {listing.primary_category && (
            <div className="flex items-center gap-xs">
              <span className="text-metadata text-muted-foreground">Category:</span>
              <span className="text-metadata text-primary">{listing.primary_category}</span>
            </div>
          )}
        </div>

        <div className="flex justify-center pb-2">
          <div className="w-28 h-1 rounded-full bg-foreground/20" />
        </div>
      </div>
    </div>
  );
}
