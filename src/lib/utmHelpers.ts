/**
 * Normalize LP URL by removing language and country path segments
 * Input:  https://campaigns.cfifinancial.com/ar/jo/shine-with-gold-4
 * Output: https://campaigns.cfifinancial.com/shine-with-gold-4
 */
export const normalizeLpUrl = (url: string): string => {
  const languageCodes = ['en', 'ar', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'vi', 'th'];
  const countryCodes = ['jo', 'lb', 'mu', 'ae', 'uae', 'kw', 'sa', 'bh', 'om', 'qa', 'eg', 'iq', 'uk', 'cy', 'vu', 'ps', 'za', 'vn', 'az'];
  
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    // Remove language and country segments
    const cleanedParts = pathParts.filter(part => 
      !languageCodes.includes(part.toLowerCase()) && 
      !countryCodes.includes(part.toLowerCase())
    );
    
    urlObj.pathname = '/' + cleanedParts.join('/');
    // Remove any query params too for a clean base
    urlObj.search = '';
    return urlObj.toString();
  } catch {
    return url;
  }
};

/**
 * Calculate UTM medium based on platform name using GA4 standards
 */
export const calculateUtmMedium = (platform: string): string => {
  const p = platform.toLowerCase().trim();
  
  if (/^(search|google|bing)$/.test(p)) return 'paid_search';
  if (/^(pmax)$/.test(p)) return 'cross-network';
  if (/^(youtube)$/.test(p)) return 'paid_video';
  if (/^(whatsapp|telegram)$/.test(p)) return 'messaging';
  if (/^(dgen)$/.test(p)) return 'display';
  if (/^(display|discovery)$/.test(p)) return 'display';
  if (/^(facebook|instagram|fb|ig|snap|tiktok|reddit|x|linkedin)$/.test(p)) return 'paid_social';
  
  return 'referral';
};

/**
 * Generate UTM campaign name in format: {campaign}_{monthyear}
 * Example: gold_oct2025
 */
export const generateUtmCampaign = (
  campaignName: string,
  date: Date = new Date()
): string => {
  const campaign = campaignName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const monthYear = formatMonthYear(date);
  
  return `${campaign}_${monthYear}`;
};

/**
 * Format date as MonthYear (e.g., "oct2025")
 */
export const formatMonthYear = (date: Date = new Date()): string => {
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${month}${year}`;
};

/**
 * Format date as readable MonthYear (e.g., "Oct2025")
 */
export const formatMonthYearReadable = (date: Date = new Date()): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${month}${year}`;
};

/**
 * Format date as: nov25 (2-digit year)
 */
export const formatMonthYear2Digit = (date: Date = new Date()): string => {
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const month = months[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  
  return `${month}${year}`;
};

/**
 * Format date as: November25 (full month name + 2-digit year)
 */
export const formatFullMonthYear2Digit = (date: Date = new Date()): string => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const month = months[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  
  return `${month}${year}`;
};

/**
 * Generate utm_content based on LP URL and campaign (Google Sheets formula)
 */
export const generateUtmContent = (
  lpUrl: string,
  campaignName: string
): string => {
  if (!lpUrl.trim()) {
    return "⚠️ Add LP URL";
  }

  // Strip query parameters and hash from URL before processing
  let cleanUrl = lpUrl;
  try {
    const urlWithProtocol = lpUrl.startsWith('http') ? lpUrl : `https://${lpUrl}`;
    const urlObj = new URL(urlWithProtocol);
    cleanUrl = urlObj.pathname; // Use only the pathname (no query or hash)
  } catch (e) {
    // If URL parsing fails, try to remove query string manually
    cleanUrl = lpUrl.split('?')[0].split('#')[0];
  }

  const parts = cleanUrl.split('/').filter(p => p.trim() !== '');
  const slug = parts[parts.length - 1];

  if (/^\d+$/.test(slug)) {
    return campaignName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  return slug.toLowerCase().replace(/[^a-z0-9]/g, '_');
};

/**
 * Generate utm_campaign by purpose - NEW FORMAT: platform_campaignname_monthYY
 */
export const generateUtmCampaignByPurpose = (
  purpose: 'AO' | 'Webinar' | 'Seminar',
  platform: string,
  campaignName?: string,
  webinarName?: string,
  city?: string,
  date: Date = new Date()
): string => {
  const platformPrefix = platform.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  if (purpose === 'AO' && campaignName) {
    return `${platformPrefix}_${campaignName.toLowerCase()}_${formatMonthYear2Digit(date)}`;
  }
  if (purpose === 'Webinar' && webinarName) {
    const cleanName = webinarName.toLowerCase().replace(/\s+/g, '');
    return `${platformPrefix}_${cleanName}_${formatMonthYear2Digit(date)}`;
  }
  if (purpose === 'Seminar' && city) {
    return `${platformPrefix}_${city}Seminar_${formatFullMonthYear2Digit(date)}`;
  }
  return '';
};

/**
 * Detect entity and LP type from URL
 */
export const detectEntityFromUrl = (url: string): {
  entity: string | null;
  lpType: 'static' | 'mauritius' | 'dynamic';
} => {
  const countryMap: Record<string, string> = {
    '/jo/': 'Jordan',
    '/lb/': 'Lebanon',
    '/mu/': 'Mauritius',
    '/vn/': 'Vietnam',
    '/iq/': 'Iraq',
    '/az/': 'Azerbaijan',
    '/uae/': 'UAE',
    '/kw/': 'Kuwait',
    '/uk/': 'UK',
    '/cy/': 'Cyprus',
    '/vu/': 'Vanuatu',
    '/ps/': 'Palestine',
    '/za/': 'South Africa',
  };

  // Check for country param (Static LP)
  for (const [param, entity] of Object.entries(countryMap)) {
    if (url.includes(param)) {
      return { entity, lpType: 'static' };
    }
  }

  // Check for language-only param (Mauritius LP)
  const langPattern = /\/(en|ar|es|fr|de|it|pt|ru|zh|ja|ko|vi|th|id|ms|tr|fa|ur|hi|bn|pa|ta|te|ml|kn|gu|mr|or|as|ne|si|my|km|lo|tl|sw|am|ha|yo|ig|zu|xh|st|tn|ss|nr|ve|ts|af)\//i;
  if (langPattern.test(url)) {
    return { entity: 'Mauritius', lpType: 'mauritius' };
  }

  // No country or language param = Dynamic LP
  return { entity: null, lpType: 'dynamic' };
};

/**
 * Build complete UTM URL from parameters
 */
export const buildUtmUrl = (params: {
  baseUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent?: string;
  utmTerm?: string;
  dynamicLanguage?: string;
  customParams?: Record<string, string>;
}): string => {
  try {
    if (!params.baseUrl || typeof params.baseUrl !== 'string') {
      throw new Error('Invalid base URL');
    }
    
    const cleanUrl = params.baseUrl.trim();
    const urlWithProtocol = cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
    const url = new URL(urlWithProtocol);
    
    // Remove any existing UTM parameters before adding new ones
    url.searchParams.delete('utm_source');
    url.searchParams.delete('utm_medium');
    url.searchParams.delete('utm_campaign');
    url.searchParams.delete('utm_content');
    url.searchParams.delete('utm_term');
    
    url.searchParams.set('utm_source', params.utmSource.toLowerCase());
    url.searchParams.set('utm_medium', params.utmMedium.toLowerCase());
    url.searchParams.set('utm_campaign', params.utmCampaign.toLowerCase());
    
    if (params.utmContent) {
      url.searchParams.set('utm_content', params.utmContent.toLowerCase());
    }
    
    if (params.utmTerm) {
      url.searchParams.set('utm_term', params.utmTerm.toLowerCase());
    }

    // Add &lang= for Dynamic LPs
    if (params.dynamicLanguage) {
      url.searchParams.set('lang', params.dynamicLanguage);
    }
    
    if (params.customParams) {
      Object.entries(params.customParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    
    return url.toString();
  } catch (error) {
    return params.baseUrl;
  }
};

/**
 * Country mapping for static LPs
 */
const STATIC_COUNTRY_CODES: Record<string, string> = {
  Jordan: 'jo',
  Lebanon: 'lb',
  Mauritius: 'mu',
  Vietnam: 'vn',
  Iraq: 'iq',
  Azerbaijan: 'az',
  UAE: 'uae',
  Kuwait: 'kw',
  UK: 'uk',
  Cyprus: 'cy',
  Vanuatu: 'vu',
  Palestine: 'ps',
  'South Africa': 'za',
};

/**
 * Generate country + language variants for static LPs
 * Creates 2 links per entity: EN and AR versions
 * 
 * Input: cfi.trade/jo/en/open-account
 * Output: 28 links (14 entities × 2 languages)
 */
export const generateStaticLpVariants = (
  baseUrl: string,
  utmParams: {
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
    utmContent?: string;
    utmTerm?: string;
  }
): Array<{ entity: string; language: string; url: string }> => {
  // Detect current country code in URL
  const currentCode = Object.values(STATIC_COUNTRY_CODES).find(code => 
    baseUrl.includes(`/${code}/`)
  );

  if (!currentCode) return [];

  // Detect current language path
  const hasEnPath = baseUrl.includes('/en/');
  const hasArPath = baseUrl.includes('/ar/');
  const languagePath = hasEnPath ? '/en/' : hasArPath ? '/ar/' : null;

  const variants: Array<{ entity: string; language: string; url: string }> = [];

  // Generate 2 links per entity (EN + AR)
  Object.entries(STATIC_COUNTRY_CODES).forEach(([entity, code]) => {
    // EN version
    const enUrl = languagePath 
      ? baseUrl
          .replace(`/${currentCode}/`, `/${code}/`)
          .replace(languagePath, '/en/')
      : baseUrl.replace(`/${currentCode}/`, `/${code}/en/`);
    
    variants.push({
      entity,
      language: 'EN',
      url: buildUtmUrl({ baseUrl: enUrl, ...utmParams })
    });

    // AR version
    const arUrl = languagePath
      ? baseUrl
          .replace(`/${currentCode}/`, `/${code}/`)
          .replace(languagePath, '/ar/')
      : baseUrl.replace(`/${currentCode}/`, `/${code}/ar/`);
    
    variants.push({
      entity,
      language: 'AR',
      url: buildUtmUrl({ baseUrl: arUrl, ...utmParams })
    });
  });

  return variants;
};

/**
 * Generate language variants for dynamic LPs
 * Adds &lang=EN and &lang=AR to the URL
 */
export const generateDynamicLpVariants = (
  baseUrl: string,
  utmParams: {
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
    utmContent?: string;
    utmTerm?: string;
  }
): Array<{ language: 'EN' | 'AR'; url: string }> => {
  return [
    {
      language: 'EN',
      url: buildUtmUrl({ baseUrl, ...utmParams, dynamicLanguage: 'EN' })
    },
    {
      language: 'AR',
      url: buildUtmUrl({ baseUrl, ...utmParams, dynamicLanguage: 'AR' })
    }
  ];
};

/**
 * Generate language variants for Mauritius LPs
 * Replaces /en/ with /ar/ or vice-versa
 */
export const generateMauritiusLpVariants = (
  baseUrl: string,
  utmParams: {
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
    utmContent?: string;
    utmTerm?: string;
  }
): Array<{ language: string; url: string }> => {
  const hasEn = baseUrl.includes('/en/');
  const hasAr = baseUrl.includes('/ar/');
  
  const variants = [];
  
  if (hasEn) {
    variants.push({
      language: 'EN',
      url: buildUtmUrl({ baseUrl, ...utmParams })
    });
  }
  
  if (hasAr || hasEn) {
    variants.push({
      language: 'AR',
      url: buildUtmUrl({ 
        baseUrl: hasEn ? baseUrl.replace('/en/', '/ar/') : baseUrl,
        ...utmParams 
      })
    });
  }
  
  return variants;
};
