// Ad Quality Score Calculator for Google Search Ads
// Scores ads 0-100 based on best practices

export interface AdStrengthResult {
  score: number;
  strength: 'poor' | 'average' | 'good' | 'excellent';
  suggestions: string[];
  breakdown: {
    headlines: number;
    descriptions: number;
    sitelinks: number;
    callouts: number;
  };
}

export const calculateAdStrength = (
  headlines: string[],
  descriptions: string[],
  sitelinks: string[],
  callouts: string[]
): AdStrengthResult => {
  const suggestions: string[] = [];
  const breakdown = {
    headlines: 0,
    descriptions: 0,
    sitelinks: 0,
    callouts: 0,
  };

  // Headlines scoring (40 points max)
  const validHeadlines = headlines.filter(h => h.trim().length > 0);
  if (validHeadlines.length >= 15) {
    breakdown.headlines = 40;
  } else if (validHeadlines.length >= 10) {
    breakdown.headlines = 30;
    suggestions.push('Add 5+ more headlines to reach "Excellent" (15 total recommended)');
  } else if (validHeadlines.length >= 5) {
    breakdown.headlines = 20;
    suggestions.push('Add more headlines (at least 10 recommended)');
  } else {
    breakdown.headlines = 10;
    suggestions.push('Add more headlines (minimum 5, recommended 15)');
  }

  // Check for uniqueness (Google's #1 priority)
  const uniqueHeadlines = new Set(validHeadlines.map(h => h.toLowerCase()));
  if (uniqueHeadlines.size < validHeadlines.length) {
    suggestions.push('Remove duplicate headlines - Google prioritizes unique variations');
    breakdown.headlines = Math.max(0, breakdown.headlines - 5);
  }

  // Check character utilization - Google favors well-utilized headlines
  const shortHeadlines = validHeadlines.filter(h => h.length < 20);
  if (shortHeadlines.length > validHeadlines.length / 2) {
    suggestions.push('Use more characters in headlines (25-30 optimal) for better performance');
  }

  // Check for variety in headline types
  const hasQuestions = validHeadlines.some(h => /^(what|how|why|when|where|who)/i.test(h.trim()));
  const hasCTAs = validHeadlines.some(h => /(get|try|start|buy|learn|discover|find|shop)/i.test(h));
  const hasNumbers = validHeadlines.some(h => /\d/.test(h));
  const hasBenefits = validHeadlines.some(h => /(free|save|best|top|trusted|award|guarantee)/i.test(h));
  
  const varietyCount = [hasQuestions, hasCTAs, hasNumbers, hasBenefits].filter(Boolean).length;
  if (varietyCount < 2 && validHeadlines.length >= 5) {
    suggestions.push('Add variety: mix questions, CTAs, benefits, and specific numbers');
  }

  // Context-aware number suggestion (only if relevant)
  const hasPricing = validHeadlines.some(h => /\$|price|cost|save|discount|%/i.test(h));
  if (!hasNumbers && hasPricing && validHeadlines.length >= 5) {
    suggestions.push('Add specific numbers to pricing headlines (e.g., "Save 20%")');
  }

  // Descriptions scoring (30 points max)
  const validDescriptions = descriptions.filter(d => d.trim().length > 0);
  if (validDescriptions.length >= 4) {
    breakdown.descriptions = 30;
  } else if (validDescriptions.length >= 2) {
    breakdown.descriptions = 20;
    suggestions.push('Add 2+ more descriptions (4 total recommended)');
  } else {
    breakdown.descriptions = 10;
    suggestions.push('Add more descriptions (minimum 2, recommended 4)');
  }

  // Check description length utilization
  const shortDescriptions = validDescriptions.filter(d => d.length < 60);
  if (shortDescriptions.length > 0) {
    suggestions.push(`${shortDescriptions.length} description(s) are short - use full 90 characters when possible`);
  }

  // Sitelinks scoring (15 points max)
  const validSitelinks = sitelinks.filter(s => s.trim().length > 0);
  if (validSitelinks.length >= 4) {
    breakdown.sitelinks = 15;
  } else if (validSitelinks.length >= 2) {
    breakdown.sitelinks = 10;
    suggestions.push('Add more sitelinks (4 recommended for best visibility)');
  } else if (validSitelinks.length > 0) {
    breakdown.sitelinks = 5;
    suggestions.push('Add at least 4 sitelinks for better ad real estate');
  } else {
    suggestions.push('Add sitelinks to increase ad visibility and CTR');
  }

  // Callouts scoring (15 points max)
  const validCallouts = callouts.filter(c => c.trim().length > 0);
  if (validCallouts.length >= 4) {
    breakdown.callouts = 15;
  } else if (validCallouts.length >= 2) {
    breakdown.callouts = 10;
    suggestions.push('Add more callouts (4-6 recommended)');
  } else if (validCallouts.length > 0) {
    breakdown.callouts = 5;
    suggestions.push('Add at least 4 callouts to highlight key benefits');
  } else {
    suggestions.push('Add callouts (e.g., "24/7 Support", "Free Demo")');
  }

  // Calculate total score
  const score = breakdown.headlines + breakdown.descriptions + breakdown.sitelinks + breakdown.callouts;

  // Determine strength level (aligned with Google's tiers)
  let strength: 'poor' | 'average' | 'good' | 'excellent';
  if (score >= 80) {
    strength = 'excellent';
  } else if (score >= 60) {
    strength = 'good';
  } else if (score >= 40) {
    strength = 'average';
  } else {
    strength = 'poor';
  }

  return {
    score,
    strength,
    suggestions: suggestions.slice(0, 5), // Top 5 suggestions
    breakdown,
  };
};

// ==========================================
// Ad Relevancy Warnings
// ==========================================

export interface QualityWarning {
  severity: 'info' | 'warning';
  category: 'relevancy' | 'intent' | 'policy';
  message: string;
}

export const checkAdRelevancy = (
  headlines: string[],
  descriptions: string[]
): QualityWarning[] => {
  const warnings: QualityWarning[] = [];
  const validHeadlines = headlines.filter(h => h.trim());
  const validDescriptions = descriptions.filter(d => d.trim());

  // Headline variety check
  const hasQuestions = validHeadlines.some(h => /^(what|how|why|when|where|who)/i.test(h.trim()) || h.includes('?'));
  const hasCTAs = validHeadlines.some(h => /(get|try|start|buy|learn|discover|find|shop|book|apply)/i.test(h));
  const hasNumbers = validHeadlines.some(h => /\d/.test(h));
  const hasBenefits = validHeadlines.some(h => /(free|save|best|top|trusted|award|guarantee|exclusive)/i.test(h));

  const varietyCount = [hasQuestions, hasCTAs, hasNumbers, hasBenefits].filter(Boolean).length;

  if (validHeadlines.length >= 3 && varietyCount < 2) {
    warnings.push({
      severity: 'warning',
      category: 'relevancy',
      message: 'Low headline variety — mix questions, CTAs, benefits, and numbers for better CTR',
    });
  }

  if (!hasCTAs && validHeadlines.length >= 3) {
    warnings.push({
      severity: 'warning',
      category: 'relevancy',
      message: 'No CTA headlines found — add action-driven headlines (e.g., "Get Started", "Shop Now")',
    });
  }

  // Description CTA presence
  const descriptionHasCTA = validDescriptions.some(d =>
    /(get|try|start|buy|learn|discover|find|shop|book|apply|sign up|register|call|contact)/i.test(d)
  );
  if (validDescriptions.length >= 1 && !descriptionHasCTA) {
    warnings.push({
      severity: 'warning',
      category: 'relevancy',
      message: 'Descriptions lack a call-to-action — add CTA phrases to drive conversions',
    });
  }

  // Character utilization
  const avgHeadlineLength = validHeadlines.length > 0
    ? validHeadlines.reduce((sum, h) => sum + h.length, 0) / validHeadlines.length
    : 0;
  if (validHeadlines.length >= 3 && avgHeadlineLength < 18) {
    warnings.push({
      severity: 'info',
      category: 'relevancy',
      message: `Average headline length is ${Math.round(avgHeadlineLength)} chars — aim for 25-30 for better ad rank`,
    });
  }

  return warnings;
};

// ==========================================
// Intent Catch Warnings
// ==========================================

export const checkIntentCatch = (
  headlines: string[],
  keywords: string[],
  matchTypes: string[]
): QualityWarning[] => {
  const warnings: QualityWarning[] = [];
  const validHeadlines = headlines.filter(h => h.trim()).map(h => h.toLowerCase());
  const validKeywords = keywords.filter(k => k.trim()).map(k => k.toLowerCase());

  if (validKeywords.length === 0) return warnings;

  // Check if exact match is selected but no headline contains primary keyword verbatim
  if (matchTypes.includes('exact')) {
    const primaryKeyword = validKeywords[0];
    const hasExactInHeadline = validHeadlines.some(h => h.includes(primaryKeyword));
    if (!hasExactInHeadline && primaryKeyword) {
      warnings.push({
        severity: 'warning',
        category: 'intent',
        message: `Exact match selected but no headline contains "${validKeywords[0]}" — add it for better quality score`,
      });
    }
  }

  // Broad match check - headlines should have generic/broad terms
  if (matchTypes.includes('broad')) {
    const keywordCoverage = validKeywords.filter(kw =>
      validHeadlines.some(h => h.includes(kw))
    ).length;
    if (keywordCoverage < Math.min(2, validKeywords.length)) {
      warnings.push({
        severity: 'info',
        category: 'intent',
        message: 'Broad match selected — ensure headlines cover generic variations of your keywords',
      });
    }
  }

  // Phrase match check
  if (matchTypes.includes('phrase') && validKeywords.length > 0) {
    const phraseInHeadline = validKeywords.some(kw =>
      validHeadlines.some(h => h.includes(kw))
    );
    if (!phraseInHeadline) {
      warnings.push({
        severity: 'warning',
        category: 'intent',
        message: 'Phrase match selected but no headline contains your target phrases',
      });
    }
  }

  return warnings;
};

// ==========================================
// MENA Policy Warnings
// ==========================================

const MENA_POLICY_RULES: Record<string, QualityWarning[]> = {
  Lebanon: [
    { severity: 'warning', category: 'policy', message: 'Lebanon: Financial ads may require BDL (Banque du Liban) compliance disclaimers' },
    { severity: 'info', category: 'policy', message: 'Lebanon: Pharmaceutical/healthcare ads require Ministry of Health approval' },
    { severity: 'info', category: 'policy', message: 'Lebanon: Political and religious content faces stricter review' },
  ],
  Jordan: [
    { severity: 'warning', category: 'policy', message: 'Jordan: Financial services ads may require JSC (Securities Commission) disclosure' },
    { severity: 'info', category: 'policy', message: 'Jordan: Telecom ads must comply with TRC regulations' },
    { severity: 'warning', category: 'policy', message: 'Jordan: Real estate ads require JREI licensing disclosure' },
  ],
  Kuwait: [
    { severity: 'warning', category: 'policy', message: 'Kuwait: Financial ads require CBK (Central Bank) compliance' },
    { severity: 'warning', category: 'policy', message: 'Kuwait: Content modesty guidelines are stricter — avoid suggestive references' },
    { severity: 'info', category: 'policy', message: 'Kuwait: E-commerce ads must comply with Ministry of Commerce consumer rules' },
  ],
};

export const checkMENAPolicies = (entity: string): QualityWarning[] => {
  return MENA_POLICY_RULES[entity] || [];
};

// ==========================================
// Legacy exports (kept for backward compatibility)
// ==========================================

export interface ComplianceIssue {
  type: 'prohibited_word' | 'excessive_caps' | 'character_limit' | 'entity_specific';
  severity: 'error' | 'warning';
  message: string;
  field: string;
}

export interface HeadlinePattern {
  type: 'question' | 'cta' | 'number' | 'benefit' | 'emotional' | 'none';
  indicator: string;
  description: string;
  boost: number;
}

interface PositionRecommendation {
  message: string;
  isOptimal: boolean;
}

export const getHeadlinePositionRecommendation = (
  patternType: HeadlinePattern['type'],
  position: number
): PositionRecommendation | null => {
  const positionRecommendations: Record<number, Record<string, PositionRecommendation>> = {
    0: {
      cta: { message: 'CTAs get 25% better CTR in position 1', isOptimal: true },
      question: { message: 'Questions perform well in position 1', isOptimal: false },
    },
    1: {
      benefit: { message: 'Benefits resonate well in position 2', isOptimal: false },
      number: { message: 'Social proof works great here', isOptimal: false },
    },
    2: {
      emotional: { message: 'Emotional appeals close the sale', isOptimal: false },
      number: { message: 'Specific numbers increase credibility', isOptimal: false },
    },
  };

  return positionRecommendations[position]?.[patternType] || null;
};

export const detectHeadlinePattern = (headline: string): HeadlinePattern => {
  const text = headline.toLowerCase().trim();
  
  if (/^(what|how|why|when|where|who|can|do|does|is|are)\b/i.test(text) || text.endsWith('?')) {
    return { type: 'question', indicator: '❓', description: 'Question pattern - 20% higher CTR', boost: 20 };
  }
  
  if (/\b(buy|get|try|start|shop|save|join|subscribe|download|claim|discover|learn)\b/i.test(text)) {
    return { type: 'cta', indicator: '👆', description: 'Call-to-action - 25% higher CTR', boost: 25 };
  }
  
  if (/\d/.test(text)) {
    return { type: 'number', indicator: '🔢', description: 'Contains numbers - 15% higher CTR', boost: 15 };
  }
  
  if (/\b(free|save|best|top|new|exclusive|guaranteed|easy|fast|simple)\b/i.test(text)) {
    return { type: 'benefit', indicator: '💎', description: 'Benefit-focused - 10% higher CTR', boost: 10 };
  }
  
  if (/\b(love|amazing|perfect|incredible|trusted|popular|proven|award)\b/i.test(text)) {
    return { type: 'emotional', indicator: '❤️', description: 'Emotional appeal - 10% higher CTR', boost: 10 };
  }
  
  return { type: 'none', indicator: '', description: '', boost: 0 };
};

const PROHIBITED_WORDS = [
  '#1', 'guaranteed profits', 'no risk', 'free money', 'get rich quick',
  'scam', 'ponzi', 'pyramid', 'mlm', 'unlimited returns', 'risk-free',
  'guaranteed wins', 'insider', 'secret system', 'loophole'
];

export const checkCompliance = (
  headlines: string[],
  descriptions: string[],
  sitelinks: string[],
  callouts: string[],
  entity?: string
): ComplianceIssue[] => {
  const issues: ComplianceIssue[] = [];

  const allFields = [
    ...headlines.map(h => ({ text: h, field: 'headline' })),
    ...descriptions.map(d => ({ text: d, field: 'description' })),
    ...sitelinks.map(s => ({ text: s, field: 'sitelink' })),
    ...callouts.map(c => ({ text: c, field: 'callout' })),
  ];

  allFields.forEach(({ text, field }) => {
    const lowerText = text.toLowerCase();

    PROHIBITED_WORDS.forEach(word => {
      if (lowerText.includes(word)) {
        issues.push({
          type: 'prohibited_word',
          severity: 'error',
          message: `Prohibited word "${word}" found in ${field}`,
          field,
        });
      }
    });

    const words = text.split(' ');
    let capsCount = 0;
    for (const word of words) {
      if (word === word.toUpperCase() && word.length > 1) {
        capsCount++;
        if (capsCount > 2) {
          issues.push({
            type: 'excessive_caps',
            severity: 'warning',
            message: `Excessive capitalization in ${field} - Google may disapprove`,
            field,
          });
          break;
        }
      } else {
        capsCount = 0;
      }
    }
  });

  if (entity === 'UK' || entity === 'United Kingdom') {
    const hasRegulationMention = allFields.some(f => 
      f.text.toLowerCase().includes('fca') || f.text.toLowerCase().includes('regulated')
    );
    if (!hasRegulationMention) {
      issues.push({ type: 'entity_specific', severity: 'warning', message: 'UK financial ads should mention FCA regulation', field: 'general' });
    }
  }

  if (entity === 'UAE' || entity === 'United Arab Emirates') {
    const hasRegulationMention = allFields.some(f => 
      f.text.toLowerCase().includes('dfsa') || f.text.toLowerCase().includes('sca')
    );
    if (!hasRegulationMention) {
      issues.push({ type: 'entity_specific', severity: 'warning', message: 'UAE financial ads should mention DFSA or SCA regulation', field: 'general' });
    }
  }

  return issues;
};

// Display Ad Compliance Checker
export const checkDisplayAdCompliance = (
  longHeadline: string,
  shortHeadlines: string[],
  descriptions: string[],
  ctaText: string,
  entity: string
) => {
  const issues: string[] = [];
  
  if (!ctaText || ctaText.trim() === '') {
    issues.push('⚠️ CRITICAL: Call-to-Action (CTA) is required for Google Display ads');
  }
  
  const validShortHeadlines = shortHeadlines.filter(h => h.trim());
  const ctaHeadlineCount = validShortHeadlines.filter(h => 
    /\b(buy|get|try|start|shop|save|join|subscribe|download|claim|discover|learn|book|apply)\b/i.test(h)
  ).length;
  
  if (validShortHeadlines.length > 0 && ctaHeadlineCount === 0) {
    issues.push('⚠️ WARNING: Consider adding CTA-focused headlines (e.g., "Get Started", "Shop Now", "Learn More")');
  }
  
  if (longHeadline.trim() && longHeadline.length < 30) {
    issues.push('💡 TIP: Long headline is short. Use 60-90 characters for better impact.');
  }
  
  if (validShortHeadlines.length < 3) {
    issues.push('💡 TIP: Add at least 3 short headlines for better ad variations');
  }
  
  const validDescriptions = descriptions.filter(d => d.trim());
  if (validDescriptions.length < 3) {
    issues.push('💡 TIP: Add at least 3 descriptions for better ad combinations');
  }
  
  return issues;
};
