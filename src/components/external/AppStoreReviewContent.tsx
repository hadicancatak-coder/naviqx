import { useState, useEffect, useCallback, useRef } from "react";
import type { PublicAccessLink } from "@/hooks/usePublicAccess";
import type { AppStoreListing, AppStoreTranslation } from "@/domain/app-store";
import { FIELD_LIMITS, TRANSLATION_LOCALES } from "@/domain/app-store";
import { AppleStorePreview } from "@/components/app-store/AppleStorePreview";
import { GooglePlayPreview } from "@/components/app-store/GooglePlayPreview";
import { AppStoreFieldCounter } from "@/components/app-store/AppStoreFieldCounter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Apple, Play, Check, MessageSquare, Globe, Languages, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  accessData: PublicAccessLink;
  listing: AppStoreListing | null | undefined;
  isLoading?: boolean;
}

type TranslationDraft = {
  app_name: string;
  subtitle: string;
  short_description: string;
  promotional_text: string;
  description: string;
  keywords: string;
  whats_new: string;
};

function buildDraft(t: AppStoreTranslation | null): TranslationDraft {
  return {
    app_name: t?.app_name ?? "",
    subtitle: t?.subtitle ?? "",
    short_description: t?.short_description ?? "",
    promotional_text: t?.promotional_text ?? "",
    description: t?.description ?? "",
    keywords: t?.keywords ?? "",
    whats_new: t?.whats_new ?? "",
  };
}

function ExternalSideBySideField({
  label,
  originalValue,
  translatedValue,
  onChange,
  maxLength,
  multiline = false,
}: {
  label: string;
  originalValue: string;
  translatedValue: string;
  onChange: (v: string) => void;
  maxLength: number;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-xs">
      <div className="flex items-center justify-between">
        <Label className="text-metadata font-medium text-muted-foreground">{label}</Label>
        <AppStoreFieldCounter current={translatedValue.length} max={maxLength} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
        <div className="relative">
          <div className="absolute top-1 right-1">
            <Badge variant="outline" className="text-[10px] px-1 py-0 opacity-60">Original</Badge>
          </div>
          {multiline ? (
            <div className="w-full min-h-[100px] rounded-lg border border-border bg-muted/30 px-sm py-sm text-body-sm text-muted-foreground whitespace-pre-wrap break-words">
              {originalValue || <span className="italic opacity-50">Empty</span>}
            </div>
          ) : (
            <div className="w-full rounded-lg border border-border bg-muted/30 px-sm py-sm text-body-sm text-muted-foreground truncate">
              {originalValue || <span className="italic opacity-50">Empty</span>}
            </div>
          )}
        </div>
        <div>
          {multiline ? (
            <Textarea
              value={translatedValue}
              onChange={(e) => onChange(e.target.value)}
              maxLength={maxLength}
              placeholder={originalValue || "Translation…"}
              className="text-body-sm min-h-[100px]"
              dir="auto"
            />
          ) : (
            <Input
              value={translatedValue}
              onChange={(e) => onChange(e.target.value)}
              maxLength={maxLength}
              placeholder={originalValue || "Translation…"}
              className="text-body-sm"
              dir="auto"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function AppStoreReviewContent({ accessData, listing, isLoading }: Props) {
  const [previewStore, setPreviewStore] = useState<"apple" | "google">("apple");
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<"approve" | "request_changes" | null>(null);

  // Mode: preview or translate
  const [mode, setMode] = useState<"preview" | "translate">("preview");

  // Translation state
  const [translations, setTranslations] = useState<AppStoreTranslation[]>([]);
  const [selectedLocale, setSelectedLocale] = useState<string | null>(null);

  // Translation editing state
  const [translateLocale, setTranslateLocale] = useState<string>("");
  const [draft, setDraft] = useState<TranslationDraft>(buildDraft(null));
  const [translationSubmitting, setTranslationSubmitting] = useState(false);
  const [translationSubmitted, setTranslationSubmitted] = useState(false);

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

  // When translate locale changes, load existing translation draft
  useEffect(() => {
    if (!translateLocale) {
      setDraft(buildDraft(null));
      return;
    }
    const existing = translations.find((t) => t.locale === translateLocale);
    setDraft(buildDraft(existing ?? null));
  }, [translateLocale, translations]);

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

  const handleSubmitTranslation = async () => {
    if (!translateLocale) {
      toast.error("Please select a locale");
      return;
    }

    if (!accessData.reviewer_email) {
      toast.error("Please identify yourself first (use the header bar)");
      return;
    }

    setTranslationSubmitting(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/submit-app-translation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: accessData.access_token,
            locale: translateLocale,
            translator_email: accessData.reviewer_email,
            translator_name: accessData.reviewer_name ?? "",
            ...draft,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit translation");
      }

      setTranslationSubmitted(true);
      toast.success("Translation submitted for review!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit translation");
    } finally {
      setTranslationSubmitting(false);
    }
  };

  const isApple = listing.store_type === "apple";
  const limits = isApple ? FIELD_LIMITS.apple : FIELD_LIMITS.google_play;

  return (
    <div className="space-y-lg">
      <div className="text-center">
        <h2 className="text-heading-md font-semibold text-foreground">{listing.name}</h2>
        <p className="text-body-sm text-muted-foreground mt-xs">
          {listing.store_type === "apple" ? "Apple App Store" : "Google Play Store"} · {selectedLocale ? selectedLocale.toUpperCase() : listing.locale.toUpperCase()}
        </p>
      </div>

      {/* Mode toggle: Preview / Translate */}
      <div className="flex justify-center">
        <div className="flex items-center rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setMode("preview")}
            className={cn(
              "px-4 py-2 text-body-sm font-medium transition-smooth flex items-center gap-1.5",
              mode === "preview"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-subtle"
            )}
          >
            <Apple className="h-4 w-4" /> Preview & Review
          </button>
          <button
            onClick={() => setMode("translate")}
            className={cn(
              "px-4 py-2 text-body-sm font-medium transition-smooth flex items-center gap-1.5",
              mode === "translate"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-subtle"
            )}
          >
            <Languages className="h-4 w-4" /> Translate
          </button>
        </div>
      </div>

      {mode === "preview" ? (
        <>
          {/* Controls row: store toggle + locale toggle */}
          <div className="flex justify-center gap-md flex-wrap">
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
        </>
      ) : (
        /* Translate mode */
        <div className="max-w-3xl mx-auto space-y-lg">
          {/* Identification check */}
          {!accessData.reviewer_email ? (
            <div className="text-center py-lg bg-warning-soft border border-warning/30 rounded-xl px-lg">
              <Languages className="h-8 w-8 text-warning-text mx-auto mb-sm" />
              <p className="text-body font-medium text-warning-text">
                Please identify yourself first
              </p>
              <p className="text-body-sm text-warning-text/80 mt-xs">
                Use the "Identify Yourself" button in the header to enter your name and work email before translating.
              </p>
            </div>
          ) : translationSubmitted ? (
            <div className="text-center py-lg">
              <div className="inline-flex items-center gap-sm px-lg py-md rounded-xl bg-success-soft text-success-text">
                <Check className="h-5 w-5" />
                <span className="text-body font-medium">Translation submitted for review!</span>
              </div>
              <p className="text-body-sm text-muted-foreground mt-md">
                Your translation has been saved. The team will review it shortly.
              </p>
              <Button
                variant="outline"
                className="mt-md"
                onClick={() => {
                  setTranslationSubmitted(false);
                  setDraft(buildDraft(null));
                  setTranslateLocale("");
                }}
              >
                Translate another locale
              </Button>
            </div>
          ) : (
            <>
              {/* Locale selector */}
              <div className="flex items-center gap-md justify-center">
                <Label className="text-body-sm font-medium text-foreground">Target Language:</Label>
                <Select value={translateLocale} onValueChange={setTranslateLocale}>
                  <SelectTrigger className="text-body-sm w-auto min-w-[180px]">
                    <SelectValue placeholder="Select locale…" />
                  </SelectTrigger>
                  <SelectContent className="liquid-glass-dropdown">
                    {TRANSLATION_LOCALES.map((l) => (
                      <SelectItem key={l.value} value={l.value} className="text-body-sm">
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {translateLocale ? (
                <div className="space-y-md">
                  <ExternalSideBySideField
                    label="App Name"
                    originalValue={listing.app_name ?? ""}
                    translatedValue={draft.app_name}
                    onChange={(v) => setDraft((p) => ({ ...p, app_name: v }))}
                    maxLength={limits.app_name}
                  />

                  {isApple && (
                    <ExternalSideBySideField
                      label="Subtitle"
                      originalValue={listing.subtitle ?? ""}
                      translatedValue={draft.subtitle}
                      onChange={(v) => setDraft((p) => ({ ...p, subtitle: v }))}
                      maxLength={FIELD_LIMITS.apple.subtitle}
                    />
                  )}

                  {!isApple && (
                    <ExternalSideBySideField
                      label="Short Description"
                      originalValue={listing.short_description ?? ""}
                      translatedValue={draft.short_description}
                      onChange={(v) => setDraft((p) => ({ ...p, short_description: v }))}
                      maxLength={FIELD_LIMITS.google_play.short_description}
                      multiline
                    />
                  )}

                  {isApple && (
                    <ExternalSideBySideField
                      label="Promotional Text"
                      originalValue={listing.promotional_text ?? ""}
                      translatedValue={draft.promotional_text}
                      onChange={(v) => setDraft((p) => ({ ...p, promotional_text: v }))}
                      maxLength={FIELD_LIMITS.apple.promotional_text}
                      multiline
                    />
                  )}

                  <ExternalSideBySideField
                    label={isApple ? "Description" : "Full Description"}
                    originalValue={listing.description ?? ""}
                    translatedValue={draft.description}
                    onChange={(v) => setDraft((p) => ({ ...p, description: v }))}
                    maxLength={limits.description}
                    multiline
                  />

                  {isApple && (
                    <ExternalSideBySideField
                      label="Keywords"
                      originalValue={listing.keywords ?? ""}
                      translatedValue={draft.keywords}
                      onChange={(v) => setDraft((p) => ({ ...p, keywords: v }))}
                      maxLength={FIELD_LIMITS.apple.keywords}
                    />
                  )}

                  <ExternalSideBySideField
                    label="What's New"
                    originalValue={listing.whats_new ?? ""}
                    translatedValue={draft.whats_new}
                    onChange={(v) => setDraft((p) => ({ ...p, whats_new: v }))}
                    maxLength={isApple ? FIELD_LIMITS.apple.whats_new : FIELD_LIMITS.google_play.whats_new}
                    multiline
                  />

                  <div className="flex justify-end pt-md">
                    <Button
                      onClick={handleSubmitTranslation}
                      disabled={translationSubmitting}
                      className="min-w-[200px]"
                    >
                      {translationSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting…
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Submit Translation
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-lg text-muted-foreground text-body-sm">
                  Select a target language to start translating
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
