/**
 * Campaign Validation Engine
 * Pure functions for determining campaign readiness (READY / NOT READY)
 * Based on Google Ads parity requirements per campaign type
 */

export interface ValidationResult {
  ready: boolean;
  blocking: string[];
  warnings: string[];
}

interface AdForValidation {
  headlines: string[] | unknown;
  descriptions: string[] | unknown;
  landing_page?: string | null;
  business_name?: string | null;
  short_headlines?: unknown;
  long_headline?: string | null;
  cta_text?: string | null;
}

interface AdGroupForValidation {
  id: string;
  name: string;
  keywords?: unknown;
  ads: AdForValidation[];
}

interface CampaignForValidation {
  id: string;
  name: string;
  campaign_type?: string;
  objective?: string | null;
  // App fields
  app_objective?: string | null;
  app_platform?: string | null;
  app_store_id?: string | null;
  optimization_goal?: string | null;
  bidding_type?: string | null;
  audience_mode?: string | null;
  // Display fields
  display_objective?: string | null;
}

function toStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

function hasKeywords(keywords: unknown): boolean {
  if (!keywords) return false;
  if (Array.isArray(keywords)) return keywords.length > 0;
  if (typeof keywords === 'object') {
    return Object.values(keywords as Record<string, unknown>).some(v => 
      Array.isArray(v) ? v.length > 0 : false
    );
  }
  return false;
}

export function validateSearchCampaign(
  campaign: CampaignForValidation,
  adGroups: AdGroupForValidation[]
): ValidationResult {
  const blocking: string[] = [];
  const warnings: string[] = [];

  if (adGroups.length === 0) {
    blocking.push('No ad groups');
  }

  for (const ag of adGroups) {
    if (ag.ads.length === 0) {
      blocking.push(`Ad group "${ag.name}" has no ads`);
    }

    if (!hasKeywords(ag.keywords)) {
      blocking.push(`Ad group "${ag.name}" has no keywords`);
    }

    for (const ad of ag.ads) {
      const headlines = toStringArray(ad.headlines);
      const descriptions = toStringArray(ad.descriptions);

      if (headlines.length < 3) {
        blocking.push(`Ad in "${ag.name}" has fewer than 3 headlines`);
      }
      if (descriptions.length < 2) {
        blocking.push(`Ad in "${ag.name}" has fewer than 2 descriptions`);
      }
      if (!ad.landing_page?.trim()) {
        blocking.push(`Ad in "${ag.name}" missing landing page`);
      }
      if (headlines.length < 10 && headlines.length >= 3) {
        warnings.push(`Ad in "${ag.name}" has fewer than 10 headlines`);
      }
    }
  }

  return { ready: blocking.length === 0, blocking, warnings };
}

export function validateAppCampaign(
  campaign: CampaignForValidation,
  adGroups: AdGroupForValidation[]
): ValidationResult {
  const blocking: string[] = [];
  const warnings: string[] = [];

  if (!campaign.app_objective) {
    blocking.push('No objective selected');
  }
  if (!campaign.optimization_goal) {
    blocking.push('No optimization goal');
  }
  if (!campaign.app_platform) {
    blocking.push('No app platform selected');
  }
  if (!campaign.app_store_id) {
    blocking.push('No app store ID');
  }
  if (!campaign.bidding_type) {
    blocking.push('No bidding strategy defined');
  }
  if (!campaign.audience_mode) {
    blocking.push('No audience mode defined');
  }

  if (adGroups.length === 0) {
    blocking.push('No ad groups');
  }

  for (const ag of adGroups) {
    for (const ad of ag.ads) {
      const headlines = toStringArray(ad.headlines);
      const descriptions = toStringArray(ad.descriptions);

      if (headlines.length === 0) {
        blocking.push(`Ad in "${ag.name}" has no headlines`);
      }
      if (descriptions.length === 0) {
        blocking.push(`Ad in "${ag.name}" has no descriptions`);
      }
      if (headlines.length === 1) {
        warnings.push(`Ad in "${ag.name}" has only one headline`);
      }
    }
  }

  return { ready: blocking.length === 0, blocking, warnings };
}

export function validateDisplayCampaign(
  campaign: CampaignForValidation,
  adGroups: AdGroupForValidation[]
): ValidationResult {
  const blocking: string[] = [];
  const warnings: string[] = [];

  if (adGroups.length === 0) {
    blocking.push('No ad groups');
  }

  if (!campaign.display_objective) {
    warnings.push('No objective set');
  }

  for (const ag of adGroups) {
    for (const ad of ag.ads) {
      const shortHeadlines = toStringArray(ad.short_headlines);
      const descriptions = toStringArray(ad.descriptions);

      if (shortHeadlines.length === 0) {
        const headlines = toStringArray(ad.headlines);
        if (headlines.length === 0) {
          blocking.push(`Ad in "${ag.name}" missing headline`);
        }
      }
      if (descriptions.length === 0) {
        blocking.push(`Ad in "${ag.name}" missing description`);
      }
      if (!ad.business_name?.trim()) {
        blocking.push(`Ad in "${ag.name}" missing business name`);
      }
      if (!ad.long_headline?.trim()) {
        warnings.push(`Ad in "${ag.name}" has no long headline`);
      }
    }
  }

  return { ready: blocking.length === 0, blocking, warnings };
}

export function validateCampaign(
  campaign: CampaignForValidation,
  adGroups: AdGroupForValidation[]
): ValidationResult {
  const type = campaign.campaign_type || 'search';
  switch (type) {
    case 'app':
      return validateAppCampaign(campaign, adGroups);
    case 'display':
      return validateDisplayCampaign(campaign, adGroups);
    default:
      return validateSearchCampaign(campaign, adGroups);
  }
}
