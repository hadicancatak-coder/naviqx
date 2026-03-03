import { useState, useEffect } from "react";
import type { PublicAccessLink } from "@/hooks/usePublicAccess";
import type { AppStoreListing } from "@/domain/app-store";
import type { AppStoreTranslation } from "@/domain/app-store";
import { AppleStorePreview } from "@/components/app-store/AppleStorePreview";
import { GooglePlayPreview } from "@/components/app-store/GooglePlayPreview";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Apple, Play, Check, MessageSquare, Globe } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  accessData: PublicAccessLink;
  listing: AppStoreListing | null | undefined;
  isLoading?: boolean;
}

export function AppStoreReviewContent({ accessData, listing, isLoading }: Props) {
  const [previewStore, setPreviewStore] = useState<"apple" | "google">("apple");
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<"approve" | "request_changes" | null>(null);

  // Translation state
  const [translations, setTranslations] = useState<AppStoreTranslation[]>([]);
  const [selectedLocale, setSelectedLocale] = useState<string | null>(null);

  // Fetch translations for this listing
  useEffect(() => {
    if (!listing?.id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("app_store_translations") as any)
      .select("*")
      .eq("listing_id", listing.id)
      .order("locale")
      .then(({ data }: { data: AppStoreTranslation[] | null }) => {
        setTranslations(data ?? []);
      });
  }, [listing?.id]);

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

  // Build the listing to preview (overlay translation fields if a locale is selected)
  const selectedTranslation = translations.find((t) => t.locale === selectedLocale);
  const previewListing: AppStoreListing = selectedTranslation
    ? {
        ...listing,
        app_name: selectedTranslation.app_name ?? listing.app_name,
        subtitle: selectedTranslation.subtitle ?? listing.subtitle,
        short_description: selectedTranslation.short_description ?? listing.short_description,
        promotional_text: selectedTranslation.promotional_text ?? listing.promotional_text,
        description: selectedTranslation.description ?? listing.description,
        keywords: selectedTranslation.keywords ?? listing.keywords,
        whats_new: selectedTranslation.whats_new ?? listing.whats_new,
      }
    : listing;

  const handleAction = async (action: "approve" | "request_changes") => {
    setSubmitting(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/approve-app-listing`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: accessData.access_token,
            action,
            reviewer_name: accessData.reviewer_name ?? "",
            reviewer_email: accessData.reviewer_email ?? "",
            review_notes: action === "request_changes" ? feedbackText : undefined,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed");
      setSubmitted(action);
      toast.success(action === "approve" ? "Listing approved!" : "Feedback submitted!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-lg">
      <div className="text-center">
        <h2 className="text-heading-md font-semibold text-foreground">{listing.name}</h2>
        <p className="text-body-sm text-muted-foreground mt-xs">
          {listing.store_type === "apple" ? "Apple App Store" : "Google Play Store"} · {selectedLocale ? selectedLocale.toUpperCase() : listing.locale.toUpperCase()}
        </p>
      </div>

      {/* Controls row: store toggle + locale toggle */}
      <div className="flex justify-center gap-md flex-wrap">
        {/* Store toggle */}
        <div className="flex items-center rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setPreviewStore("apple")}
            className={`px-3 py-1.5 text-body-sm font-medium transition-smooth flex items-center gap-1.5 ${
              previewStore === "apple"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-subtle"
            }`}
          >
            <Apple className="h-4 w-4" /> iOS
          </button>
          <button
            onClick={() => setPreviewStore("google")}
            className={`px-3 py-1.5 text-body-sm font-medium transition-smooth flex items-center gap-1.5 ${
              previewStore === "google"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-subtle"
            }`}
          >
            <Play className="h-4 w-4" /> Android
          </button>
        </div>

        {/* Locale toggle (only if translations exist) */}
        {translations.length > 0 && (
          <div className="flex items-center gap-xs rounded-lg border border-border overflow-hidden px-1">
            <Globe className="h-3.5 w-3.5 text-muted-foreground ml-1" />
            <button
              onClick={() => setSelectedLocale(null)}
              className={cn(
                "px-2 py-1.5 text-body-sm font-medium transition-smooth uppercase",
                !selectedLocale
                  ? "bg-primary text-primary-foreground rounded-md"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {listing.locale}
            </button>
            {translations.map((t) => {
              const statusColors: Record<string, string> = {
                draft: "bg-muted",
                ready_for_review: "bg-info",
                approved: "bg-success",
                needs_changes: "bg-warning",
                live: "bg-primary",
              };
              return (
                <button
                  key={t.locale}
                  onClick={() => setSelectedLocale(t.locale)}
                  className={cn(
                    "px-2 py-1.5 text-body-sm font-medium transition-smooth uppercase flex items-center gap-1",
                    selectedLocale === t.locale
                      ? "bg-primary text-primary-foreground rounded-md"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.locale}
                  <span className={cn("w-1.5 h-1.5 rounded-full", statusColors[t.status] ?? "bg-muted")} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="flex justify-center">
        {previewStore === "apple" ? (
          <AppleStorePreview listing={previewListing} />
        ) : (
          <GooglePlayPreview listing={previewListing} />
        )}
      </div>

      {/* Approval actions */}
      {submitted ? (
        <div className="text-center py-lg">
          <div className={`inline-flex items-center gap-sm px-lg py-md rounded-xl ${
            submitted === "approve" ? "bg-success-soft text-success-text" : "bg-warning-soft text-warning-text"
          }`}>
            <Check className="h-5 w-5" />
            <span className="text-body font-medium">
              {submitted === "approve" ? "You approved this listing" : "Your feedback has been submitted"}
            </span>
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto space-y-md">
          {showFeedback && (
            <div className="space-y-sm">
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Describe what needs to change…"
                className="min-h-[100px] text-body-sm"
              />
              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleAction("request_changes")}
                disabled={submitting || !feedbackText.trim()}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {submitting ? "Submitting…" : "Submit Feedback"}
              </Button>
            </div>
          )}
          <div className="flex gap-sm">
            <Button
              className="flex-1"
              onClick={() => handleAction("approve")}
              disabled={submitting}
            >
              <Check className="h-4 w-4 mr-2" />
              {submitting ? "…" : "Approve"}
            </Button>
            {!showFeedback && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowFeedback(true)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Request Changes
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
