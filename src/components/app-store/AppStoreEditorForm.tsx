import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AppStoreFieldCounter } from "./AppStoreFieldCounter";
import { DescriptionToolbar } from "./DescriptionToolbar";
import { FIELD_LIMITS, APPLE_CATEGORIES, GOOGLE_PLAY_CATEGORIES } from "@/domain/app-store";
import type { AppStoreListing, Locale } from "@/domain/app-store";
import { Check, Loader2, AlertCircle, ChevronDown, ChevronUp, Pencil, Building2 } from "lucide-react";
import { LISTING_STATUSES } from "@/domain/app-store";
import type { ListingStatus } from "@/domain/app-store";
import { Badge } from "@/components/ui/badge";
import { useSystemEntities } from "@/hooks/useSystemEntities";

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
  ss1: string;
  ss2: string;
  ss3: string;
  ss4: string;
  ss5: string;
  ss6: string;
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
    ss1: (listing.screenshot_notes ?? [])[0] ?? "",
    ss2: (listing.screenshot_notes ?? [])[1] ?? "",
    ss3: (listing.screenshot_notes ?? [])[2] ?? "",
    ss4: (listing.screenshot_notes ?? [])[3] ?? "",
    ss5: (listing.screenshot_notes ?? [])[4] ?? "",
    ss6: (listing.screenshot_notes ?? [])[5] ?? "",
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
    screenshot_notes: [draft.ss1, draft.ss2, draft.ss3, draft.ss4, draft.ss5, draft.ss6].map(s => s.trim()).filter(Boolean),
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

export function AppStoreEditorForm({ listing, onUpdate, isSaving, saveError }: Props) {
  const { data: systemEntities = [] } = useSystemEntities();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(listing.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Sync name when listing changes
  useEffect(() => {
    setNameValue(listing.name);
    setEditingName(false);
  }, [listing.id, listing.name]);

  const commitName = useCallback(() => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== listing.name) {
      onUpdate({ name: trimmed });
    } else {
      setNameValue(listing.name);
    }
    setEditingName(false);
  }, [nameValue, listing.name, onUpdate]);

  const toggleEntity = useCallback((entityName: string) => {
    const current = listing.entities ?? [];
    const next = current.includes(entityName)
      ? current.filter(e => e !== entityName)
      : [...current, entityName];
    onUpdate({ entities: next } as Partial<AppStoreListing>);
  }, [listing.entities, onUpdate]);

  const isApple = listing.store_type === "apple";
  const limits = isApple ? FIELD_LIMITS.apple : FIELD_LIMITS.google_play;
  const dir = listing.locale === "ar" ? "rtl" : "ltr";

  // Draft state - full snapshot, not individual fields
  const [draft, setDraft] = useState<DraftFields>(() => buildDraft(listing));
  const [screenshotExpanded, setScreenshotExpanded] = useState(false);
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
      <div className="p-sm border-b border-border space-y-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-sm min-w-0 flex-1">
            {editingName ? (
              <Input
                ref={nameInputRef}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitName();
                  if (e.key === "Escape") { setNameValue(listing.name); setEditingName(false); }
                }}
                className="text-heading-sm font-semibold h-8 max-w-[240px]"
                autoFocus
              />
            ) : (
              <button
                onClick={() => { setEditingName(true); setTimeout(() => nameInputRef.current?.focus(), 0); }}
                className="flex items-center gap-xs group cursor-pointer min-w-0"
              >
                <h3 className="text-heading-sm font-semibold text-foreground truncate">{listing.name}</h3>
                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-smooth shrink-0" />
              </button>
            )}
            <Badge variant="outline" className="text-metadata shrink-0">v{listing.version}</Badge>
          </div>
          <div className="flex items-center gap-xs text-metadata shrink-0">
            <SaveIcon className={`h-3 w-3 ${saveStatus.className}`} />
            <span className={saveStatus.className}>{saveStatus.text}</span>
          </div>
        </div>

        {/* Entity multi-select + Status + Locale row */}
        <div className="flex items-center justify-between gap-sm">
          <div className="flex items-center gap-sm">
            <Select
              value={listing.status}
              onValueChange={(v) => onUpdate({ status: v as ListingStatus })}
            >
              <SelectTrigger className="text-metadata h-7 w-auto min-w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="liquid-glass-dropdown">
                {LISTING_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-metadata">{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-metadata gap-xs">
                  <Building2 className="h-3 w-3" />
                  {(listing.entities ?? []).length > 0
                    ? `${(listing.entities ?? []).length} entit${(listing.entities ?? []).length === 1 ? "y" : "ies"}`
                    : "Entities"}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="liquid-glass-dropdown w-56 p-xs" align="start">
                <div className="space-y-xs max-h-[240px] overflow-y-auto">
                  {systemEntities.map((entity) => (
                    <label
                      key={entity.id}
                      className="flex items-center gap-sm px-sm py-xs rounded-md cursor-pointer hover:bg-card-hover transition-smooth"
                    >
                      <Checkbox
                        checked={(listing.entities ?? []).includes(entity.name)}
                        onCheckedChange={() => toggleEntity(entity.name)}
                        className="size-3.5"
                      />
                      <span className="text-body-sm">
                        {entity.emoji && `${entity.emoji} `}{entity.name}
                      </span>
                    </label>
                  ))}
                  {systemEntities.length === 0 && (
                    <p className="text-metadata text-muted-foreground text-center py-sm">No entities configured</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Tabs value={listing.locale} onValueChange={(v) => onUpdate({ locale: v as Locale })}>
            <TabsList className="h-7">
              <TabsTrigger value="en" className="text-metadata px-md h-6">EN</TabsTrigger>
              <TabsTrigger value="ar" className="text-metadata px-md h-6">AR</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      {listing.status === "needs_changes" && listing.review_notes && (
          <div className="bg-warning-soft border border-warning/30 rounded-lg px-md py-sm space-y-xs">
            <div className="flex items-center justify-between">
              <p className="text-body-sm font-semibold text-warning-text">⚠ Changes Requested</p>
              {listing.approved_by && (
                <span className="text-metadata text-warning-text/70">by {listing.approved_by}</span>
              )}
            </div>
            <p className="text-body-sm text-warning-text/90 whitespace-pre-wrap">{listing.review_notes}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-xs text-metadata"
              onClick={() => onUpdate({ status: "draft", review_notes: null })}
            >
              Dismiss & Mark as Draft
            </Button>
          </div>
        )}
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

        <div className="space-y-xs">
          <div className="flex items-center justify-between gap-sm">
            <Label className="text-metadata font-medium text-muted-foreground">Screenshot Notes</Label>
            <AppStoreFieldCounter current={[draft.ss1, draft.ss2, draft.ss3, draft.ss4, draft.ss5, draft.ss6].filter(s => s.trim()).length} max={6} />
          </div>
          <div className="space-y-xs">
            {([["ss1", 1], ["ss2", 2], ["ss3", 3]] as const).map(([key, num]) => (
              <Input
                key={key}
                value={draft[key]}
                onChange={(e) => updateField(key, e.target.value)}
                placeholder={`Screenshot ${num} note`}
                className="text-body-sm"
              />
            ))}
          </div>
          {screenshotExpanded && (
            <div className="space-y-xs">
              {([["ss4", 4], ["ss5", 5], ["ss6", 6]] as const).map(([key, num]) => (
                <Input
                  key={key}
                  value={draft[key]}
                  onChange={(e) => updateField(key, e.target.value)}
                  placeholder={`Screenshot ${num} note`}
                  className="text-body-sm"
                />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setScreenshotExpanded(!screenshotExpanded)}
            className="text-metadata text-primary font-medium cursor-pointer flex items-center gap-0.5 transition-smooth"
          >
            {screenshotExpanded ? (<>Show less <ChevronUp className="h-3 w-3" /></>) : (<>Show more (4–6) <ChevronDown className="h-3 w-3" /></>)}
          </button>
        </div>
      </div>
    </div>
  );
}
