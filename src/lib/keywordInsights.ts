/**
 * Keyword Insights Engine v2
 * 
 * Deterministic computation of unified actions for Google Ads.
 * 
 * KEY CHANGES:
 * - 7 distinct action types: move, isolate, adjust_ad_copy, adjust_landing_page, add_negative, review_manually, no_action
 * - ABSOLUTE SAFEGUARDS: Competitors and Education keywords NEVER get auto-negatived
 * - no_money_intent always gets Add Negative (highest priority)
 * - Canonical action decision order
 */

import { ProcessedKeyword, normalizeTerm, isNoMoneyIntent } from './keywordEngine';

// =====================================================
// CONFIGURATION PRESETS
// =====================================================

export type InsightsPreset = 'conservative' | 'balanced' | 'aggressive';

export interface InsightsConfig {
  minCostForReview: number;           // Min cost to even consider a term
  wastedSpendThreshold: number;       // Cost with 0 conversions = "wasted"
  minCostForNegative: number;         // Min cost before suggesting negative
  highCostThreshold: number;          // High cost for performance-based negatives
  cpaCap: number;                     // Max CPA before suggesting negative
}

export const INSIGHTS_PRESETS: Record<InsightsPreset, InsightsConfig> = {
  conservative: {
    minCostForReview: 50,
    wastedSpendThreshold: 200,
    minCostForNegative: 100,
    highCostThreshold: 500,
    cpaCap: 500,
  },
  balanced: {
    minCostForReview: 20,
    wastedSpendThreshold: 100,
    minCostForNegative: 50,
    highCostThreshold: 500,
    cpaCap: 500,
  },
  aggressive: {
    minCostForReview: 10,
    wastedSpendThreshold: 50,
    minCostForNegative: 20,
    highCostThreshold: 300,
    cpaCap: 300,
  },
};

export const DEFAULT_INSIGHTS_CONFIG = INSIGHTS_PRESETS.balanced;

// =====================================================
// ACTION TYPES (NEW - 7 DISTINCT TYPES)
// =====================================================

export type ActionType = 
  | 'move' 
  | 'isolate' 
  | 'adjust_ad_copy' 
  | 'adjust_landing_page' 
  | 'add_negative' 
  | 'review_manually' 
  | 'no_action';

export interface UnifiedAction {
  id: string;
  search_term: string;
  current_campaign: string | null;
  current_ad_group: string | null;
  cluster: string;
  intent: string;
  
  // Action decision
  action_type: ActionType;
  target: string;                    // AG to move to, or scope for negative (Campaign/Account)
  reason: string;                    // Human readable
  rule_triggered: string;            // Machine readable (e.g. "NO_MONEY_INTENT")
  confidence: number;                // 0–1
  
  // Evidence
  evidence_cost: number;
  evidence_clicks: number;
  evidence_conversions: number;
  evidence_cpa: number | null;
}

// =====================================================
// EXECUTIVE SUMMARY
// =====================================================

export interface ExecutiveSummary {
  bullets: { icon: 'red' | 'yellow' | 'green'; text: string }[];
  totalSpend: number;
  totalWasted: number;
  totalMisplacedSpend: number;
  totalActions: number;
  moveActions: number;
  negativeActions: number;
  isolateActions: number;
  reviewActions: number;
}

// =====================================================
// CONFIDENCE STATS
// =====================================================

export interface ConfidenceStats {
  dictionaryMatched: number;
  regexMatched: number;
  otherMatched: number;
  totalTerms: number;
  dictionaryPercent: number;
  regexPercent: number;
  otherPercent: number;
}

export function computeConfidenceStats(keywords: ProcessedKeyword[]): ConfidenceStats {
  let dictionaryMatched = 0;
  let regexMatched = 0;
  let otherMatched = 0;

  for (const kw of keywords) {
    if (kw.confidence >= 1.0 || kw.matched_rule.startsWith('DICT:')) {
      dictionaryMatched++;
    } else if (kw.confidence >= 0.9 || kw.matched_rule.startsWith('REGEX:')) {
      regexMatched++;
    } else {
      otherMatched++;
    }
  }

  const total = keywords.length || 1;
  return {
    dictionaryMatched,
    regexMatched,
    otherMatched,
    totalTerms: keywords.length,
    dictionaryPercent: (dictionaryMatched / total) * 100,
    regexPercent: (regexMatched / total) * 100,
    otherPercent: (otherMatched / total) * 100,
  };
}

// =====================================================
// AD GROUP INTENT DETECTION
// =====================================================

interface AdGroupIntent {
  expectedClusters: string[];  // Clusters that belong in this ad group
  label: string;               // Human-readable label for the ad group intent
}

/**
 * Parse an ad group name to understand what cluster/topic it's meant to target.
 */
function parseAdGroupIntent(agName: string): AdGroupIntent | null {
  if (!agName) return null;
  
  const norm = agName.toLowerCase().trim();
  
  // Commodity - Gold variations
  if (/\b(gold|xau|xauusd)\b/i.test(norm)) {
    return { expectedClusters: ['Commodity - Gold', 'Gold', 'XAU'], label: 'Gold' };
  }
  
  // Commodity - Silver
  if (/\b(silver|xag)\b/i.test(norm)) {
    return { expectedClusters: ['Commodity - Silver', 'Silver', 'XAG'], label: 'Silver' };
  }
  
  // Commodity - Oil
  if (/\b(oil|crude|wti|brent)\b/i.test(norm)) {
    return { expectedClusters: ['Commodity - Oil', 'Oil', 'Crude', 'WTI', 'Brent'], label: 'Oil' };
  }
  
  // Crypto - Bitcoin
  if (/\b(bitcoin|btc)\b/i.test(norm) && !/\b(eth|ethereum|crypto)\b/i.test(norm)) {
    return { expectedClusters: ['Crypto - Bitcoin', 'Bitcoin', 'BTC', 'Crypto'], label: 'Bitcoin' };
  }
  
  // Crypto - Ethereum
  if (/\b(ethereum|eth)\b/i.test(norm)) {
    return { expectedClusters: ['Crypto - Ethereum', 'Ethereum', 'ETH', 'Crypto'], label: 'Ethereum' };
  }
  
  // Crypto - General
  if (/\b(crypto|cryptocurrency)\b/i.test(norm)) {
    return { expectedClusters: ['Crypto', 'Crypto - Bitcoin', 'Crypto - Ethereum', 'Bitcoin', 'Ethereum'], label: 'Crypto' };
  }
  
  // Platform - TradingView
  if (/\b(tradingview|trading\s*view)\b/i.test(norm)) {
    return { expectedClusters: ['Platform - TradingView', 'TradingView'], label: 'TradingView' };
  }
  
  // Platform - MetaTrader
  if (/\b(metatrader|mt4|mt5)\b/i.test(norm)) {
    return { expectedClusters: ['Platform - MetaTrader', 'MetaTrader', 'MT4', 'MT5'], label: 'MetaTrader' };
  }
  
  // FX - Major pairs
  if (/\b(forex|fx|eurusd|gbpusd|usdjpy|currency)\b/i.test(norm)) {
    return { expectedClusters: ['FX - Majors', 'FX', 'Forex', 'Currency'], label: 'Forex' };
  }
  
  // Stocks
  if (/\b(stock|stocks|shares|equities)\b/i.test(norm)) {
    return { expectedClusters: ['Stocks', 'Equities', 'Shares'], label: 'Stocks' };
  }
  
  // Indices
  if (/\b(index|indices|sp500|nasdaq|dow|dax)\b/i.test(norm)) {
    return { expectedClusters: ['Indices', 'Index', 'SP500', 'NASDAQ'], label: 'Indices' };
  }
  
  // Competitors
  if (/\b(competitor|etoro|plus500|xtb|ig\s*market|avatrade)\b/i.test(norm)) {
    return { expectedClusters: ['Competitors', 'Competitor'], label: 'Competitors' };
  }
  
  // Brand
  if (/\b(brand|branded|cfi)\b/i.test(norm)) {
    return { expectedClusters: ['Brand', 'Branded', 'Brand - CFI'], label: 'Brand' };
  }
  
  // Education
  if (/\b(education|how\s*to|learn|tutorial)\b/i.test(norm)) {
    return { expectedClusters: ['Education / How-To', 'Education'], label: 'Education' };
  }
  
  return null; // No clear intent detected
}

/**
 * Check if a keyword's cluster matches the ad group's expected clusters.
 */
function isClusterMatch(kwCluster: string, agIntent: AdGroupIntent): boolean {
  const kwNorm = kwCluster.toLowerCase();
  
  // Check against all expected clusters
  for (const expected of agIntent.expectedClusters) {
    const expNorm = expected.toLowerCase();
    
    // Exact match
    if (kwNorm === expNorm) return true;
    
    // Substring match (e.g., "Commodity - Gold" contains "Gold")
    if (kwNorm.includes(expNorm) || expNorm.includes(kwNorm)) return true;
    
    // Word-level match
    const kwWords = kwNorm.split(/[\s\-–—]+/).filter(Boolean);
    const expWords = expNorm.split(/[\s\-–—]+/).filter(Boolean);
    
    for (const kw of kwWords) {
      for (const ew of expWords) {
        if (kw.length > 2 && ew.length > 2 && (kw === ew || kw.includes(ew) || ew.includes(kw))) {
          return true;
        }
      }
    }
  }
  
  return false;
}

// =====================================================
// ABSOLUTE SAFEGUARDS - NEVER ADD NEGATIVE FOR THESE
// =====================================================

const PROTECTED_INTENTS = ['how_to_education', 'price_today', 'charts_analysis'];

/**
 * Check if a keyword is FORBIDDEN from being auto-negatived.
 * These require manual action: Move, Isolate, Adjust Ad Copy, etc.
 */
function isNegativeForbidden(kw: ProcessedKeyword): boolean {
  // Competitors NEVER get auto-negatived
  if (kw.cluster_primary === 'Competitors') return true;
  
  // Education/TOF intents NEVER get auto-negatived
  if (PROTECTED_INTENTS.includes(kw.intent)) return true;
  
  return false;
}

/**
 * Check if this is a junk/typo term that should be negatived
 */
function isJunkTerm(searchTerm: string): boolean {
  const norm = searchTerm.toLowerCase().replace(/\s+/g, '');
  
  // Very short
  if (norm.length < 3) return true;
  
  // Just numbers
  if (/^\d+$/.test(norm)) return true;
  
  // Keyboard mashing patterns
  if (/^[asdfghjkl]+$/i.test(norm) && norm.length > 4) return true;
  if (/^[qwertyuiop]+$/i.test(norm) && norm.length > 4) return true;
  
  return false;
}

// =====================================================
// COMPUTE UNIFIED ACTIONS - CANONICAL DECISION ORDER
// =====================================================

export function computeUnifiedActions(
  keywords: ProcessedKeyword[],
  config: InsightsConfig = DEFAULT_INSIGHTS_CONFIG
): UnifiedAction[] {
  const actions: UnifiedAction[] = [];
  const seenTerms = new Set<string>();

  // Build ad group intent map once
  const adGroupIntents = new Map<string, AdGroupIntent | null>();
  
  for (const kw of keywords) {
    const agKey = kw.ad_group || '';
    if (!adGroupIntents.has(agKey)) {
      adGroupIntents.set(agKey, parseAdGroupIntent(agKey));
    }
  }

  for (const kw of keywords) {
    const norm = normalizeTerm(kw.keyword);
    const termKey = norm.search_term_norm;
    
    // Dedupe by normalized term
    if (seenTerms.has(termKey)) continue;
    seenTerms.add(termKey);

    const cost = kw.cost || 0;
    const clicks = kw.clicks;
    const conversions = kw.conversions || 0;
    const cpa = conversions > 0 ? cost / conversions : null;
    const cluster = kw.cluster_primary || 'Uncategorized';
    const intent = kw.intent || 'generic';
    const campaign = kw.campaign || null;
    const adGroup = kw.ad_group || null;
    const searchTerm = kw.keyword;

    // Skip low-cost terms (not worth optimizing)
    if (cost < config.minCostForReview) continue;

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: no_money_intent → ALWAYS Add Negative (HIGHEST PRIORITY)
    // ═══════════════════════════════════════════════════════════════════
    if (intent === 'no_money_intent' || isNoMoneyIntent(norm.search_term_norm, norm.search_term_norm_ascii)) {
      actions.push({
        id: `neg-nomoney-${actions.length}`,
        search_term: searchTerm,
        current_campaign: campaign,
        current_ad_group: adGroup,
        cluster,
        intent,
        action_type: 'add_negative',
        target: campaign || 'Account',
        reason: 'No-money intent (free/earn patterns) - always negative',
        rule_triggered: 'NO_MONEY_INTENT',
        confidence: 1.0,
        evidence_cost: cost,
        evidence_clicks: clicks,
        evidence_conversions: conversions,
        evidence_cpa: cpa,
      });
      continue;
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 3: Competitors → NEVER Add Negative
    // ═══════════════════════════════════════════════════════════════════
    if (cluster === 'Competitors') {
      if (intent === 'login_access') {
        // Competitor login conquest → Isolate
        actions.push({
          id: `isolate-complogin-${actions.length}`,
          search_term: searchTerm,
          current_campaign: campaign,
          current_ad_group: adGroup,
          cluster,
          intent,
          action_type: 'isolate',
          target: 'Competitors - Login AG',
          reason: 'Competitor login → isolate for conquest',
          rule_triggered: 'COMPETITOR_LOGIN_ISOLATE',
          confidence: 0.9,
          evidence_cost: cost,
          evidence_clicks: clicks,
          evidence_conversions: conversions,
          evidence_cpa: cpa,
        });
      } else {
        // Move to Competitors AG
        actions.push({
          id: `move-competitor-${actions.length}`,
          search_term: searchTerm,
          current_campaign: campaign,
          current_ad_group: adGroup,
          cluster,
          intent,
          action_type: 'move',
          target: 'Competitors AG',
          reason: 'Competitor keyword → move to Competitors AG',
          rule_triggered: 'COMPETITOR_MOVE',
          confidence: 0.85,
          evidence_cost: cost,
          evidence_clicks: clicks,
          evidence_conversions: conversions,
          evidence_cpa: cpa,
        });
      }
      continue;
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 4: Brand login → Add Negative (existing users)
    // ═══════════════════════════════════════════════════════════════════
    if (intent === 'login_access' && cluster === 'Brand - CFI') {
      actions.push({
        id: `neg-brandlogin-${actions.length}`,
        search_term: searchTerm,
        current_campaign: campaign,
        current_ad_group: adGroup,
        cluster,
        intent,
        action_type: 'add_negative',
        target: campaign || 'Account',
        reason: 'Existing users / support traffic',
        rule_triggered: 'BRAND_LOGIN_NEGATIVE',
        confidence: 0.9,
        evidence_cost: cost,
        evidence_clicks: clicks,
        evidence_conversions: conversions,
        evidence_cpa: cpa,
      });
      continue;
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 5: Education/TOF → NEVER Negative, Isolate or Adjust
    // ═══════════════════════════════════════════════════════════════════
    if (PROTECTED_INTENTS.includes(intent)) {
      actions.push({
        id: `isolate-edu-${actions.length}`,
        search_term: searchTerm,
        current_campaign: campaign,
        current_ad_group: adGroup,
        cluster,
        intent,
        action_type: 'isolate',
        target: 'Education / TOF AG',
        reason: `${intent.replace(/_/g, ' ')} keyword → isolate or adjust ad copy`,
        rule_triggered: 'EDUCATION_TOF_ISOLATE',
        confidence: 0.8,
        evidence_cost: cost,
        evidence_clicks: clicks,
        evidence_conversions: conversions,
        evidence_cpa: cpa,
      });
      continue;
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 5b: Junk/typo terms → Add Negative
    // ═══════════════════════════════════════════════════════════════════
    if (isJunkTerm(searchTerm)) {
      actions.push({
        id: `neg-junk-${actions.length}`,
        search_term: searchTerm,
        current_campaign: campaign,
        current_ad_group: adGroup,
        cluster,
        intent,
        action_type: 'add_negative',
        target: campaign || 'Account',
        reason: 'Junk/typo term',
        rule_triggered: 'JUNK_TERM',
        confidence: 0.9,
        evidence_cost: cost,
        evidence_clicks: clicks,
        evidence_conversions: conversions,
        evidence_cpa: cpa,
      });
      continue;
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 6: Performance-based negatives (STRICT - only for eligible intents)
    // ═══════════════════════════════════════════════════════════════════
    if (['transactional_open_account', 'generic'].includes(intent) && !isNegativeForbidden(kw)) {
      // High cost + 0 conversions → Add Negative
      if (cost >= config.highCostThreshold && conversions === 0) {
        actions.push({
          id: `neg-perf-highcost-${actions.length}`,
          search_term: searchTerm,
          current_campaign: campaign,
          current_ad_group: adGroup,
          cluster,
          intent,
          action_type: 'add_negative',
          target: adGroup || campaign || 'Account',
          reason: `High cost ($${cost.toFixed(0)}) + 0 conversions`,
          rule_triggered: 'PERF_HIGH_COST_ZERO_CONV',
          confidence: 0.95,
          evidence_cost: cost,
          evidence_clicks: clicks,
          evidence_conversions: conversions,
          evidence_cpa: cpa,
        });
        continue;
      }

      // CPA exceeds threshold → Add Negative
      if (cpa && cpa > config.cpaCap) {
        actions.push({
          id: `neg-perf-cpa-${actions.length}`,
          search_term: searchTerm,
          current_campaign: campaign,
          current_ad_group: adGroup,
          cluster,
          intent,
          action_type: 'add_negative',
          target: adGroup || campaign || 'Account',
          reason: `CPA $${cpa.toFixed(0)} exceeds threshold ($${config.cpaCap})`,
          rule_triggered: 'PERF_CPA_EXCEEDED',
          confidence: 0.9,
          evidence_cost: cost,
          evidence_clicks: clicks,
          evidence_conversions: conversions,
          evidence_cpa: cpa,
        });
        continue;
      }

      // Moderate cost + 0 conversions → Review Manually
      if (cost >= 300 && conversions === 0) {
        actions.push({
          id: `review-perf-${actions.length}`,
          search_term: searchTerm,
          current_campaign: campaign,
          current_ad_group: adGroup,
          cluster,
          intent,
          action_type: 'review_manually',
          target: '—',
          reason: `Moderate cost ($${cost.toFixed(0)}) + 0 conversions → review`,
          rule_triggered: 'PERF_REVIEW_MODERATE_COST',
          confidence: 0.6,
          evidence_cost: cost,
          evidence_clicks: clicks,
          evidence_conversions: conversions,
          evidence_cpa: cpa,
        });
        continue;
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 7: Structural mismatch → Move
    // ═══════════════════════════════════════════════════════════════════
    const agIntent = adGroupIntents.get(adGroup || '');
    
    if (agIntent && !isClusterMatch(cluster, agIntent)) {
      actions.push({
        id: `move-mismatch-${actions.length}`,
        search_term: searchTerm,
        current_campaign: campaign,
        current_ad_group: adGroup,
        cluster,
        intent,
        action_type: 'move',
        target: `${cluster} AG`,
        reason: `"${cluster}" keyword in "${agIntent.label}" ad group`,
        rule_triggered: 'STRUCTURAL_MISMATCH',
        confidence: 0.85,
        evidence_cost: cost,
        evidence_clicks: clicks,
        evidence_conversions: conversions,
        evidence_cpa: cpa,
      });
      continue;
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 8: Default → No Action (keyword is correctly placed)
    // ═══════════════════════════════════════════════════════════════════
    // We don't add "no_action" to the actions list to keep it clean
    // Only actionable items are returned
  }

  // Sort by evidence_cost descending (biggest opportunities first)
  return actions.sort((a, b) => b.evidence_cost - a.evidence_cost);
}

// =====================================================
// EXECUTIVE SUMMARY - Updated for new action types
// =====================================================

export function generateExecutiveSummary(
  keywords: ProcessedKeyword[],
  actions: UnifiedAction[]
): ExecutiveSummary {
  const totalSpend = keywords.reduce((s, k) => s + (k.cost || 0), 0);
  
  const negatives = actions.filter(a => a.action_type === 'add_negative');
  const moves = actions.filter(a => a.action_type === 'move');
  const isolates = actions.filter(a => a.action_type === 'isolate');
  const reviews = actions.filter(a => a.action_type === 'review_manually');
  
  const totalWasted = negatives.reduce((s, a) => s + a.evidence_cost, 0);
  const totalMisplacedSpend = moves.reduce((s, a) => s + a.evidence_cost, 0);
  const totalIsolateSpend = isolates.reduce((s, a) => s + a.evidence_cost, 0);
  
  const bullets: ExecutiveSummary['bullets'] = [];

  // Structural issues (moves + isolates)
  if (moves.length > 0) {
    const topMismatches = moves.slice(0, 3);
    bullets.push({
      icon: 'yellow',
      text: `🔄 ${moves.length} keywords in wrong ad groups ($${totalMisplacedSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}) — ` +
            `e.g., ${topMismatches.map(m => `"${m.search_term.slice(0, 20)}${m.search_term.length > 20 ? '...' : ''}" → ${m.target}`).join(', ')}`,
    });
  }

  if (isolates.length > 0) {
    // Group by reason type
    const eduIsolates = isolates.filter(i => i.rule_triggered.includes('EDUCATION') || i.rule_triggered.includes('TOF'));
    const compIsolates = isolates.filter(i => i.rule_triggered.includes('COMPETITOR'));
    
    const reasonParts: string[] = [];
    if (eduIsolates.length > 0) reasonParts.push(`${eduIsolates.length} education/TOF`);
    if (compIsolates.length > 0) reasonParts.push(`${compIsolates.length} competitor conquest`);
    
    bullets.push({
      icon: 'yellow',
      text: `🎯 ${isolates.length} keywords to isolate ($${totalIsolateSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}) — ${reasonParts.join(', ')}`,
    });
  }

  // Negative candidates
  if (totalWasted > 0) {
    const noMoney = negatives.filter(n => n.rule_triggered === 'NO_MONEY_INTENT');
    const brandLogin = negatives.filter(n => n.rule_triggered === 'BRAND_LOGIN_NEGATIVE');
    const junk = negatives.filter(n => n.rule_triggered === 'JUNK_TERM');
    const perf = negatives.filter(n => n.rule_triggered.startsWith('PERF_'));
    
    const reasonParts: string[] = [];
    if (noMoney.length > 0) reasonParts.push(`${noMoney.length} no-money`);
    if (brandLogin.length > 0) reasonParts.push(`${brandLogin.length} brand login`);
    if (junk.length > 0) reasonParts.push(`${junk.length} junk`);
    if (perf.length > 0) reasonParts.push(`${perf.length} high-cost-zero-conv`);
    
    bullets.push({
      icon: 'red',
      text: `❌ $${totalWasted.toLocaleString(undefined, { maximumFractionDigits: 0 })} wasted → add ${negatives.length} negatives (${reasonParts.join(', ')})`,
    });
  }

  // Review items
  if (reviews.length > 0) {
    bullets.push({
      icon: 'yellow',
      text: `🔍 ${reviews.length} keywords need manual review (moderate spend, 0 conversions)`,
    });
  }

  // Find uncategorized spend
  const uncategorizedSpend = keywords
    .filter(k => k.cluster_primary?.startsWith('Other') || k.cluster_primary === 'Junk / Noise' || k.cluster_primary === 'Uncategorized')
    .reduce((s, k) => s + (k.cost || 0), 0);
  
  if (uncategorizedSpend > 100) {
    bullets.push({
      icon: 'yellow',
      text: `❓ $${uncategorizedSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })} spent on uncategorized terms → review and classify`,
    });
  }

  if (bullets.length === 0) {
    bullets.push({
      icon: 'green',
      text: '✅ Account structure looks healthy. No major issues found.',
    });
  }

  return {
    bullets,
    totalSpend,
    totalWasted,
    totalMisplacedSpend,
    totalActions: actions.length,
    moveActions: moves.length,
    negativeActions: negatives.length,
    isolateActions: isolates.length,
    reviewActions: reviews.length,
  };
}

// =====================================================
// CSV EXPORTS (UPDATED WITH NEW FIELDS)
// =====================================================

export function exportUnifiedActionsCSV(actions: UnifiedAction[]): string {
  const headers = [
    'action_type',
    'search_term',
    'current_campaign',
    'current_ad_group',
    'target',
    'cluster',
    'intent',
    'reason',
    'rule_triggered',
    'confidence',
    'evidence_cost',
    'evidence_clicks',
    'evidence_conversions',
    'evidence_cpa',
  ];

  const actionTypeDisplay = (type: ActionType): string => {
    switch (type) {
      case 'move': return 'Move';
      case 'isolate': return 'Isolate';
      case 'adjust_ad_copy': return 'Adjust Ad Copy';
      case 'adjust_landing_page': return 'Adjust Landing Page';
      case 'add_negative': return 'Add Negative';
      case 'review_manually': return 'Review Manually';
      case 'no_action': return 'No Action';
      default: return type;
    }
  };

  const rows = actions.map(a => [
    actionTypeDisplay(a.action_type),
    `"${a.search_term.replace(/"/g, '""')}"`,
    `"${(a.current_campaign || '').replace(/"/g, '""')}"`,
    `"${(a.current_ad_group || '').replace(/"/g, '""')}"`,
    `"${a.target.replace(/"/g, '""')}"`,
    `"${(a.cluster || '').replace(/"/g, '""')}"`,
    `"${(a.intent || '').replace(/"/g, '""')}"`,
    `"${a.reason.replace(/"/g, '""')}"`,
    a.rule_triggered,
    a.confidence.toFixed(2),
    a.evidence_cost.toFixed(2),
    a.evidence_clicks.toString(),
    a.evidence_conversions.toString(),
    a.evidence_cpa !== null ? a.evidence_cpa.toFixed(2) : '',
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

export function exportNegativesOnlyCSV(actions: UnifiedAction[]): string {
  const negatives = actions.filter(a => a.action_type === 'add_negative');
  
  const headers = [
    'negative_keyword',
    'campaign',
    'ad_group',
    'match_type',
    'reason',
    'rule_triggered',
    'cost',
  ];

  const rows = negatives.map(n => [
    `"${n.search_term.replace(/"/g, '""')}"`,
    `"${(n.current_campaign || '').replace(/"/g, '""')}"`,
    `"${(n.current_ad_group || '').replace(/"/g, '""')}"`,
    'Exact',
    `"${n.reason.replace(/"/g, '""')}"`,
    n.rule_triggered,
    n.evidence_cost.toFixed(2),
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

export function exportMovesOnlyCSV(actions: UnifiedAction[]): string {
  const moves = actions.filter(a => a.action_type === 'move');
  
  const headers = [
    'search_term',
    'current_campaign',
    'current_ad_group',
    'move_to',
    'cluster',
    'intent',
    'reason',
    'rule_triggered',
    'cost',
    'conversions',
  ];

  const rows = moves.map(m => [
    `"${m.search_term.replace(/"/g, '""')}"`,
    `"${(m.current_campaign || '').replace(/"/g, '""')}"`,
    `"${(m.current_ad_group || '').replace(/"/g, '""')}"`,
    `"${m.target.replace(/"/g, '""')}"`,
    `"${(m.cluster || '').replace(/"/g, '""')}"`,
    `"${(m.intent || '').replace(/"/g, '""')}"`,
    `"${m.reason.replace(/"/g, '""')}"`,
    m.rule_triggered,
    m.evidence_cost.toFixed(2),
    m.evidence_conversions.toString(),
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

export function exportIsolatesOnlyCSV(actions: UnifiedAction[]): string {
  const isolates = actions.filter(a => a.action_type === 'isolate');
  
  const headers = [
    'search_term',
    'current_campaign',
    'current_ad_group',
    'isolate_to',
    'cluster',
    'intent',
    'reason',
    'rule_triggered',
    'cost',
    'conversions',
  ];

  const rows = isolates.map(i => [
    `"${i.search_term.replace(/"/g, '""')}"`,
    `"${(i.current_campaign || '').replace(/"/g, '""')}"`,
    `"${(i.current_ad_group || '').replace(/"/g, '""')}"`,
    `"${i.target.replace(/"/g, '""')}"`,
    `"${(i.cluster || '').replace(/"/g, '""')}"`,
    `"${(i.intent || '').replace(/"/g, '""')}"`,
    `"${i.reason.replace(/"/g, '""')}"`,
    i.rule_triggered,
    i.evidence_cost.toFixed(2),
    i.evidence_conversions.toString(),
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

// =====================================================
// CLUSTER KPI (kept for cluster tab)
// =====================================================

export interface ClusterKPI {
  name: string;
  spend: number;
  clicks: number;
  conversions: number;
  impressions: number;
  cpa: number | null;
  ctr: number;
  percentOfSpend: number;
}

export function computeClusterKPIs(keywords: ProcessedKeyword[]): ClusterKPI[] {
  const clusterMap = new Map<string, ProcessedKeyword[]>();
  let totalSpend = 0;

  for (const kw of keywords) {
    const cluster = kw.cluster_primary;
    if (!clusterMap.has(cluster)) clusterMap.set(cluster, []);
    clusterMap.get(cluster)!.push(kw);
    totalSpend += kw.cost || 0;
  }

  const results: ClusterKPI[] = [];

  for (const [name, kwList] of clusterMap) {
    const spend = kwList.reduce((s, k) => s + (k.cost || 0), 0);
    const clicks = kwList.reduce((s, k) => s + k.clicks, 0);
    const conversions = kwList.reduce((s, k) => s + (k.conversions || 0), 0);
    const impressions = kwList.reduce((s, k) => s + k.impressions, 0);

    results.push({
      name,
      spend,
      clicks,
      conversions,
      impressions,
      cpa: conversions > 0 ? spend / conversions : null,
      ctr: impressions > 0 ? clicks / impressions : 0,
      percentOfSpend: totalSpend > 0 ? (spend / totalSpend) * 100 : 0,
    });
  }

  return results.sort((a, b) => b.spend - a.spend);
}
