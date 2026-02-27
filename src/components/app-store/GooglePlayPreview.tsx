import type { AppStoreListing } from "@/domain/app-store";
import { Star, Download } from "lucide-react";
import logoEmblem from "@/assets/cfi-logo-emblem.png";

interface Props {
  listing: AppStoreListing;
}

export function GooglePlayPreview({ listing }: Props) {
  const dir = listing.locale === "ar" ? "rtl" : "ltr";
  const screenshotSlots = Array.from({ length: 8 }, (_, i) => listing.screenshot_notes?.[i] ?? `Screenshot ${i + 1}`);

  return (
    <div className="flex flex-col items-center py-lg">
      <div className="w-[300px] rounded-[28px] border-[3px] border-foreground/20 bg-background shadow-xl overflow-hidden">
        <div className="h-6 bg-foreground/5 flex items-center justify-end px-sm">
          <div className="flex gap-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-3 h-2 rounded-sm bg-foreground/20" />
            ))}
          </div>
        </div>

        <div className="px-md pb-lg space-y-sm" dir={dir}>
          <div className="flex items-start gap-sm pt-sm">
            <img src={logoEmblem} alt="App icon" className="w-14 h-14 rounded-xl shadow-sm" />
            <div className="flex-1 min-w-0">
              <p className="text-body font-semibold text-foreground truncate">{listing.app_name || "App Name"}</p>
              <p className="text-metadata text-primary">CFI Financial Group</p>
              <div className="flex items-center gap-sm mt-xs">
                <div className="flex items-center gap-xs">
                  <span className="text-metadata font-medium text-foreground">4.8</span>
                  <Star className="h-3 w-3 fill-warning text-warning" />
                </div>
                <span className="text-metadata text-muted-foreground">10K+ reviews</span>
                <div className="flex items-center gap-xs text-muted-foreground">
                  <Download className="h-3 w-3" />
                  <span className="text-metadata">100K+</span>
                </div>
              </div>
            </div>
          </div>

          <button className="w-full bg-primary text-primary-foreground text-body-sm font-medium py-2 rounded-lg">Install</button>

          <div className="w-full h-[140px] rounded-lg bg-muted flex items-center justify-center">
            <span className="text-metadata text-muted-foreground">Feature Graphic</span>
          </div>

          <div className="space-y-xs">
            <h4 className="text-body-sm font-semibold text-foreground">Screenshots</h4>
            <div className="flex gap-xs overflow-x-auto pb-xs">
              {screenshotSlots.map((label, i) => (
                <div
                  key={i}
                  className="w-[100px] h-[180px] rounded-lg bg-muted flex-shrink-0 flex items-center justify-center px-xs text-center"
                >
                  <span className="text-metadata text-muted-foreground line-clamp-3">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-body-sm font-semibold text-foreground mb-xs">About this app</h4>
            <p className="text-body-sm text-foreground line-clamp-2">{listing.short_description || "Short description…"}</p>
          </div>

          <p className="text-metadata text-muted-foreground line-clamp-3">{listing.description || "Full description will appear here…"}</p>

          {(listing.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-xs">
              {(listing.tags ?? []).slice(0, 5).map((tag) => (
                <span key={tag} className="text-metadata px-2 py-1 rounded-full bg-muted text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {listing.whats_new && (
            <div>
              <h4 className="text-body-sm font-semibold text-foreground mb-xs">What&apos;s new</h4>
              <p className="text-metadata text-muted-foreground line-clamp-3">{listing.whats_new}</p>
            </div>
          )}

          {listing.primary_category && (
            <div className="flex items-center gap-xs">
              <span className="text-metadata text-muted-foreground">Category:</span>
              <span className="text-metadata text-primary">{listing.primary_category}</span>
            </div>
          )}
        </div>

        <div className="h-4 flex justify-center items-center pb-1">
          <div className="w-24 h-1 rounded-full bg-foreground/20" />
        </div>
      </div>
    </div>
  );
}
