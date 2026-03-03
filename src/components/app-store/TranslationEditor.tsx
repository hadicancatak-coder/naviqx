import { useState, useCallback, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppStoreFieldCounter } from "./AppStoreFieldCounter";
import { FIELD_LIMITS, LISTING_STATUSES, TRANSLATION_LOCALES } from "@/domain/app-store";
import type { AppStoreListing, AppStoreTranslation, ListingStatus } from "@/domain/app-store";
import { useAppStoreTranslations } from "@/hooks/useAppStoreTranslations";
import { Plus, Globe, Trash2, Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  listing: AppStoreListing;
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

function SideBySideField({
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
      <div className="grid grid-cols-2 gap-sm">
        {/* Original (read-only) */}
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
        {/* Translation (editable) */}
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

export function TranslationEditor({ listing }: Props) {
  const { translations, isLoading, upsertTranslation, deleteTranslation } = useAppStoreTranslations(listing.id);
  const [selectedLocale, setSelectedLocale] = useState<string | null>(null);
  const [draft, setDraft] = useState<TranslationDraft>(buildDraft(null));
  const [addingLocale, setAddingLocale] = useState<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingRef = useRef<Partial<AppStoreTranslation> | null>(null);

  const isApple = listing.store_type === "apple";
  const limits = isApple ? FIELD_LIMITS.apple : FIELD_LIMITS.google_play;

  const selectedTranslation = translations.find((t) => t.locale === selectedLocale) ?? null;
  const availableLocales = TRANSLATION_LOCALES.filter(
    (l) => !translations.some((t) => t.locale === l.value)
  );

  // Sync draft when selection changes
  useEffect(() => {
    setDraft(buildDraft(selectedTranslation));
  }, [selectedTranslation?.id, selectedLocale]);

  const scheduleSave = useCallback(
    (newDraft: TranslationDraft) => {
      if (!selectedLocale) return;
      const toNull = (v: string) => (v.trim() ? v : null);
      const payload: Partial<AppStoreTranslation> = {
        app_name: toNull(newDraft.app_name),
        subtitle: toNull(newDraft.subtitle),
        short_description: toNull(newDraft.short_description),
        promotional_text: toNull(newDraft.promotional_text),
        description: toNull(newDraft.description),
        keywords: toNull(newDraft.keywords),
        whats_new: toNull(newDraft.whats_new),
      };
      pendingRef.current = payload;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (pendingRef.current) {
          upsertTranslation.mutate({
            listing_id: listing.id,
            locale: selectedLocale,
            ...pendingRef.current,
          });
          pendingRef.current = null;
        }
      }, 800);
    },
    [selectedLocale, listing.id, upsertTranslation]
  );

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (pendingRef.current && selectedLocale) {
        upsertTranslation.mutate({
          listing_id: listing.id,
          locale: selectedLocale,
          ...pendingRef.current,
        });
        pendingRef.current = null;
      }
    };
  }, [selectedLocale, listing.id, upsertTranslation]);

  const updateField = useCallback(
    (field: keyof TranslationDraft, value: string) => {
      setDraft((prev) => {
        const next = { ...prev, [field]: value };
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  const handleAddLocale = () => {
    if (!addingLocale) return;
    upsertTranslation.mutate(
      { listing_id: listing.id, locale: addingLocale, status: "draft" as ListingStatus },
      { onSuccess: () => { setSelectedLocale(addingLocale); setAddingLocale(""); } }
    );
  };

  const handleStatusChange = (status: ListingStatus) => {
    if (!selectedLocale) return;
    upsertTranslation.mutate({
      listing_id: listing.id,
      locale: selectedLocale,
      status,
    });
  };

  const handleDeleteTranslation = () => {
    if (!selectedTranslation) return;
    deleteTranslation.mutate(selectedTranslation.id, {
      onSuccess: () => setSelectedLocale(null),
    });
  };

  const isSaving = upsertTranslation.isPending;
  const saveError = upsertTranslation.isError;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-body-sm">
        Loading translations…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header: locale tabs + add */}
      <div className="p-sm border-b border-border space-y-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-xs">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-heading-sm font-semibold text-foreground">Translations</h3>
          </div>
          {selectedLocale && (
            <div className="flex items-center gap-xs text-metadata shrink-0">
              {saveError && <AlertCircle className="h-3 w-3 text-destructive" />}
              {isSaving && <Loader2 className="h-3 w-3 text-muted-foreground animate-spin" />}
              {!isSaving && !saveError && <Check className="h-3 w-3 text-success" />}
              <span className={cn(
                "text-metadata",
                saveError ? "text-destructive" : isSaving ? "text-muted-foreground" : "text-success"
              )}>
                {saveError ? "Failed" : isSaving ? "Saving…" : "Saved"}
              </span>
            </div>
          )}
        </div>

        {/* Locale pills */}
        <div className="flex items-center gap-xs flex-wrap">
          {translations.map((t) => {
            const statusCfg: Record<string, string> = {
              draft: "status-neutral",
              ready_for_review: "status-info",
              approved: "status-success",
              needs_changes: "status-warning",
              live: "status-cyan",
            };
            return (
              <button
                key={t.locale}
                onClick={() => setSelectedLocale(t.locale)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md text-metadata font-medium transition-smooth",
                  selectedLocale === t.locale
                    ? "bg-primary/10 border border-primary/30 text-foreground"
                    : "border border-transparent hover:bg-card-hover text-muted-foreground"
                )}
              >
                <span className="uppercase">{t.locale}</span>
                <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg[t.status] ?? "status-neutral")} />
              </button>
            );
          })}

          {/* Add locale */}
          {availableLocales.length > 0 && (
            <div className="flex items-center gap-xs">
              <Select value={addingLocale} onValueChange={setAddingLocale}>
                <SelectTrigger className="text-metadata h-7 w-auto min-w-[100px]">
                  <SelectValue placeholder="Add locale…" />
                </SelectTrigger>
                <SelectContent className="liquid-glass-dropdown">
                  {availableLocales.map((l) => (
                    <SelectItem key={l.value} value={l.value} className="text-metadata">{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-7 px-2" onClick={handleAddLocale} disabled={!addingLocale}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Editor body */}
      {selectedLocale && selectedTranslation ? (
        <div className="flex-1 overflow-y-auto p-md space-y-md">
          {/* Status + delete row */}
          <div className="flex items-center justify-between">
            <Select value={selectedTranslation.status} onValueChange={(v) => handleStatusChange(v as ListingStatus)}>
              <SelectTrigger className="text-metadata h-7 w-auto min-w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="liquid-glass-dropdown">
                {LISTING_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-metadata">{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDeleteTranslation}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
            </Button>
          </div>

          {/* Side-by-side fields */}
          <SideBySideField
            label="App Name"
            originalValue={listing.app_name ?? ""}
            translatedValue={draft.app_name}
            onChange={(v) => updateField("app_name", v)}
            maxLength={limits.app_name}
          />

          {isApple && (
            <SideBySideField
              label="Subtitle"
              originalValue={listing.subtitle ?? ""}
              translatedValue={draft.subtitle}
              onChange={(v) => updateField("subtitle", v)}
              maxLength={FIELD_LIMITS.apple.subtitle}
            />
          )}

          {!isApple && (
            <SideBySideField
              label="Short Description"
              originalValue={listing.short_description ?? ""}
              translatedValue={draft.short_description}
              onChange={(v) => updateField("short_description", v)}
              maxLength={FIELD_LIMITS.google_play.short_description}
              multiline
            />
          )}

          {isApple && (
            <SideBySideField
              label="Promotional Text"
              originalValue={listing.promotional_text ?? ""}
              translatedValue={draft.promotional_text}
              onChange={(v) => updateField("promotional_text", v)}
              maxLength={FIELD_LIMITS.apple.promotional_text}
              multiline
            />
          )}

          <SideBySideField
            label={isApple ? "Description" : "Full Description"}
            originalValue={listing.description ?? ""}
            translatedValue={draft.description}
            onChange={(v) => updateField("description", v)}
            maxLength={limits.description}
            multiline
          />

          {isApple && (
            <SideBySideField
              label="Keywords"
              originalValue={listing.keywords ?? ""}
              translatedValue={draft.keywords}
              onChange={(v) => updateField("keywords", v)}
              maxLength={FIELD_LIMITS.apple.keywords}
            />
          )}

          <SideBySideField
            label="What's New"
            originalValue={listing.whats_new ?? ""}
            translatedValue={draft.whats_new}
            onChange={(v) => updateField("whats_new", v)}
            maxLength={isApple ? FIELD_LIMITS.apple.whats_new : FIELD_LIMITS.google_play.whats_new}
            multiline
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-body-sm px-lg text-center">
          {translations.length === 0
            ? "Add a locale above to start translating this listing"
            : "Select a locale to view and edit the translation"}
        </div>
      )}
    </div>
  );
}
