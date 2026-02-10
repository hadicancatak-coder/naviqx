// Search Ads Configuration
// Centralized configuration for character limits, max counts, and validation rules

export const SEARCH_ADS_CONFIG = {
  // Headlines configuration
  headlines: {
    maxCount: 15,
    minRequired: 3,
    maxCharacters: 30,
    warningThreshold: 24,
    dangerThreshold: 29,
  },
  
  // Descriptions configuration  
  descriptions: {
    maxCount: 4,
    minRequired: 2,
    maxCharacters: 90,
    warningThreshold: 72,
    dangerThreshold: 86,
  },
  
  // Sitelinks configuration
  sitelinks: {
    maxCount: 5,
    maxDescriptionChars: 25,
  },
  
  // Callouts configuration
  callouts: {
    maxCount: 4,
    maxCharacters: 25,
  },
  
  // Keywords for quality score
  keywords: {
    maxCount: 10,
  },
  
  // Preview configuration
  preview: {
    maxCombinations: 10,
    headlinesPerCombination: 3,
    descriptionsPerCombination: 2,
  },
  
  // Initial visible counts for progressive disclosure
  initialVisible: {
    headlines: 3,
    descriptions: 2,
  },
  
  // Display Ads configuration
  display: {
    longHeadline: { maxCharacters: 90, warningThreshold: 72, dangerThreshold: 86 },
    shortHeadlines: { maxCount: 5, maxCharacters: 30, warningThreshold: 24, dangerThreshold: 29 },
    descriptions: { maxCount: 5, maxCharacters: 90, warningThreshold: 72, dangerThreshold: 86 },
    ctaOptions: ['Learn More', 'Sign Up', 'Shop Now', 'Get Quote', 'Apply Now', 'Contact Us', 'Download', 'Book Now'],
    initialVisible: { shortHeadlines: 3, descriptions: 2 },
  },

  // App Ads configuration
  app: {
    headlines: { maxCount: 5, maxCharacters: 30, warningThreshold: 24, dangerThreshold: 29 },
    descriptions: { maxCount: 5, maxCharacters: 90, warningThreshold: 72, dangerThreshold: 86 },
    platforms: [
      { value: 'android', label: 'Android' },
      { value: 'ios', label: 'iOS' },
    ],
    goals: [
      { value: 'installs', label: 'Installs' },
      { value: 'in_app_events', label: 'In-App Events' },
      { value: 'retargeting', label: 'Retargeting' },
    ],
    ctaOptions: ['Install', 'Open', 'Play Now', 'Learn More', 'Sign Up'],
    initialVisible: { headlines: 3, descriptions: 2 },
  },
} as const;

// Ad strength thresholds
export const AD_STRENGTH_THRESHOLDS = {
  excellent: 80,
  good: 60,
  average: 40,
  poor: 0,
} as const;

// Languages supported
export const SUPPORTED_LANGUAGES = [
  { value: 'EN', label: 'English' },
  { value: 'AR', label: 'Arabic' },
] as const;

// Status options
export const AD_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'paused', label: 'Paused' },
  { value: 'archived', label: 'Archived' },
] as const;

// Element types for saved captions
export const ELEMENT_TYPES = {
  HEADLINE: 'headline',
  DESCRIPTION: 'description',
  SITELINK: 'sitelink',
  CALLOUT: 'callout',
} as const;

export type ElementType = typeof ELEMENT_TYPES[keyof typeof ELEMENT_TYPES];
