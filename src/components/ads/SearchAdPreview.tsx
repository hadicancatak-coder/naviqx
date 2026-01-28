import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe } from 'lucide-react';
import { renderDKI } from '@/lib/dkiRenderer';

interface SearchAdPreviewProps {
  headlines: string[];
  descriptions: string[];
  landingPage: string;
  businessName?: string;
  sitelinks?: ({ description: string; link: string } | { text: string; url: string } | string)[];
  callouts?: string[];
}

const parseUrlSafely = (url: string | null | undefined): { hostname: string; pathname: string } => {
  if (!url || !url.trim()) {
    return { hostname: 'example.com', pathname: '' };
  }
  
  try {
    const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
    const parsedUrl = new URL(urlWithProtocol);
    return {
      hostname: parsedUrl.hostname.replace('www.', ''),
      pathname: parsedUrl.pathname
    };
  } catch {
    // Invalid URL - fallback to simple parsing
    return { hostname: url.split('/')[0] || 'example.com', pathname: '' };
  }
};

export function SearchAdPreview(props: SearchAdPreviewProps) {
  const { hostname: displayUrl, pathname: pathUrl } = parseUrlSafely(props.landingPage);
  
  // Render DKI templates with sample keyword
  const sampleKeyword = "Premium Services";
  const renderedHeadlines = props.headlines.map(h => {
    if (h.includes('{KW}') || h.includes('{kw}') || h.includes('{Kw}') || h.includes('{DEFAULT:')) {
      const result = renderDKI(h, sampleKeyword);
      return result.rendered;
    }
    return h;
  });
  
  // Get first 3 headlines and 2 descriptions (Google Ads limit)
  const activeHeadlines = renderedHeadlines.filter(h => h.trim()).slice(0, 3);
  const activeDescriptions = props.descriptions.filter(d => d.trim()).slice(0, 2);
  const activeSitelinks = (props.sitelinks || [])
    .filter(s => {
      if (typeof s === 'string') return s.trim();
      if ('description' in s) return s.description.trim() || s.link.trim();
      return s.text.trim();
    })
    .slice(0, 4);
  const activeCallouts = (props.callouts || []).filter(c => c.trim()).slice(0, 4);

  return (
    <div className="space-y-md">
      {/* Desktop Preview */}
      <div>
        <div className="flex items-center gap-sm mb-sm">
          <Badge variant="outline" className="text-metadata">Desktop</Badge>
          <span className="text-metadata text-muted-foreground">Google Search Results</span>
        </div>
        <Card className="p-md bg-background border">
          <div className="space-y-xs">
            {/* Ad badge */}
            <div className="flex items-center gap-xs">
              <Badge variant="outline" className="text-metadata font-normal">Ad</Badge>
            </div>
            
            {/* URL */}
            <div className="flex items-center gap-sm text-body-sm">
              <Globe className="h-3 w-3 text-muted-foreground" />
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">{displayUrl}</span>
              <span className="text-muted-foreground">{pathUrl}</span>
            </div>
            
            {/* Headline (3 headlines joined with " | ") */}
            <h3 className="text-xl text-primary hover:underline cursor-pointer font-normal">
              {activeHeadlines.length > 0 
                ? activeHeadlines.join(' | ')
                : 'Headline 1 | Headline 2 | Headline 3'}
            </h3>
            
            {/* Descriptions */}
            <div className="text-body-sm text-foreground space-y-xs">
              {activeDescriptions.map((desc, idx) => (
                <p key={idx}>{desc}</p>
              ))}
              {activeDescriptions.length === 0 && (
                <>
                  <p>Your first description will appear here</p>
                  <p>Your second description will appear here</p>
                </>
              )}
            </div>

            {/* Sitelinks */}
            {activeSitelinks.length > 0 && (
              <div className="grid grid-cols-2 gap-sm pt-sm border-t mt-sm">
                {activeSitelinks.map((link, idx) => (
                  <div key={idx} className="text-body-sm">
                    <p className="text-primary hover:underline cursor-pointer truncate">
                      {typeof link === 'string' 
                        ? link 
                        : 'description' in link 
                          ? link.description 
                          : link.text}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Callouts */}
            {activeCallouts.length > 0 && (
              <div className="flex flex-wrap gap-sm pt-sm">
                {activeCallouts.map((callout, idx) => (
                  <span key={idx} className="text-metadata text-muted-foreground">
                    {callout}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Mobile Preview */}
      <div>
        <div className="flex items-center gap-sm mb-sm">
          <Badge variant="outline" className="text-metadata">Mobile</Badge>
          <span className="text-metadata text-muted-foreground">Google Mobile Search</span>
        </div>
        <Card className="p-sm bg-background border max-w-[380px]">
          <div className="space-y-xs">
            {/* Ad badge */}
            <Badge variant="outline" className="text-metadata font-normal mb-xs">Ad</Badge>
            
            {/* URL */}
            <div className="text-metadata text-emerald-700 dark:text-emerald-400 font-medium">
              {displayUrl}
            </div>
            
            {/* Headline - mobile shows shorter version */}
            <h3 className="text-heading-sm text-primary font-normal line-clamp-2">
              {activeHeadlines.length > 0 
                ? activeHeadlines.slice(0, 2).join(' | ')
                : 'Headline 1 | Headline 2'}
            </h3>
            
            {/* Description - only first one on mobile */}
            <p className="text-body-sm text-foreground line-clamp-2">
              {activeDescriptions[0] || 'Your description will appear here'}
            </p>

            {/* Sitelinks - 2 on mobile */}
            {activeSitelinks.length > 0 && (
              <div className="grid grid-cols-2 gap-sm pt-sm border-t mt-sm">
                {activeSitelinks.slice(0, 2).map((link, idx) => (
                  <p key={idx} className="text-metadata text-primary hover:underline cursor-pointer truncate">
                    {typeof link === 'string' 
                      ? link 
                      : 'description' in link 
                        ? link.description 
                        : link.text}
                  </p>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
