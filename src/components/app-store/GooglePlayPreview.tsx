import { useState } from "react";
import type { AppStoreListing } from "@/domain/app-store";
import { Star, Download, ChevronRight, ChevronDown, ChevronUp, Shield } from "lucide-react";
import logoEmblem from "@/assets/cfi-logo-emblem.png";

interface Props {
  listing: AppStoreListing;
}

export function GooglePlayPreview({ listing }: Props) {
  const dir = listing.locale === "ar" ? "rtl" : "ltr";
  const [shortDescExpanded, setShortDescExpanded] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [whatsNewExpanded, setWhatsNewExpanded] = useState(false);

  const filledNotes = (listing.screenshot_notes ?? []).filter((n) => n.trim().length > 0);
  const totalSlots = Math.max(filledNotes.length + 1, 3);
  const slots = Array.from({ length: Math.min(totalSlots, 8) }, (_, i) => filledNotes[i] ?? null);

  return (
    <div className="flex flex-col items-center py-lg">
      {/* Pixel-style frame */}
      <div className="w-[430px] rounded-[36px] border-[4px] border-foreground/20 bg-background shadow-xl overflow-hidden flex flex-col">
        {/* Status bar with punch-hole camera */}
        <div className="h-10 flex items-center justify-center relative flex-shrink-0">
          {/* Punch-hole camera */}
          <div className="w-3 h-3 rounded-full bg-foreground/15 absolute top-3" />
          {/* Status icons */}
          <div className="absolute right-4 top-3 flex gap-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-3.5 h-2.5 rounded-sm bg-foreground/15" />
            ))}
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="h-[860px] overflow-y-auto px-lg pb-lg space-y-sm" dir={dir}>
          {/* App header */}
          <div className="flex items-start gap-sm pt-sm">
            <img src={logoEmblem} alt="App icon" className="w-[72px] h-[72px] rounded-xl shadow-sm" />
            <div className="flex-1 min-w-0">
              <p className="text-body font-semibold text-foreground truncate">{listing.app_name || "App Name"}</p>
              <p className="text-body-sm text-primary">CFI Financial Group</p>
              <div className="flex items-center gap-sm mt-xs">
                <div className="flex items-center gap-xs">
                  <span className="text-body-sm font-medium text-foreground">4.8</span>
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                </div>
                <span className="text-metadata text-muted-foreground">10K+</span>
                <div className="flex items-center gap-xs text-muted-foreground">
                  <Download className="h-3.5 w-3.5" />
                  <span className="text-metadata">100K+</span>
                </div>
              </div>
            </div>
          </div>

          {/* Install button */}
          <button className="w-full bg-primary text-primary-foreground text-body-sm font-medium py-3 rounded-full">
            Install
          </button>

          {/* Screenshots */}
          <div className="space-y-xs">
            <div className="flex gap-sm overflow-x-auto pb-xs">
              {slots.map((note, i) => (
                <div
                  key={i}
                  className="w-[130px] h-[230px] rounded-xl flex-shrink-0 flex items-center justify-center px-xs text-center"
                  style={{
                    background: note
                      ? "linear-gradient(180deg, hsl(var(--muted)), hsl(var(--accent)))"
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

          {/* About this app */}
          <div>
            <div className="flex items-center justify-between mb-xs">
              <h4 className="text-body-sm font-semibold text-foreground">About this app</h4>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className={`text-body-sm text-foreground whitespace-pre-line ${!shortDescExpanded ? "line-clamp-2" : ""}`}>
              {listing.short_description || "Short description…"}
            </p>
            {listing.short_description && listing.short_description.length > 50 && (
              <button
                onClick={() => setShortDescExpanded(!shortDescExpanded)}
                className="text-metadata text-primary font-medium mt-xs cursor-pointer flex items-center gap-0.5"
              >
                {shortDescExpanded ? (<>less <ChevronUp className="h-3 w-3" /></>) : (<>more <ChevronDown className="h-3 w-3" /></>)}
              </button>
            )}
          </div>

          {/* Full description */}
          <div>
            <p className={`text-body-sm text-muted-foreground whitespace-pre-line ${!descExpanded ? "line-clamp-3" : ""}`}>
              {listing.description || "Full description will appear here…"}
            </p>
            {listing.description && listing.description.length > 80 && (
              <button
                onClick={() => setDescExpanded(!descExpanded)}
                className="text-metadata text-primary font-medium mt-xs cursor-pointer flex items-center gap-0.5"
              >
                {descExpanded ? (<>less <ChevronUp className="h-3 w-3" /></>) : (<>more <ChevronDown className="h-3 w-3" /></>)}
              </button>
            )}
          </div>

          {/* Tags */}
          {(listing.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-xs">
              {(listing.tags ?? []).slice(0, 5).map((tag) => (
                <span key={tag} className="text-metadata px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Ratings & Reviews */}
          <div className="space-y-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-body-sm font-semibold text-foreground">Ratings and reviews</h4>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-start gap-md">
              <div className="text-center">
                <span className="text-heading-lg font-bold text-foreground block">4.8</span>
                <div className="flex gap-0.5 mt-0.5">
                  {[1,2,3,4,5].map((i) => (
                    <Star key={i} className={`h-3 w-3 ${i <= 4 ? "fill-primary text-primary" : "fill-primary/40 text-primary/40"}`} />
                  ))}
                </div>
                <span className="text-metadata text-muted-foreground">10.2K</span>
              </div>
              <div className="flex-1 space-y-0.5">
                {[
                  { stars: 5, pct: 78 },
                  { stars: 4, pct: 14 },
                  { stars: 3, pct: 4 },
                  { stars: 2, pct: 2 },
                  { stars: 1, pct: 2 },
                ].map((r) => (
                  <div key={r.stars} className="flex items-center gap-xs">
                    <span className="text-metadata text-muted-foreground w-2 text-right">{r.stars}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${r.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Data safety */}
          <div className="space-y-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-body-sm font-semibold text-foreground">Data safety</h4>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="rounded-lg border border-border p-sm space-y-xs">
              <div className="flex items-center gap-xs">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-metadata text-muted-foreground">No data shared with third parties</span>
              </div>
              <div className="flex items-center gap-xs">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-metadata text-muted-foreground">Data is encrypted in transit</span>
              </div>
            </div>
          </div>

          {/* What's new */}
          {listing.whats_new && (
            <div>
              <h4 className="text-body-sm font-semibold text-foreground mb-xs">What&apos;s new</h4>
              <p className={`text-metadata text-muted-foreground whitespace-pre-line ${!whatsNewExpanded ? "line-clamp-3" : ""}`}>
                {listing.whats_new}
              </p>
              {listing.whats_new.length > 60 && (
                <button
                  onClick={() => setWhatsNewExpanded(!whatsNewExpanded)}
                  className="text-metadata text-primary font-medium mt-xs cursor-pointer flex items-center gap-0.5"
                >
                  {whatsNewExpanded ? (<>less <ChevronUp className="h-3 w-3" /></>) : (<>more <ChevronDown className="h-3 w-3" /></>)}
                </button>
              )}
            </div>
          )}

          {/* Category */}
          {listing.primary_category && (
            <div className="flex items-center gap-xs">
              <span className="text-metadata text-muted-foreground">Category:</span>
              <span className="text-metadata text-primary">{listing.primary_category}</span>
            </div>
          )}
        </div>

        {/* Bottom gesture bar */}
        <div className="h-5 flex justify-center items-center pb-1.5 flex-shrink-0">
          <div className="w-28 h-[4px] rounded-full bg-foreground/20" />
        </div>
      </div>
    </div>
  );
}
