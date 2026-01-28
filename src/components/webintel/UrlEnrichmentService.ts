import { logger } from "@/lib/logger";

export interface EnrichmentResult {
  category: string;
  estimatedTraffic: number | null;
  detectedType: 'Website' | 'App' | 'Portal' | 'Forum';
}

const CATEGORY_PATTERNS: Record<string, string[]> = {
  'Trading': ['trading', 'forex', 'stock', 'crypto', 'invest', 'broker', 'exchange', 'finance', 'market'],
  'Business': ['business', 'enterprise', 'company', 'corporate', 'b2b', 'professional', 'services'],
  'App': ['app', 'mobile', 'android', 'ios', 'application', 'download', 'play', 'store'],
};

const detectCategory = (domain: string, url: string): string => {
  const searchText = (domain + ' ' + url).toLowerCase();
  
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (patterns.some(pattern => searchText.includes(pattern))) {
      return category;
    }
  }
  
  return 'Generic';
};

const detectType = (domain: string, url: string): 'Website' | 'App' | 'Portal' | 'Forum' => {
  const searchText = (domain + ' ' + url).toLowerCase();
  
  // Check for app stores
  if (searchText.includes('apps.apple.com') || 
      searchText.includes('play.google.com') ||
      searchText.includes('app.')) {
    return 'App';
  }
  
  // Check for forums
  if (searchText.includes('forum') || 
      searchText.includes('discuss') ||
      searchText.includes('community') ||
      searchText.includes('reddit')) {
    return 'Forum';
  }
  
  // Check for portals
  if (searchText.includes('portal') || 
      searchText.includes('gateway') ||
      searchText.includes('hub')) {
    return 'Portal';
  }
  
  return 'Website';
};

const estimateTraffic = (domain: string): number | null => {
  // Simple estimation based on popular domains
  // In production, this would use an API like SimilarWeb
  const popularSites: Record<string, number> = {
    'google.com': 100000000000,
    'youtube.com': 50000000000,
    'facebook.com': 30000000000,
    'instagram.com': 20000000000,
    'twitter.com': 15000000000,
    'linkedin.com': 10000000000,
    'amazon.com': 8000000000,
    'wikipedia.org': 5000000000,
    'cnn.com': 2500000000,
    'bbc.com': 2000000000,
    'gulfnews.com': 2500000,
    'khaleejtimes.com': 2000000,
    'arabianbusiness.com': 1500000,
  };
  
  const cleanDomain = domain.replace('www.', '').toLowerCase();
  
  return popularSites[cleanDomain] || null;
};

export const enrichUrl = async (url: string): Promise<EnrichmentResult> => {
  try {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      throw new Error('Invalid URL: URL cannot be empty');
    }
    
    const cleanUrl = url.trim();
    const urlWithProtocol = cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
    const urlObj = new URL(urlWithProtocol);
    const domain = urlObj.hostname;
    
    const category = detectCategory(domain, url);
    const detectedType = detectType(domain, url);
    const estimatedTraffic = estimateTraffic(domain);
    
    return {
      category,
      detectedType,
      estimatedTraffic,
    };
  } catch (error) {
    logger.error('URL enrichment failed:', error);
    return {
      category: 'Generic',
      detectedType: 'Website',
      estimatedTraffic: null,
    };
  }
};
