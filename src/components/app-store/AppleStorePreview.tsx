import { useState } from "react";
import type { AppStoreListing } from "@/domain/app-store";
import { Star, ChevronRight, ChevronDown, ChevronUp, Shield } from "lucide-react";
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
      {/* iPhone 15 Pro frame */}
      <div className="w-[430px] rounded-[50px] border-[4px] border-foreground/20 bg-background shadow-xl overflow-hidden flex flex-col relative">
        {/* Dynamic Island */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-[120px] h-[35px] rounded-[18px] bg-foreground/90" />
        </div>

        {/* Scrollable content area */}
        <div className="h-[860px] overflow-y-auto px-lg pb-lg space-y-md" dir={dir}>
          {/* App header */}
          <div className="flex items-start gap-sm">
            <img src={logoEmblem} alt="App icon" className="w-[72px] h-[72px] rounded-2xl shadow-sm" />
            <div className="flex-1 min-w-0">
              <p className="text-body font-semibold text-foreground truncate">{listing.app_name || "App Name"}</p>
              <p className="text-body-sm text-muted-foreground truncate">{listing.subtitle || "Subtitle"}</p>
              <div className="flex items-center gap-xs mt-xs">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-warning text-warning" />
                ))}
                <span className="text-metadata text-muted-foreground">4.8</span>
              </div>
            </div>
          </div>

          {/* GET button */}
          <div className="flex justify-start">
            <div className="bg-primary text-primary-foreground text-body-sm font-semibold px-xl py-2 rounded-full">GET</div>
          </div>

          {/* Info bar */}
          <div className="flex items-center justify-between border-y border-border py-sm text-center">
            <div className="flex-1">
              <p className="text-[11px] text-muted-foreground">Age</p>
              <p className="text-body-sm font-semibold text-foreground">4+</p>
            </div>
            <div className="w-px h-7 bg-border" />
            <div className="flex-1">
              <p className="text-[11px] text-muted-foreground">Category</p>
              <p className="text-body-sm font-semibold text-primary truncate px-1">{listing.primary_category || "Finance"}</p>
            </div>
            <div className="w-px h-7 bg-border" />
            <div className="flex-1">
              <p className="text-[11px] text-muted-foreground">Developer</p>
              <p className="text-body-sm font-semibold text-foreground">CFI</p>
            </div>
            <div className="w-px h-7 bg-border" />
            <div className="flex-1">
              <p className="text-[11px] text-muted-foreground">Size</p>
              <p className="text-body-sm font-semibold text-foreground">89 MB</p>
            </div>
          </div>

          {/* Screenshots */}
          <div className="space-y-xs">
            <h4 className="text-body-sm font-semibold text-foreground">Preview</h4>
            <div className="flex gap-sm overflow-x-auto pb-xs">
              {slots.map((note, i) => (
                <div
                  key={i}
                  className="w-[120px] h-[214px] rounded-xl flex-shrink-0 flex items-center justify-center px-xs text-center"
                  style={{
                    background: note
                      ? "linear-gradient(135deg, hsl(var(--muted)), hsl(var(--accent)))"
                      : undefined,
                    backgroundColor: note ? undefined : "hsl(var(--muted))",
                  }}
                >
                  {note ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[11px] font-medium text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center">{i + 1}</span>
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

          {/* Description - expandable at 255 chars */}
          <div>
            <p className="text-body-sm text-foreground whitespace-pre-line">
              {listing.description
                ? descExpanded
                  ? listing.description
                  : listing.description.slice(0, 255)
                : "App description will appear here…"}
              {!descExpanded && listing.description && listing.description.length > 255 && "…"}
            </p>
            {listing.description && listing.description.length > 255 && (
              <button
                onClick={() => setDescExpanded(!descExpanded)}
                className="text-metadata text-primary font-medium mt-xs cursor-pointer flex items-center gap-0.5"
              >
                {descExpanded ? (<>less <ChevronUp className="h-3 w-3" /></>) : (<>more <ChevronDown className="h-3 w-3" /></>)}
              </button>
            )}
          </div>

          {/* What's New - expandable */}
          {listing.whats_new && (
            <div>
              <h4 className="text-body-sm font-semibold text-foreground mb-xs">What&apos;s New</h4>
              <p className="text-metadata text-muted-foreground whitespace-pre-line">
                {whatsNewExpanded ? listing.whats_new : listing.whats_new.slice(0, 255)}
                {!whatsNewExpanded && listing.whats_new.length > 255 && "…"}
              </p>
              {listing.whats_new.length > 255 && (
                <button
                  onClick={() => setWhatsNewExpanded(!whatsNewExpanded)}
                  className="text-metadata text-primary font-medium mt-xs cursor-pointer flex items-center gap-0.5"
                >
                  {whatsNewExpanded ? (<>less <ChevronUp className="h-3 w-3" /></>) : (<>more <ChevronDown className="h-3 w-3" /></>)}
                </button>
              )}
            </div>
          )}

          {/* Privacy */}
          <div className="space-y-xs">
            <h4 className="text-body-sm font-semibold text-foreground">App Privacy</h4>
            <div className="flex items-center gap-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              <span className="text-metadata">Developer has not provided privacy details.</span>
            </div>
          </div>
        </div>

        {/* Home indicator */}
        <div className="flex justify-center pb-2.5 flex-shrink-0">
          <div className="w-32 h-[5px] rounded-full bg-foreground/20" />
        </div>
      </div>
    </div>
  );
}
