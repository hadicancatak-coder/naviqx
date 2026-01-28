import { logger } from '@/lib/logger';
import { normalizeUrl } from '@/lib/urlHelpers';

export interface LPDetectionResult {
  country: string | null;
  language: 'en' | 'ar' | null;
  purpose: 'AO' | 'Webinar' | 'Seminar' | null;
  domain: string;
  path: string;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
  extractedCity?: string;
  extractedWebinarName?: string;
  lpType: 'static' | 'dynamic';
}

const COUNTRY_CODES: Record<string, string> = {
  'ae': 'UAE',
  'jo': 'Jordan',
  'ps': 'Palestine',
  'lb': 'Lebanon',
  'kw': 'Kuwait',
  'qa': 'Qatar',
  'bh': 'Bahrain',
  'sa': 'Saudi Arabia',
  'om': 'Oman',
  'eg': 'Egypt',
  'iq': 'Iraq',
  'ye': 'Yemen',
};

function detectLanguage(url: string): 'en' | 'ar' | null {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('/ar/') || lowerUrl.includes('/ar?')) return 'ar';
  if (lowerUrl.includes('/en/') || lowerUrl.includes('/en?')) return 'en';
  return null;
}

function detectPurpose(url: string): 'AO' | 'Webinar' | 'Seminar' | null {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('/webinar/') || lowerUrl.includes('webinar')) return 'Webinar';
  if (lowerUrl.includes('/seminar/') || lowerUrl.includes('seminar')) return 'Seminar';
  return 'AO';
}

function detectCountryFromPath(url: string): string | null {
  const lowerUrl = url.toLowerCase();
  
  // Try to match country code pattern like /ae/ or /ps/
  const matches = lowerUrl.match(/\/([a-z]{2})\//);
  if (matches && COUNTRY_CODES[matches[1]]) {
    return COUNTRY_CODES[matches[1]];
  }
  
  return null;
}

function extractSeminarCity(url: string): string | null {
  const match = url.match(/\/seminar\/([a-z]+)/i);
  if (!match) return null;
  
  const city = match[1];
  // Capitalize first letter
  return city.charAt(0).toUpperCase() + city.slice(1);
}

function extractWebinarName(url: string): string | null {
  const match = url.match(/\/webinar\/([a-z-]+)/i);
  if (!match) return null;
  
  // Convert hyphenated string to Title Case
  return match[1]
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function detectLPMetadata(url: string): LPDetectionResult {
  let domain = '';
  let path = '';
  
  try {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      throw new Error('Invalid URL: URL cannot be empty');
    }
    
    const urlObj = new URL(normalizeUrl(url));
    domain = urlObj.hostname;
    path = urlObj.pathname;
  } catch (e) {
    logger.error('URL parsing error in detectLPMetadata:', e);
    // Invalid URL
    return {
      country: null,
      language: null,
      purpose: null,
      domain: '',
      path: '',
      confidence: 'low',
      warnings: ['Invalid URL format'],
      lpType: 'static',
    };
  }
  
  const language = detectLanguage(url);
  const purpose = detectPurpose(url);
  const country = detectCountryFromPath(url);
  
  // Detect if static or dynamic
  // Static: has /en/country/ pattern (e.g., campaigns.cfifinancial.com/en/lb/)
  // Dynamic: cfi.trade with no country path, uses ?lang= param
  const isStatic = domain.includes('campaigns.cfifinancial.com') || (language !== null && country !== null);
  const lpType: 'static' | 'dynamic' = isStatic ? 'static' : 'dynamic';
  
  const warnings: string[] = [];
  
  // EN vs AR have different tracking numbers
  if (language === 'ar') {
    warnings.push('Arabic LPs use different tracking numbers than English');
  }
  
  // EN and AR webinars especially have different registration numbers
  if (purpose === 'Webinar') {
    warnings.push('EN and AR webinar LPs have different registration numbers');
  }
  
  let extractedCity: string | undefined;
  let extractedWebinarName: string | undefined;
  
  if (purpose === 'Seminar') {
    extractedCity = extractSeminarCity(url) || undefined;
  }
  
  if (purpose === 'Webinar') {
    extractedWebinarName = extractWebinarName(url) || undefined;
  }
  
  const confidence: 'high' | 'medium' | 'low' = 
    (country && language && purpose) ? 'high' :
    (language && purpose) ? 'medium' : 'low';
  
  return {
    country,
    language,
    purpose,
    domain,
    path,
    confidence,
    warnings,
    extractedCity,
    extractedWebinarName,
    lpType,
  };
}
