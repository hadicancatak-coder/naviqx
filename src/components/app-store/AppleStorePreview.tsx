import { useState } from "react";
import type { AppStoreListing } from "@/domain/app-store";
import { Star, ChevronRight, Shield } from "lucide-react";
import logoEmblem from "@/assets/cfi-logo-emblem.png";

interface Props {
  listing: AppStoreListing;
}

export function AppleStorePreview({ listing }: Props) {
  const dir = listing.locale === "ar" ? "rtl" : "ltr";
  const [descExpanded, setDescExpanded] = useState(false);
  const [whatsNewExpanded, setWhatsNewExpanded] = useState(false);

  const filledNotes = (listing.screenshot_notes ?? []).filter((n) => n.trim().length > 0);
  const totalSlots = Math.max(filledNotes.length + 1, 3);
  const slots = Array.from({ length: Math.min(totalSlots, 10) }, (_, i) => filledNotes[i] ?? null);

  return (
    <div className="flex flex-col items-center py-lg">
      <div className="w-[340px] rounded-[40px] border-[3px] border-foreground/20 bg-background shadow-xl overflow-hidden flex flex-col">
        {/* Notch */}
        <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
          <div className="w-24 h-6 rounded-full bg-foreground/10" />
        </div>

        {/* Scrollable content area */}
        <div className="h-[620px] overflow-y-auto px-md pb-lg space-y-md" dir={dir}>
          {/* App header */}
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

          {/* GET button */}
          <div className="flex justify-start">
            <div className="bg-primary text-primary-foreground text-metadata font-semibold px-lg py-1.5 rounded-full">GET</div>
          </div>

          {/* Info bar */}
          <div className="flex items-center justify-between border-y border-border py-sm text-center">
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground">Age</p>
              <p className="text-metadata font-semibold text-foreground">4+</p>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground">Category</p>
              <p className="text-metadata font-semibold text-primary truncate px-1">{listing.primary_category || "Finance"}</p>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground">Developer</p>
              <p className="text-metadata font-semibold text-foreground">CFI</p>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground">Size</p>
              <p className="text-metadata font-semibold text-foreground">89 MB</p>
            </div>
          </div>

          {/* Screenshots */}
          <div className="space-y-xs">
            <h4 className="text-body-sm font-semibold text-foreground">Preview</h4>
            <div className="flex gap-xs overflow-x-auto pb-xs">
              {slots.map((note, i) => (
                <div
                  key={i}
                  className="w-[100px] h-[178px] rounded-xl flex-shrink-0 flex items-center justify-center px-xs text-center"
                  style={{
                    background: note
                      ? "linear-gradient(135deg, hsl(var(--muted)), hsl(var(--accent)))"
                      : undefined,
                    backgroundColor: note ? undefined : "hsl(var(--muted))",
                  }}
                >
                  {note ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-medium text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center">{i + 1}</span>
                      <span className="text-metadata text-muted-foreground line-clamp-4">{note}</span>
                    </div>
                  ) : (
                    <span className="text-heading-sm text-muted-foreground/40 font-light">+</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Ratings & Reviews */}
          <div className="space-y-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-body-sm font-semibold text-foreground">Ratings & Reviews</h4>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-sm">
              <span className="text-heading-lg font-bold text-foreground">4.8</span>
              <span className="text-metadata text-muted-foreground">out of 5</span>
            </div>
          </div>

          {/* Promotional text */}
          {listing.promotional_text && (
            <p className="text-body-sm text-foreground whitespace-pre-line">{listing.promotional_text}</p>
          )}

          {/* Description - expandable */}
          <div>
            <p className={`text-body-sm text-foreground whitespace-pre-line ${!descExpanded ? "line-clamp-3" : ""}`}>
              {listing.description || "App description will appear here…"}
            </p>
            {listing.description && listing.description.length > 80 && (
              <button
                onClick={() => setDescExpanded(!descExpanded)}
                className="text-metadata text-primary font-medium mt-xs cursor-pointer"
              >
                {descExpanded ? "less" : "more"}
              </button>
            )}
          </div>

          {/* What's New - expandable */}
          {listing.whats_new && (
            <div>
              <h4 className="text-body-sm font-semibold text-foreground mb-xs">What&apos;s New</h4>
              <p className={`text-metadata text-muted-foreground whitespace-pre-line ${!whatsNewExpanded ? "line-clamp-3" : ""}`}>
                {listing.whats_new}
              </p>
              {listing.whats_new.length > 60 && (
                <button
                  onClick={() => setWhatsNewExpanded(!whatsNewExpanded)}
                  className="text-metadata text-primary font-medium mt-xs cursor-pointer"
                >
                  {whatsNewExpanded ? "less" : "more"}
                </button>
              )}
            </div>
          )}

          {/* Privacy */}
          <div className="space-y-xs">
            <h4 className="text-body-sm font-semibold text-foreground">App Privacy</h4>
            <div className="flex items-center gap-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span className="text-metadata">Developer has not provided privacy details.</span>
            </div>
          </div>
        </div>

        {/* Home indicator */}
        <div className="flex justify-center pb-2 flex-shrink-0">
          <div className="w-28 h-1 rounded-full bg-foreground/20" />
        </div>
      </div>
    </div>
  );
}
