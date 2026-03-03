import { z } from "zod";

export type StoreType = "apple" | "google_play";
export type Locale = "en" | "ar";
export type ListingStatus = "draft" | "ready_for_review" | "approved" | "needs_changes" | "live";

export const LISTING_STATUSES: { value: ListingStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "ready_for_review", label: "Ready for Review" },
  { value: "approved", label: "Approved" },
  { value: "needs_changes", label: "Needs Changes" },
  { value: "live", label: "Live" },
];

export interface AppStoreListing {
  id: string;
  name: string;
  store_type: StoreType;
  locale: Locale;
  status: ListingStatus;
  version: number;
  approved_by: string | null;
  approved_at: string | null;
  review_notes: string | null;
  app_name: string | null;
  subtitle: string | null;
  short_description: string | null;
  promotional_text: string | null;
  description: string | null;
  keywords: string | null;
  whats_new: string | null;
  primary_category: string | null;
  secondary_category: string | null;
  tags: string[];
  screenshot_notes: string[];
  entities: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const FIELD_LIMITS = {
  apple: {
    app_name: 30,
    subtitle: 30,
    promotional_text: 170,
    description: 4000,
    keywords: 100,
    whats_new: 4000,
  },
  google_play: {
    app_name: 30,
    short_description: 80,
    description: 4000,
    whats_new: 500,
  },
} as const;

export const APPLE_CATEGORIES = [
  "Books", "Business", "Developer Tools", "Education", "Entertainment",
  "Finance", "Food & Drink", "Games", "Graphics & Design", "Health & Fitness",
  "Lifestyle", "Medical", "Music", "Navigation", "News",
  "Photo & Video", "Productivity", "Reference", "Shopping", "Social Networking",
  "Sports", "Travel", "Utilities", "Weather",
] as const;

export const GOOGLE_PLAY_CATEGORIES = [
  "Art & Design", "Auto & Vehicles", "Beauty", "Books & Reference", "Business",
  "Comics", "Communication", "Dating", "Education", "Entertainment",
  "Events", "Finance", "Food & Drink", "Health & Fitness", "House & Home",
  "Libraries & Demo", "Lifestyle", "Maps & Navigation", "Medical", "Music & Audio",
  "News & Magazines", "Parenting", "Personalization", "Photography", "Productivity",
  "Shopping", "Social", "Sports", "Tools", "Travel & Local",
  "Video Players & Editors", "Weather",
] as const;

export interface AppStoreTranslation {
  id: string;
  listing_id: string;
  locale: string;
  status: ListingStatus;
  app_name: string | null;
  subtitle: string | null;
  short_description: string | null;
  promotional_text: string | null;
  description: string | null;
  keywords: string | null;
  whats_new: string | null;
  translated_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const TRANSLATION_LOCALES = [
  { value: "ar", label: "Arabic (AR)" },
  { value: "fr", label: "French (FR)" },
  { value: "es", label: "Spanish (ES)" },
  { value: "de", label: "German (DE)" },
  { value: "tr", label: "Turkish (TR)" },
  { value: "az", label: "Azerbaijani (AZ)" },
] as const;

export const appStoreListingSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  store_type: z.enum(["apple", "google_play"]),
  locale: z.enum(["en", "ar"]),
  app_name: z.string().max(30).nullable().optional(),
  subtitle: z.string().max(30).nullable().optional(),
  short_description: z.string().max(80).nullable().optional(),
  promotional_text: z.string().max(170).nullable().optional(),
  description: z.string().max(4000).nullable().optional(),
  keywords: z.string().max(100).nullable().optional(),
  whats_new: z.string().max(4000).nullable().optional(),
  primary_category: z.string().nullable().optional(),
  secondary_category: z.string().nullable().optional(),
  tags: z.array(z.string()).max(5).optional(),
  screenshot_notes: z.array(z.string()).max(10).optional(),
});
