import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppStoreFieldCounter } from "./AppStoreFieldCounter";
import { DescriptionToolbar } from "./DescriptionToolbar";
import { FIELD_LIMITS, APPLE_CATEGORIES, GOOGLE_PLAY_CATEGORIES } from "@/domain/app-store";
import type { AppStoreListing, Locale } from "@/domain/app-store";
import { Check, Loader2, AlertCircle } from "lucide-react";

interface Props {
  listing: AppStoreListing;
  onUpdate: (updates: Partial<AppStoreListing>) => void;
  isSaving?: boolean;
  saveError?: boolean;
}

function Field({ label, children, counter }: { label: string; children: React.ReactNode; counter?: React.ReactNode }) {
  return (
    <div className="space-y-xs">
      <div className="flex items-center justify-between gap-sm">
        <Label className="text-metadata font-medium text-muted-foreground">{label}</Label>
        {counter}
      </div>
      {children}
    </div>
  );
}

type DraftFields = {
  app_name: string;
  subtitle: string;
  short_description: string;
  promotional_text: string;
  description: string;
  keywords: string;
  whats_new: string;
  tagsStr: string;
  screenshotStr: string;
};

function buildDraft(listing: AppStoreListing): DraftFields {
  return {
    app_name: listing.app_name ?? "",
    subtitle: listing.subtitle ?? "",
    short_description: listing.short_description ?? "",
    promotional_text: listing.promotional_text ?? "",
    description: listing.description ?? "",
    keywords: listing.keywords ?? "",
    whats_new: listing.whats_new ?? "",
    tagsStr: (listing.tags ?? []).join(", "),
    screenshotStr: (listing.screenshot_notes ?? []).join("\n"),
  };
}

function draftToPayload(draft: DraftFields): Partial<AppStoreListing> {
  const toNull = (v: string) => (v.trim() ? v : null);
  return {
    app_name: toNull(draft.app_name),
    subtitle: toNull(draft.subtitle),
    short_description: toNull(draft.short_description),
    promotional_text: toNull(draft.promotional_text),
    description: toNull(draft.description),
    keywords: toNull(draft.keywords),
    whats_new: toNull(draft.whats_new),
    tags: draft.tagsStr.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 5),
    screenshot_notes: draft.screenshotStr.split("\n").map((n) => n.trim()).filter(Boolean).slice(0, 10),
  };
}

function DescriptionField({ label, value, onChange, maxLength, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
  placeholder: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="space-y-xs">
      <div className="flex items-center justify-between gap-sm">
        <Label className="text-metadata font-medium text-muted-foreground">{label}</Label>
        <AppStoreFieldCounter current={value.length} max={maxLength} />
      </div>
      <div className="rounded-lg border border-input overflow-hidden focus-within:ring-2 focus-within:ring-primary/10 focus-within:border-primary/30">
        <DescriptionToolbar textareaRef={textareaRef} value={value} onChange={onChange} maxLength={maxLength} />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          className="w-full min-h-[280px] resize-y bg-card px-sm py-sm text-body-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none break-words [word-break:break-word] [overflow-wrap:break-word]"
        />
      </div>
    </div>
  );
}


  const isApple = listing.store_type === "apple";
  const limits = isApple ? FIELD_LIMITS.apple : FIELD_LIMITS.google_play;
  const dir = listing.locale === "ar" ? "rtl" : "ltr";

  // Draft state - full snapshot, not individual fields
  const [draft, setDraft] = useState<DraftFields>(() => buildDraft(listing));
  const pendingRef = useRef<Partial<AppStoreListing> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const listingIdRef = useRef(listing.id);

  // Sync from server on listing switch
  useEffect(() => {
    if (listing.id !== listingIdRef.current) {
      // Flush pending changes for old listing before switching
      if (pendingRef.current && debounceRef.current) {
        clearTimeout(debounceRef.current);
        onUpdate(pendingRef.current);
        pendingRef.current = null;
      }
      listingIdRef.current = listing.id;
      setDraft(buildDraft(listing));
    }
  }, [listing.id, onUpdate]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (pendingRef.current) {
        onUpdate(pendingRef.current);
        pendingRef.current = null;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [onUpdate]);

  const scheduleSave = useCallback(
    (newDraft: DraftFields) => {
      const payload = draftToPayload(newDraft);
      pendingRef.current = payload;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (pendingRef.current) {
          onUpdate(pendingRef.current);
          pendingRef.current = null;
        }
      }, 600);
    },
    [onUpdate],
  );

  const updateField = useCallback(
    (field: keyof DraftFields, value: string) => {
      setDraft((prev) => {
        const next = { ...prev, [field]: value };
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const categories = isApple ? APPLE_CATEGORIES : GOOGLE_PLAY_CATEGORIES;

  // Save status indicator
  const saveStatus = useMemo(() => {
    if (saveError) return { icon: AlertCircle, text: "Save failed", className: "text-destructive" };
    if (isSaving) return { icon: Loader2, text: "Saving…", className: "text-muted-foreground animate-spin" };
    return { icon: Check, text: "Saved", className: "text-success" };
  }, [isSaving, saveError]);

  const SaveIcon = saveStatus.icon;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-sm border-b border-border flex items-center justify-between">
        <h3 className="text-heading-sm font-semibold text-foreground truncate">{listing.name}</h3>
        <div className="flex items-center gap-sm">
          <div className="flex items-center gap-xs text-metadata">
            <SaveIcon className={`h-3 w-3 ${saveStatus.className}`} />
            <span className={saveStatus.className}>{saveStatus.text}</span>
          </div>
          <Tabs value={listing.locale} onValueChange={(v) => onUpdate({ locale: v as Locale })}>
            <TabsList className="h-8">
              <TabsTrigger value="en" className="text-metadata px-md">EN</TabsTrigger>
              <TabsTrigger value="ar" className="text-metadata px-md">AR</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="p-md space-y-md" dir={dir}>
        <Field
          label="App Name"
          counter={<AppStoreFieldCounter current={draft.app_name.length} max={limits.app_name} />}
        >
          <Input
            value={draft.app_name}
            onChange={(e) => updateField("app_name", e.target.value)}
            maxLength={limits.app_name}
            placeholder="My App"
            className="text-body-sm"
          />
        </Field>

        {isApple && (
          <Field
            label="Subtitle"
            counter={<AppStoreFieldCounter current={draft.subtitle.length} max={FIELD_LIMITS.apple.subtitle} />}
          >
            <Input
              value={draft.subtitle}
              onChange={(e) => updateField("subtitle", e.target.value)}
              maxLength={FIELD_LIMITS.apple.subtitle}
              placeholder="A short tagline"
              className="text-body-sm"
            />
          </Field>
        )}

        {!isApple && (
          <Field
            label="Short Description"
            counter={<AppStoreFieldCounter current={draft.short_description.length} max={FIELD_LIMITS.google_play.short_description} />}
          >
            <Textarea
              value={draft.short_description}
              onChange={(e) => updateField("short_description", e.target.value)}
              maxLength={FIELD_LIMITS.google_play.short_description}
              placeholder="Brief summary…"
              className="text-body-sm min-h-[60px]"
            />
          </Field>
        )}

        {isApple && (
          <Field
            label="Promotional Text"
            counter={<AppStoreFieldCounter current={draft.promotional_text.length} max={FIELD_LIMITS.apple.promotional_text} />}
          >
            <Textarea
              value={draft.promotional_text}
              onChange={(e) => updateField("promotional_text", e.target.value)}
              maxLength={FIELD_LIMITS.apple.promotional_text}
              placeholder="Highlight a timely event or promotion…"
              className="text-body-sm min-h-[60px]"
            />
          </Field>
        )}

        <DescriptionField
          label={isApple ? "Description" : "Full Description"}
          value={draft.description}
          onChange={(v) => updateField("description", v)}
          maxLength={limits.description}
          placeholder="Full app description…"
        />

        {isApple && (
          <Field
            label="Keywords"
            counter={<AppStoreFieldCounter current={draft.keywords.length} max={FIELD_LIMITS.apple.keywords} />}
          >
            <Input
              value={draft.keywords}
              onChange={(e) => updateField("keywords", e.target.value)}
              maxLength={FIELD_LIMITS.apple.keywords}
              placeholder="trading,forex,stocks"
              className="text-body-sm"
            />
          </Field>
        )}

        {!isApple && (
          <Field
            label="Tags"
            counter={<AppStoreFieldCounter current={(draft.tagsStr.split(",").map(t => t.trim()).filter(Boolean)).length} max={5} />}
          >
            <Input
              value={draft.tagsStr}
              onChange={(e) => updateField("tagsStr", e.target.value)}
              placeholder="finance, trading, investing"
              className="text-body-sm"
            />
          </Field>
        )}

        <Field
          label="What's New"
          counter={<AppStoreFieldCounter current={draft.whats_new.length} max={isApple ? FIELD_LIMITS.apple.whats_new : FIELD_LIMITS.google_play.whats_new} />}
        >
          <Textarea
            value={draft.whats_new}
            onChange={(e) => updateField("whats_new", e.target.value)}
            maxLength={isApple ? FIELD_LIMITS.apple.whats_new : FIELD_LIMITS.google_play.whats_new}
            placeholder="Release notes…"
            className="text-body-sm min-h-[80px]"
          />
        </Field>

        <Field label={isApple ? "Primary Category" : "Category"}>
          <Select
            value={listing.primary_category ?? ""}
            onValueChange={(v) => onUpdate({ primary_category: v })}
          >
            <SelectTrigger className="text-body-sm">
              <SelectValue placeholder="Select category…" />
            </SelectTrigger>
            <SelectContent className="liquid-glass-dropdown">
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {isApple && (
          <Field label="Secondary Category">
            <Select
              value={listing.secondary_category ?? ""}
              onValueChange={(v) => onUpdate({ secondary_category: v })}
            >
              <SelectTrigger className="text-body-sm">
                <SelectValue placeholder="Optional…" />
              </SelectTrigger>
              <SelectContent className="liquid-glass-dropdown">
                {APPLE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <Field
          label="Screenshot Notes"
          counter={<AppStoreFieldCounter current={(draft.screenshotStr.split("\n").map(n => n.trim()).filter(Boolean)).length} max={10} />}
        >
          <Textarea
            value={draft.screenshotStr}
            onChange={(e) => updateField("screenshotStr", e.target.value)}
            placeholder="One note per line for screenshot ideas"
            className="text-body-sm min-h-[100px]"
          />
        </Field>
      </div>
    </div>
  );
}
