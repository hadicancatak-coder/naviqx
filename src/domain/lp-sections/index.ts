// Brief Section Types - Single source of truth
export const LP_SECTION_TYPES = [
  { value: "hero", label: "Hero" },
  { value: "feature", label: "Feature" },
  { value: "testimonial", label: "Testimonial" },
  { value: "regulations", label: "Regulations" },
  { value: "mobile", label: "Mobile" },
  { value: "sponsorships", label: "Sponsorships" },
  { value: "footers", label: "Footers" },
  { value: "graphs", label: "Graphs" },
  { value: "creatives", label: "Creatives" },
  { value: "other", label: "Other" },
] as const;

export type LpSectionType = typeof LP_SECTION_TYPES[number]["value"];

// Section type colors for borders (used in blocks)
export const sectionTypeBorderColors: Record<string, string> = {
  hero: "border-l-purple-500",
  feature: "border-l-blue-500",
  testimonial: "border-l-green-500",
  regulations: "border-l-amber-500",
  mobile: "border-l-cyan-500",
  sponsorships: "border-l-pink-500",
  footers: "border-l-gray-500",
  graphs: "border-l-orange-500",
  creatives: "border-l-rose-500",
  other: "border-l-slate-500",
};

// Section type colors for badges/pills
export const sectionTypeBadgeColors: Record<string, string> = {
  hero: "bg-purple-500/15 text-purple-400",
  feature: "bg-blue-500/15 text-blue-400",
  testimonial: "bg-green-500/15 text-green-400",
  regulations: "bg-amber-500/15 text-amber-400",
  mobile: "bg-cyan-500/15 text-cyan-400",
  sponsorships: "bg-pink-500/15 text-pink-400",
  footers: "bg-gray-500/15 text-gray-400",
  graphs: "bg-orange-500/15 text-orange-400",
  creatives: "bg-rose-500/15 text-rose-400",
  other: "bg-slate-500/15 text-slate-400",
};

// Section type colors for cards (with border)
export const sectionTypeCardColors: Record<string, string> = {
  hero: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  feature: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  testimonial: "bg-green-500/20 text-green-400 border-green-500/30",
  regulations: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  mobile: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  sponsorships: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  footers: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  graphs: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  creatives: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  other: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

// Helper to get filter options (includes "All Types")
export const LP_SECTION_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All Types" },
  ...LP_SECTION_TYPES,
];
