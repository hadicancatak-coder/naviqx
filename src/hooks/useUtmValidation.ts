import { normalizeUrl } from '@/lib/urlHelpers';

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

export const validateUtmParameters = (params: {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term?: string;
  utm_content?: string;
  base_url: string;
}): ValidationResult => {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check required fields
  if (!params.utm_source?.trim()) {
    errors.push("UTM Source is required");
  }
  if (!params.utm_medium?.trim()) {
    errors.push("UTM Medium is required");
  }
  if (!params.utm_campaign?.trim()) {
    errors.push("UTM Campaign is required");
  }
  if (!params.base_url?.trim()) {
    errors.push("Base URL is required");
  }

  // Validate URL format
  if (params.base_url) {
    try {
      new URL(normalizeUrl(params.base_url));
    } catch {
      errors.push("Base URL is not a valid URL format");
    }
  }

  // Check for spaces
  const checkSpaces = (value: string, field: string) => {
    if (value && value.includes(" ")) {
      warnings.push(`${field} contains spaces (will be replaced with hyphens)`);
    }
  };

  checkSpaces(params.utm_source, "UTM Source");
  checkSpaces(params.utm_medium, "UTM Medium");
  checkSpaces(params.utm_campaign, "UTM Campaign");
  checkSpaces(params.utm_term || "", "UTM Term");
  checkSpaces(params.utm_content || "", "UTM Content");

  // Check for uppercase
  const checkCase = (value: string, field: string) => {
    if (value && value !== value.toLowerCase()) {
      warnings.push(`${field} contains uppercase letters (will be converted to lowercase)`);
    }
  };

  checkCase(params.utm_source, "UTM Source");
  checkCase(params.utm_medium, "UTM Medium");
  checkCase(params.utm_campaign, "UTM Campaign");
  checkCase(params.utm_term || "", "UTM Term");
  checkCase(params.utm_content || "", "UTM Content");

  // Check for special characters
  const specialCharRegex = /[^a-zA-Z0-9\-_]/;
  const checkSpecialChars = (value: string, field: string) => {
    if (value && specialCharRegex.test(value.replace(/\s/g, ""))) {
      warnings.push(`${field} contains special characters (only letters, numbers, - and _ are recommended)`);
    }
  };

  checkSpecialChars(params.utm_source, "UTM Source");
  checkSpecialChars(params.utm_medium, "UTM Medium");
  checkSpecialChars(params.utm_campaign, "UTM Campaign");
  checkSpecialChars(params.utm_term || "", "UTM Term");
  checkSpecialChars(params.utm_content || "", "UTM Content");

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
};

export const sanitizeUtmParameter = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_]/g, "");
};

export const buildUtmUrl = (params: {
  base_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term?: string;
  utm_content?: string;
  custom_params?: Record<string, string>;
}): string => {
  try {
    if (!params.base_url || typeof params.base_url !== 'string') {
      throw new Error('Invalid base URL');
    }
    
    const url = new URL(normalizeUrl(params.base_url));
    
    // Remove any existing UTM parameters before adding new ones
    url.searchParams.delete('utm_source');
    url.searchParams.delete('utm_medium');
    url.searchParams.delete('utm_campaign');
    url.searchParams.delete('utm_content');
    url.searchParams.delete('utm_term');
    
    url.searchParams.set("utm_source", sanitizeUtmParameter(params.utm_source));
    url.searchParams.set("utm_medium", sanitizeUtmParameter(params.utm_medium));
    url.searchParams.set("utm_campaign", sanitizeUtmParameter(params.utm_campaign));
    
    if (params.utm_term) {
      url.searchParams.set("utm_term", sanitizeUtmParameter(params.utm_term));
    }
    if (params.utm_content) {
      url.searchParams.set("utm_content", sanitizeUtmParameter(params.utm_content));
    }
    
    if (params.custom_params) {
      Object.entries(params.custom_params).forEach(([key, value]) => {
        if (key && value) {
          url.searchParams.set(key, value);
        }
      });
    }
    
    return url.toString();
  } catch {
    return "";
  }
};
