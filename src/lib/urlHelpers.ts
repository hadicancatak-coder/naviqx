/**
 * URL Normalization and Helpers
 * Single source of truth for URL manipulation across the app
 */

/**
 * Normalize a URL by ensuring it has a protocol
 * Works with http, https, mailto, tel, and other protocols
 */
export function normalizeUrl(url: string): string {
  if (!url) return url;
  const trimmed = url.trim();
  if (trimmed.match(/^https?:\/\//i)) return trimmed;
  if (trimmed.includes('://') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Safely parse a URL, returning null if invalid
 */
export function safeParseUrl(url: string): URL | null {
  try {
    return new URL(normalizeUrl(url));
  } catch {
    return null;
  }
}

/**
 * Get the production URL for the application
 */
export const getProductionUrl = (): string => {
  // Check for environment variable first
  if (import.meta.env.VITE_PUBLIC_URL) {
    return import.meta.env.VITE_PUBLIC_URL;
  }
  
  // Use the production domain
  const productionDomain = "naviqx.lovable.app";
  
  // In development, use current origin
  if (window.location.hostname === "localhost" || window.location.hostname.includes("lovableproject.com")) {
    return `https://${productionDomain}`;
  }
  
  return window.location.origin;
};

/**
 * Extract hostname from a URL safely
 */
export function getHostname(url: string): string {
  const parsed = safeParseUrl(url);
  return parsed?.hostname.replace('www.', '') || url.split('/')[0] || '';
}

/**
 * Get the universal review URL for a given token.
 * Uses the simplified /r/:token pattern that auto-detects resource type.
 */
export function getUniversalReviewUrl(token: string): string {
  return `${getProductionUrl()}/r/${token}`;
}
