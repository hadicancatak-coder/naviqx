import { useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppStoreFieldCounter } from "./AppStoreFieldCounter";
import { FIELD_LIMITS, APPLE_CATEGORIES, GOOGLE_PLAY_CATEGORIES } from "@/domain/app-store";
import type { AppStoreListing, Locale } from "@/domain/app-store";

interface Props {
  listing: AppStoreListing;
  onUpdate: (updates: Partial<AppStoreListing>) => void;
}

function Field({ label, children, counter }: { label: string; children: React.ReactNode; counter?: React.ReactNode }) {
  return (
    <div className="space-y-xs">
      <div className="flex items-center justify-between">
        <Label className="text-metadata font-medium text-muted-foreground">{label}</Label>
        {counter}
      </div>
      {children}
    </div>
  );
}

export function AppStoreEditorForm({ listing, onUpdate }: Props) {
  const isApple = listing.store_type === "apple";
  const limits = isApple ? FIELD_LIMITS.apple : FIELD_LIMITS.google_play;
  const dir = listing.locale === "ar" ? "rtl" : "ltr";

  const onField = useCallback(
    (field: keyof AppStoreListing, value: string | null) => onUpdate({ [field]: value || null }),
    [onUpdate],
  );

  const categories = isApple ? APPLE_CATEGORIES : GOOGLE_PLAY_CATEGORIES;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Locale tabs */}
      <div className="p-sm border-b border-border flex items-center justify-between">
        <h3 className="text-heading-sm font-semibold text-foreground truncate">{listing.name}</h3>
        <Tabs value={listing.locale} onValueChange={(v) => onUpdate({ locale: v as Locale })}>
          <TabsList className="h-8">
            <TabsTrigger value="en" className="text-metadata px-md">EN</TabsTrigger>
            <TabsTrigger value="ar" className="text-metadata px-md">AR</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="p-md space-y-md" dir={dir}>
        {/* App Name */}
        <Field
          label="App Name"
          counter={<AppStoreFieldCounter current={listing.app_name?.length ?? 0} max={limits.app_name} />}
        >
          <Input
            value={listing.app_name ?? ""}
            onChange={(e) => onField("app_name", e.target.value)}
            maxLength={limits.app_name}
            placeholder="My App"
            className="text-body-sm"
          />
        </Field>

        {/* Apple-specific: Subtitle */}
        {isApple && (
          <Field
            label="Subtitle"
            counter={<AppStoreFieldCounter current={listing.subtitle?.length ?? 0} max={FIELD_LIMITS.apple.subtitle} />}
          >
            <Input
              value={listing.subtitle ?? ""}
              onChange={(e) => onField("subtitle", e.target.value)}
              maxLength={FIELD_LIMITS.apple.subtitle}
              placeholder="A short tagline"
              className="text-body-sm"
            />
          </Field>
        )}

        {/* Google Play: Short Description */}
        {!isApple && (
          <Field
            label="Short Description"
            counter={<AppStoreFieldCounter current={listing.short_description?.length ?? 0} max={FIELD_LIMITS.google_play.short_description} />}
          >
            <Textarea
              value={listing.short_description ?? ""}
              onChange={(e) => onField("short_description", e.target.value)}
              maxLength={FIELD_LIMITS.google_play.short_description}
              placeholder="Brief summary…"
              className="text-body-sm min-h-[60px]"
            />
          </Field>
        )}

        {/* Apple: Promotional Text */}
        {isApple && (
          <Field
            label="Promotional Text"
            counter={<AppStoreFieldCounter current={listing.promotional_text?.length ?? 0} max={FIELD_LIMITS.apple.promotional_text} />}
          >
            <Textarea
              value={listing.promotional_text ?? ""}
              onChange={(e) => onField("promotional_text", e.target.value)}
              maxLength={FIELD_LIMITS.apple.promotional_text}
              placeholder="Highlight a timely event or promotion…"
              className="text-body-sm min-h-[60px]"
            />
          </Field>
        )}

        {/* Description */}
        <Field
          label="Description"
          counter={<AppStoreFieldCounter current={listing.description?.length ?? 0} max={limits.description} />}
        >
          <Textarea
            value={listing.description ?? ""}
            onChange={(e) => onField("description", e.target.value)}
            maxLength={limits.description}
            placeholder="Full app description…"
            className="text-body-sm min-h-[120px]"
          />
        </Field>

        {/* Apple: Keywords */}
        {isApple && (
          <Field
            label="Keywords"
            counter={<AppStoreFieldCounter current={listing.keywords?.length ?? 0} max={FIELD_LIMITS.apple.keywords} />}
          >
            <Input
              value={listing.keywords ?? ""}
              onChange={(e) => onField("keywords", e.target.value)}
              maxLength={FIELD_LIMITS.apple.keywords}
              placeholder="trading,forex,stocks"
              className="text-body-sm"
            />
          </Field>
        )}

        {/* What's New */}
        <Field
          label="What's New"
          counter={<AppStoreFieldCounter current={listing.whats_new?.length ?? 0} max={isApple ? FIELD_LIMITS.apple.whats_new : FIELD_LIMITS.google_play.whats_new} />}
        >
          <Textarea
            value={listing.whats_new ?? ""}
            onChange={(e) => onField("whats_new", e.target.value)}
            maxLength={isApple ? FIELD_LIMITS.apple.whats_new : FIELD_LIMITS.google_play.whats_new}
            placeholder="Release notes…"
            className="text-body-sm min-h-[80px]"
          />
        </Field>

        {/* Category */}
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

        {/* Apple: Secondary Category */}
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
      </div>
    </div>
  );
}
