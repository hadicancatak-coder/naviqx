/**
 * Entity URL Transformer
 * Handles URL transformations between entities and languages
 */
import { logger } from '@/lib/logger';

export interface EntityMapping {
  code: string;
  name: string;
  websiteParam: string | null;
  urlCodes: string[];
}

export interface TransformOptions {
  sourceEntity: string;
  targetEntity: string;
  language: 'en' | 'ar' | 'keep';
}

export interface UrlPattern {
  language: 'en' | 'ar' | null;
  entity: string | null;
  pattern: 'path' | 'subdomain' | 'none';
}

// Common entity URL code mappings
export const ENTITY_URL_MAPPINGS: Record<string, string[]> = {
  kuwait: ['kw', 'kuwait'],
  uae: ['uae', 'ae'],
  jordan: ['jordan', 'jo'],
  lebanon: ['lebanon', 'lb'],
  bahrain: ['bahrain', 'bh'],
  qatar: ['qatar', 'qa'],
  south_africa: ['za', 'south-africa'],
  palestine: ['palestine', 'ps'],
  azerbaijan: ['azerbaijan', 'az'],
  mauritius: ['mauritius', 'mu'],
};

/**
 * Detect URL pattern and extract language/entity
 */
export function detectUrlPattern(url: string): UrlPattern {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    
    // Check for path-based pattern: /en/kw/ or /ar/uae/
    if (pathSegments.length >= 2) {
      const firstSegment = pathSegments[0].toLowerCase();
      const secondSegment = pathSegments[1].toLowerCase();
      
      if ((firstSegment === 'en' || firstSegment === 'ar')) {
        return {
          language: firstSegment as 'en' | 'ar',
          entity: secondSegment,
          pattern: 'path',
        };
      }
    }
    
    // Check for subdomain pattern: kw.cfdibahrain.com
    const hostnameParts = urlObj.hostname.split('.');
    if (hostnameParts.length >= 3) {
      const subdomain = hostnameParts[0].toLowerCase();
      
      // Check if subdomain matches any entity code
      for (const [entityCode, urlCodes] of Object.entries(ENTITY_URL_MAPPINGS)) {
        if (urlCodes.includes(subdomain)) {
          return {
            language: null,
            entity: subdomain,
            pattern: 'subdomain',
          };
        }
      }
    }
    
    return {
      language: null,
      entity: null,
      pattern: 'none',
    };
  } catch (error) {
    logger.error('Error detecting URL pattern:', error);
    return {
      language: null,
      entity: null,
      pattern: 'none',
    };
  }
}

/**
 * Transform URL between entities and languages
 */
export function transformEntityUrl(
  url: string,
  options: TransformOptions,
  entities: EntityMapping[]
): string {
  try {
    const urlObj = new URL(url);
    const pattern = detectUrlPattern(url);
    
    if (pattern.pattern === 'none') {
      logger.warn('URL pattern not recognized, returning original URL');
      return url;
    }
    
    // Find source and target entity mappings
    const sourceEntityData = entities.find(e => e.code === options.sourceEntity);
    const targetEntityData = entities.find(e => e.code === options.targetEntity);
    
    if (!sourceEntityData || !targetEntityData) {
      logger.warn('Source or target entity not found');
      return url;
    }
    
    const sourceUrlCodes = ENTITY_URL_MAPPINGS[options.sourceEntity] || [options.sourceEntity];
    const targetUrlCodes = ENTITY_URL_MAPPINGS[options.targetEntity] || [options.targetEntity];
    const targetUrlCode = targetUrlCodes[0]; // Use primary code
    
    let newPathname = urlObj.pathname;
    
    if (pattern.pattern === 'path') {
      // Path-based transformation: /en/kw/ -> /ar/uae/
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      
      if (pathSegments.length >= 2) {
        // Replace language if needed
        if (options.language !== 'keep') {
          pathSegments[0] = options.language;
        }
        
        // Replace entity code
        if (sourceUrlCodes.includes(pathSegments[1].toLowerCase())) {
          pathSegments[1] = targetUrlCode;
        }
        
        newPathname = '/' + pathSegments.join('/');
      }
    } else if (pattern.pattern === 'subdomain') {
      // Subdomain-based transformation: kw.domain.com -> uae.domain.com
      const hostnameParts = urlObj.hostname.split('.');
      
      if (sourceUrlCodes.includes(hostnameParts[0].toLowerCase())) {
        hostnameParts[0] = targetUrlCode;
        urlObj.hostname = hostnameParts.join('.');
      }
    }
    
    urlObj.pathname = newPathname;
    return urlObj.toString();
  } catch (error) {
    logger.error('Error transforming URL:', error);
    return url;
  }
}

/**
 * Get entity name from URL code
 */
export function getEntityFromUrlCode(urlCode: string): string | null {
  for (const [entityCode, urlCodes] of Object.entries(ENTITY_URL_MAPPINGS)) {
    if (urlCodes.includes(urlCode.toLowerCase())) {
      return entityCode;
    }
  }
  return null;
}

/**
 * Get primary URL code for entity
 */
export function getUrlCodeForEntity(entityCode: string): string {
  const codes = ENTITY_URL_MAPPINGS[entityCode];
  return codes ? codes[0] : entityCode;
}
