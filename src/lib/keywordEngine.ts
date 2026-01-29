/**
 * Keyword Intel Processing Engine
 * 
 * Deterministic keyword classification engine supporting English and Arabic.
 * No embeddings, no semantic guessing, no paid APIs.
 */

// =====================================================
// TYPES
// =====================================================

export interface DictionaryEntry {
  id: string;
  dict_name: 'brand_terms' | 'competitors';
  canonical: string;
  alias: string;
  enabled: boolean;
}

export interface CustomRule {
  id: string;
  rule_name: string;
  pattern: string;
  match_type: 'contains_phrase' | 'regex';
  target_cluster_primary: string;
  enabled: boolean;
}

export interface NormalizedTerm {
  search_term_norm: string;
  search_term_norm_ascii: string;
  language: 'ar' | 'en' | 'mixed';
}

export interface ClassificationResult {
  cluster_primary: string;
  cluster_secondary: string | null;
  matched_rule: string;
  confidence: number;
}

export interface IntentResult {
  intent: string;
  matched_pattern: string;
}

export interface Tags {
  asset_tag?: string;
  platform_tag?: string;
  language?: 'ar' | 'en' | 'mixed';
}

export interface ProcessedKeyword {
  // Original fields
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number | null;
  cost: number | null;
  conversions: number | null;
  campaign: string | null;
  ad_group: string | null;
  match_type: string | null;
  
  // Engine-computed fields
  cluster_primary: string;
  cluster_secondary: string | null;
  intent: string;
  matched_rule: string;
  confidence: number;
  tags: Tags;
  opportunity_score: number | null;
  
  // Normalized forms (for debugging)
  search_term_norm?: string;
  search_term_norm_ascii?: string;
}

export interface CsvParseResult {
  cleanRows: Record<string, string>[];
  rowCountRaw: number;
  rowCountClean: number;
  headers: string[];
}

export interface LeakageSuggestion {
  suggestion_type: 'alias_candidate' | 'dictionary_candidate' | 'new_rule_candidate';
  extracted_phrase: string;
  evidence_terms: string[];
  evidence_cost: number;
  evidence_clicks: number;
  proposed_dict_name?: string;
  proposed_canonical?: string;
  proposed_alias?: string;
}

// =====================================================
// CLUSTER TAXONOMY
// =====================================================

export const CLUSTER_TAXONOMY = [
  'Brand - CFI',
  'Competitors',
  'Platform - TradingView',
  'Platform - MetaTrader',
  'Crypto - Bitcoin',
  'Crypto - Ethereum',
  'Crypto - Stablecoins',
  'Crypto - Altcoins',
  'Crypto - Generic',
  'Commodity - Gold',
  'Commodity - Silver',
  'Commodity - Energy',
  'Commodity - Other Metals',
  'FX - Majors/Minors',
  'Indices',
  'ETFs',
  'Stocks - Single Names',
  'Stocks - Generic',
  'AI / Bots / Automation',
  'Charts / Analysis',
  'Education / How-To',
  'App / Download',
  'Trading - Generic',
  'Other - Price/Today',
  'Other - News/Calendar',
  'Other - Regulation/Legal',
  'Other - Login/Access',
  'Other - General Longtail',
  'Junk / Noise',
] as const;

export type ClusterPrimary = typeof CLUSTER_TAXONOMY[number];

// =====================================================
// INTENT TAXONOMY (UPDATED - no_money_intent FIRST)
// =====================================================

export const INTENT_TAXONOMY = [
  'no_money_intent',           // NEW - Top priority
  'login_access',
  'transactional_open_account',
  'app_download',
  'price_today',
  'charts_analysis',
  'how_to_education',
  'regulation_trust',
  'news_calendar',
  'generic',
] as const;

export type Intent = typeof INTENT_TAXONOMY[number];

// =====================================================
// ARABIC NORMALIZATION
// =====================================================

const ARABIC_CHAR_MAP: Record<string, string> = {
  'أ': 'ا', 'إ': 'ا', 'آ': 'ا',
  'ة': 'ه',
  'ى': 'ي',
};

// Arabic diacritics/harakat to remove
const ARABIC_DIACRITICS = /[\u064B-\u0652\u0670]/g;
// Tatweel (kashida)
const TATWEEL = /\u0640/g;

function normalizeArabic(text: string): string {
  let result = text;
  
  // Replace mapped characters
  for (const [from, to] of Object.entries(ARABIC_CHAR_MAP)) {
    result = result.replace(new RegExp(from, 'g'), to);
  }
  
  // Remove diacritics and tatweel
  result = result.replace(ARABIC_DIACRITICS, '');
  result = result.replace(TATWEEL, '');
  
  return result;
}

function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

function containsLatin(text: string): boolean {
  return /[a-zA-Z]/.test(text);
}

// =====================================================
// TERM NORMALIZATION
// =====================================================

export function normalizeTerm(term: string): NormalizedTerm {
  // Basic normalization: lowercase, trim, collapse whitespace
  let norm = term.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Apply Arabic normalization
  norm = normalizeArabic(norm);
  
  // ASCII normalization: strip punctuation
  const asciiNorm = norm.replace(/[.,\/;:_\-\(\)\[\]\{\}\"'`!@#$%^&*+=<>?\\|~]/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Detect language
  const hasArabic = containsArabic(term);
  const hasLatin = containsLatin(term);
  
  let language: 'ar' | 'en' | 'mixed';
  if (hasArabic && hasLatin) {
    language = 'mixed';
  } else if (hasArabic) {
    language = 'ar';
  } else {
    language = 'en';
  }
  
  return {
    search_term_norm: norm,
    search_term_norm_ascii: asciiNorm,
    language,
  };
}

// =====================================================
// CSV PARSING & CLEANING (EXPANDED IGNORED ROW PATTERNS)
// =====================================================

const HEADER_VARIANTS = {
  search_term: ['search term', 'search_term', 'مصطلح البحث', 'مصطلح بحث'],
  clicks: ['clicks', 'click', 'النقرات'],
  impressions: ['impressions', 'impr', 'مرات الظهور'],
  ctr: ['ctr', 'click-through rate', 'نسبة النقر إلى الظهور'],
  cost: ['cost', 'spend', 'التكلفة'],
  conversions: ['conversions', 'conv', 'التحويلات'],
  campaign: ['campaign', 'campaign name', 'الحملة'],
  ad_group: ['ad group', 'ad_group', 'adgroup', 'المجموعة الإعلانية'],
  match_type: ['match type', 'match_type', 'نوع المطابقة'],
};

// EXPANDED: Comprehensive patterns for Total/Header/Noise rows
const IGNORED_ROW_PATTERNS = [
  // Headers (EN + AR)
  /^search\s*term$/i,
  /^مصطلح\s*البحث$/,
  /^search\s*terms?$/i,
  
  // Total rows - English (more comprehensive)
  /^total\b/i,                    // "total", "total:", "total -", "Total Rows"
  /^total[:\s\-]/i,               // "total:", "total -", "total  "
  /^grand\s*total\b/i,            // "grand total", "grandtotal"
  /^subtotal\b/i,                 // "subtotal"
  /^total\s*[:\-–—]\s*/i,         // "total: ", "total - ", "total – "
  /total:\s*search\s*terms?/i,    // "Total: Search terms"
  /^overall\s*total/i,            // "overall total"
  /^sum\b/i,                      // "sum", "sum:"
  
  // Total rows - Arabic (comprehensive)
  /الإجمالي/,                      // with hamza
  /الاجمالي/,                      // without hamza  
  /اجمالي/,                        // without al-
  /إجمالي/,                        // with hamza, no al-
  /المجموع/,                       // "the total"
  /مجموع/,                         // "sum"
  /الكل/,                          // "all"
  /الإجمالي:/,                     // with colon
  /المجموع:/,                      // with colon
  /اجمالى/,                        // alternate spelling
  
  // Empty/placeholder rows
  /^\s*$/,                         // empty or whitespace only
  /^--+$/,                         // dashes only (one or more)
  /^-$/,                           // single dash
  /^\.+$/,                         // dots only
  /^_+$/,                          // underscores only
];

/**
 * Check if a row should be ignored (headers, totals, noise)
 */
export function shouldIgnoreRow(searchTerm: string): boolean {
  if (!searchTerm || typeof searchTerm !== 'string') return true;
  
  const trimmed = searchTerm.trim();
  
  // Empty check
  if (!trimmed || trimmed.length === 0) return true;
  
  // Check against all ignored patterns
  return IGNORED_ROW_PATTERNS.some(pattern => pattern.test(trimmed));
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function findColumnIndex(headers: string[], variants: string[]): number {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  for (const variant of variants) {
    const idx = lowerHeaders.indexOf(variant.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

export function parseAndCleanCsv(text: string): CsvParseResult {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  const rowCountRaw = lines.length;
  
  // Find header row
  let headerRowIndex = -1;
  let headers: string[] = [];
  
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const cells = parseCSVLine(lines[i]);
    const searchTermIdx = findColumnIndex(cells, HEADER_VARIANTS.search_term);
    
    if (searchTermIdx !== -1) {
      headerRowIndex = i;
      headers = cells;
      break;
    }
  }
  
  if (headerRowIndex === -1) {
    return { cleanRows: [], rowCountRaw, rowCountClean: 0, headers: [] };
  }
  
  // Build column index map
  const colMap = {
    search_term: findColumnIndex(headers, HEADER_VARIANTS.search_term),
    clicks: findColumnIndex(headers, HEADER_VARIANTS.clicks),
    impressions: findColumnIndex(headers, HEADER_VARIANTS.impressions),
    ctr: findColumnIndex(headers, HEADER_VARIANTS.ctr),
    cost: findColumnIndex(headers, HEADER_VARIANTS.cost),
    conversions: findColumnIndex(headers, HEADER_VARIANTS.conversions),
    campaign: findColumnIndex(headers, HEADER_VARIANTS.campaign),
    ad_group: findColumnIndex(headers, HEADER_VARIANTS.ad_group),
    match_type: findColumnIndex(headers, HEADER_VARIANTS.match_type),
  };
  
  const cleanRows: Record<string, string>[] = [];
  
  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    
    // Skip if it's a repeated header row
    if (colMap.search_term !== -1) {
      const searchTermValue = cells[colMap.search_term]?.toLowerCase().trim();
      if (HEADER_VARIANTS.search_term.includes(searchTermValue)) {
        continue;
      }
    }
    
    // Get search term
    const searchTerm = colMap.search_term !== -1 ? cells[colMap.search_term]?.trim() : '';
    
    // CRITICAL: Skip using expanded ignore patterns
    if (shouldIgnoreRow(searchTerm)) continue;
    
    // Build row object
    const row: Record<string, string> = {
      search_term: searchTerm,
      clicks: colMap.clicks !== -1 ? cells[colMap.clicks] || '0' : '0',
      impressions: colMap.impressions !== -1 ? cells[colMap.impressions] || '0' : '0',
      ctr: colMap.ctr !== -1 ? cells[colMap.ctr] || '' : '',
      cost: colMap.cost !== -1 ? cells[colMap.cost] || '' : '',
      conversions: colMap.conversions !== -1 ? cells[colMap.conversions] || '' : '',
      campaign: colMap.campaign !== -1 ? cells[colMap.campaign] || '' : '',
      ad_group: colMap.ad_group !== -1 ? cells[colMap.ad_group] || '' : '',
      match_type: colMap.match_type !== -1 ? cells[colMap.match_type] || '' : '',
    };
    
    cleanRows.push(row);
  }
  
  return {
    cleanRows,
    rowCountRaw,
    rowCountClean: cleanRows.length,
    headers,
  };
}

// =====================================================
// REGEX PATTERNS (EN + AR)
// =====================================================

// Platforms
const TRADINGVIEW_PATTERN = /tradingview|trading\s*view|تريدنج\s*فيو|تريدنغ\s*فيو|ترادينغ\s*فيو/i;
const METATRADER_PATTERN = /mt4|mt5|metatrader|ميتا\s*تريدر|ميتاتريدر|mt٤|mt٥/i;

// Crypto
const BITCOIN_PATTERN = /bitcoin|btc|btcusd|بيتكوين|بتكوين/i;
const ETHEREUM_PATTERN = /ethereum|eth|ethusdt?|ايثريوم|إيثريوم/i;
const STABLECOINS_PATTERN = /usdt|tether|usdc|dai|تيثر|يو\s*اس\s*دي\s*تي/i;
const ALTCOINS_PATTERN = /\b(sol|solana|xrp|ripple|ada|cardano|doge|dogecoin|bnb|matic|avax|trx|tron|link|ltc|litecoin|atom|dot|polkadot|near|arb|arbitrum|op|optimism|apt|aptos|sui)\b/i;
const CRYPTO_GENERIC_PATTERN = /crypto|cryptocurrency|blockchain|defi|web3|coinmarketcap|coingecko|كريبتو|عملات\s*رقمي[ةه]|العملات\s*الرقمية|بلوك\s*تشين|بلوكتشين|ديفاي/i;

// Commodities
const GOLD_PATTERN = /\b(gold|xau|xauusd)\b|ذهب|الذهب|سعر\s*الذهب/i;
const SILVER_PATTERN = /\b(silver|xag|xagusd)\b|فض[ةه]|الفضة/i;
const ENERGY_PATTERN = /\b(oil|brent|wti|crude|natural\s*gas)\b|نفط|النفط|برنت|خام|غاز\s*طبيعي/i;
const OTHER_METALS_PATTERN = /\b(platinum|palladium|copper|nickel|aluminum|aluminium|zinc|tin)\b/i;

// FX
const FX_PAIRS_PATTERN = /\b(eurusd|gbpusd|usdjpy|usdtry|usdcad|audusd|nzdusd|usdchf|eurjpy|eurgbp|gbpjpy|eurchf)\b/i;
const FX_GENERIC_PATTERN = /\bforex\b|\bfx\b|فوركس|تداول\s*العملات|سوق\s*العملات|زوج\s*عملات/i;
const FX_PAIR_NOTATION = /\b[a-z]{3}\s*\/\s*[a-z]{3}\b/i;

// Indices
const INDICES_PATTERN = /\b(nasdaq|sp500|s&p|dow|dowjones|dax|ftse|cac|nikkei|hang\s*seng|vix|us30|us500|nas100)\b|مؤشر|المؤشرات|ناسداك|داو|ستاندرد\s*اند\s*بورز/i;

// ETFs
const ETFS_PATTERN = /\b(etf|spy|qqq|ishares|vanguard|ark|arkk)\b|صندوق\s*متداول|اي\s*تي\s*اف/i;

// Stocks
const STOCKS_SINGLE_NAMES = /\b(apple|aapl|tesla|tsla|amazon|amzn|google|googl|microsoft|msft|meta|nvda|nvidia)\b/i;
const STOCKS_GENERIC_PATTERN = /\b(stock|stocks|share|shares|equity|equities|dividend|earnings)\b|اسهم|أسهم|سوق\s*الاسهم|سوق\s*الأسهم/i;

// AI / Bots / Automation
const AI_BOTS_PATTERN = /\b(ai|bot|bots|robot|automated|automation|algo|algorithmic|copy\s*trad(e|ing)|signal|signals)\b/i;

// Charts / Analysis
const CHARTS_PATTERN = /\b(chart|charts|analysis|forecast|prediction|signals?|indicator|support|resistance|technical|fundamental|candle|candlestick)\b|شارت|تحليل|توقع|تنبؤ|اشار[ةه]|إشار[ةه]|مؤشر|دعم|مقاومة|تحليل\s*فني|تحليل\s*أساسي/i;

// Education / How-To
const EDUCATION_PATTERN = /\b(how\s*to|what\s*is|guide|tutorial|learn|course|academy|training|meaning|definition|explain)\b|كيفية|ما\s*هو|دليل|شرح|تعلم|كورس|دورة|تدريب|معنى/i;

// App / Download
const APP_PATTERN = /\b(app|apk|ios|android|download|install|mobile)\b|تطبيق|تحميل|اندرويد|ايفون|آيفون/i;

// Trading Generic
const TRADING_GENERIC_PATTERN = /\b(trading|trader|trade|trades|broker|brokerage|invest|investment|portfolio)\b|تداول|تاجر|وسيط|استثمار|محفظة/i;

// Other bucket patterns
const PRICE_TODAY_PATTERN = /\b(price|today|now|live|rate|quote|value|current)\b|سعر|اليوم|الان|الآن|مباشر|كم\s*سعر|سعر\s*الآن/i;
const NEWS_CALENDAR_PATTERN = /\b(news|reuters|forexfactory|calendar|economic\s*calendar|cpi|nfp|interest\s*rate)\b|اخبار|أخبار|تقويم|تقويم\s*اقتصادي|مؤشر\s*اسعار|وظائف|سعر\s*الفائدة/i;
const REGULATION_PATTERN = /\b(regulated|license|scam|safe|legit|review|complaint|trusted)\b|مرخص|ترخيص|نصاب|احتيال|آمن|موثوق|مراجعة|شكاوى/i;
const LOGIN_ACCESS_PATTERN = /\b(login|log\s*in|sign\s*in|signin|account|portal|dashboard|password|reset|forgot|withdraw|deposit|kyc|verification)\b|تسجيل\s*الدخول|دخول|حساب|بوابة|كلمة\s*المرور|نسيت|اعادة\s*تعيين|سحب|ايداع|تحقق|توثيق/i;

// Junk patterns
const JUNK_PATTERN = /^[0-9\s\-\.]+$|^\s*$/;

// =====================================================
// NO-MONEY INTENT PATTERNS (EXPANDED - TOP PRIORITY)
// =====================================================

export const NO_MONEY_PATTERNS_EN = /\b(free|free\s+signals?|free\s+trading|free\s+forex|free\s+crypto|free\s+course|earn\s*money|make\s*money|money\s*make|make\s*money\s*online|earn\s*money\s*online|how\s+to\s+earn|no\s+deposit\s+bonus?|without\s+deposit|no\s+investment|earn\s+from\s+home|work\s+from\s+home|passive\s+income|get\s+rich\s+quick|easy\s+money|fast\s+money)\b/i;

export const NO_MONEY_PATTERNS_AR = /ربح|ربح\s*المال|كسب\s*المال|فلوس|بدون\s*رأس\s*مال|بدون\s*ايداع|بدون\s*إيداع|بدون\s*استثمار|مجانا|مجاني|اربح|كسب|فلوس\s*مجاني/;

export function isNoMoneyIntent(norm: string, asciiNorm: string): boolean {
  return NO_MONEY_PATTERNS_EN.test(asciiNorm) || NO_MONEY_PATTERNS_AR.test(norm);
}

// =====================================================
// INTENT PATTERNS (with no_money_intent FIRST)
// =====================================================

const INTENT_PATTERNS: Array<{ intent: Intent; pattern: RegExp }> = [
  // no_money_intent is handled separately via isNoMoneyIntent for highest priority
  { intent: 'login_access', pattern: LOGIN_ACCESS_PATTERN },
  { intent: 'transactional_open_account', pattern: /\b(open\s*account|create\s*account|sign\s*up|register|registration|minimum\s*deposit|bonus)\b|فتح\s*حساب|انشاء\s*حساب|تسجيل|سجل|حد\s*ادنى\s*للايداع|بونص|مكافأة/i },
  { intent: 'app_download', pattern: APP_PATTERN },
  { intent: 'price_today', pattern: PRICE_TODAY_PATTERN },
  { intent: 'charts_analysis', pattern: CHARTS_PATTERN },
  { intent: 'how_to_education', pattern: EDUCATION_PATTERN },
  { intent: 'regulation_trust', pattern: REGULATION_PATTERN },
  { intent: 'news_calendar', pattern: NEWS_CALENDAR_PATTERN },
];

// =====================================================
// DICTIONARY MATCHING
// =====================================================

function matchDictionary(
  norm: string,
  asciiNorm: string,
  dictionaries: DictionaryEntry[]
): { canonical: string; dictName: 'brand_terms' | 'competitors' } | null {
  for (const entry of dictionaries) {
    if (!entry.enabled) continue;
    
    const aliasNorm = entry.alias.toLowerCase().trim();
    const aliasAscii = aliasNorm.replace(/[.,/;:_\-()[\]{}\"'`!@#$%^&*+=<>?\\|~]/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Check boundary-aware matching
    // Create word boundary pattern
    const escapedAlias = aliasNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const boundaryPattern = new RegExp(`(^|\\s|[^a-zA-Z0-9])${escapedAlias}($|\\s|[^a-zA-Z0-9])`, 'i');
    
    if (boundaryPattern.test(norm) || boundaryPattern.test(` ${norm} `)) {
      return { canonical: entry.canonical, dictName: entry.dict_name };
    }
    
    // Also check ASCII normalized version
    const escapedAscii = aliasAscii.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const asciiBoundaryPattern = new RegExp(`(^|\\s)${escapedAscii}($|\\s)`, 'i');
    
    if (asciiBoundaryPattern.test(asciiNorm) || asciiBoundaryPattern.test(` ${asciiNorm} `)) {
      return { canonical: entry.canonical, dictName: entry.dict_name };
    }
  }
  
  return null;
}

// =====================================================
// CUSTOM RULES MATCHING
// =====================================================

function matchCustomRules(
  norm: string,
  asciiNorm: string,
  customRules: CustomRule[]
): { ruleName: string; targetCluster: string } | null {
  for (const rule of customRules) {
    if (!rule.enabled) continue;
    
    if (rule.match_type === 'contains_phrase') {
      const patternNorm = rule.pattern.toLowerCase().trim();
      if (norm.includes(patternNorm) || asciiNorm.includes(patternNorm)) {
        return { ruleName: rule.rule_name, targetCluster: rule.target_cluster_primary };
      }
    } else if (rule.match_type === 'regex') {
      try {
        const regex = new RegExp(rule.pattern, 'i');
        if (regex.test(norm) || regex.test(asciiNorm)) {
          return { ruleName: rule.rule_name, targetCluster: rule.target_cluster_primary };
        }
      } catch {
        // Invalid regex, skip
        continue;
      }
    }
  }
  
  return null;
}

// =====================================================
// PRIMARY CLASSIFICATION
// =====================================================

export function classifyPrimary(
  norm: string,
  asciiNorm: string,
  dictionaries: DictionaryEntry[],
  customRules: CustomRule[] = []
): ClassificationResult {
  // Priority 1: Brand - CFI (DICT)
  const brandEntries = dictionaries.filter(d => d.dict_name === 'brand_terms');
  const brandMatch = matchDictionary(norm, asciiNorm, brandEntries);
  if (brandMatch) {
    return {
      cluster_primary: 'Brand - CFI',
      cluster_secondary: null,
      matched_rule: `DICT:brand_terms:${brandMatch.canonical}`,
      confidence: 1.0,
    };
  }
  
  // Priority 2: Competitors (DICT)
  const competitorEntries = dictionaries.filter(d => d.dict_name === 'competitors');
  const competitorMatch = matchDictionary(norm, asciiNorm, competitorEntries);
  if (competitorMatch) {
    return {
      cluster_primary: 'Competitors',
      cluster_secondary: competitorMatch.canonical,
      matched_rule: `DICT:competitors:${competitorMatch.canonical}`,
      confidence: 1.0,
    };
  }
  
  // Priority 2.5: Custom Rules
  const customMatch = matchCustomRules(norm, asciiNorm, customRules);
  if (customMatch) {
    return {
      cluster_primary: customMatch.targetCluster,
      cluster_secondary: null,
      matched_rule: `CUSTOM_RULE:${customMatch.ruleName}`,
      confidence: 0.85,
    };
  }
  
  // Priority 3: Platform - TradingView
  if (TRADINGVIEW_PATTERN.test(norm) || TRADINGVIEW_PATTERN.test(asciiNorm)) {
    return {
      cluster_primary: 'Platform - TradingView',
      cluster_secondary: null,
      matched_rule: 'REGEX:platform_tradingview',
      confidence: 0.9,
    };
  }
  
  // Priority 4: Platform - MetaTrader
  if (METATRADER_PATTERN.test(norm) || METATRADER_PATTERN.test(asciiNorm)) {
    return {
      cluster_primary: 'Platform - MetaTrader',
      cluster_secondary: null,
      matched_rule: 'REGEX:platform_metatrader',
      confidence: 0.9,
    };
  }
  
  // Priority 5: Crypto
  if (BITCOIN_PATTERN.test(norm) || BITCOIN_PATTERN.test(asciiNorm)) {
    return { cluster_primary: 'Crypto - Bitcoin', cluster_secondary: null, matched_rule: 'REGEX:crypto_bitcoin', confidence: 0.9 };
  }
  if (ETHEREUM_PATTERN.test(norm) || ETHEREUM_PATTERN.test(asciiNorm)) {
    return { cluster_primary: 'Crypto - Ethereum', cluster_secondary: null, matched_rule: 'REGEX:crypto_ethereum', confidence: 0.9 };
  }
  if (STABLECOINS_PATTERN.test(norm) || STABLECOINS_PATTERN.test(asciiNorm)) {
    return { cluster_primary: 'Crypto - Stablecoins', cluster_secondary: null, matched_rule: 'REGEX:crypto_stablecoins', confidence: 0.9 };
  }
  if (ALTCOINS_PATTERN.test(norm) || ALTCOINS_PATTERN.test(asciiNorm)) {
    return { cluster_primary: 'Crypto - Altcoins', cluster_secondary: null, matched_rule: 'REGEX:crypto_altcoins', confidence: 0.9 };
  }
  if (CRYPTO_GENERIC_PATTERN.test(norm) || CRYPTO_GENERIC_PATTERN.test(asciiNorm)) {
    return { cluster_primary: 'Crypto - Generic', cluster_secondary: null, matched_rule: 'REGEX:crypto_generic', confidence: 0.85 };
  }
  
  // Priority 6: Commodities
  if (GOLD_PATTERN.test(norm) || GOLD_PATTERN.test(asciiNorm)) {
    return { cluster_primary: 'Commodity - Gold', cluster_secondary: null, matched_rule: 'REGEX:commodity_gold', confidence: 0.9 };
  }
  if (SILVER_PATTERN.test(norm) || SILVER_PATTERN.test(asciiNorm)) {
    return { cluster_primary: 'Commodity - Silver', cluster_secondary: null, matched_rule: 'REGEX:commodity_silver', confidence: 0.9 };
  }
  if (ENERGY_PATTERN.test(norm) || ENERGY_PATTERN.test(asciiNorm)) {
    return { cluster_primary: 'Commodity - Energy', cluster_secondary: null, matched_rule: 'REGEX:commodity_energy', confidence: 0.9 };
  }
  if (OTHER_METALS_PATTERN.test(norm) || OTHER_METALS_PATTERN.test(asciiNorm)) {
    return { cluster_primary: 'Commodity - Other Metals', cluster_secondary: null, matched_rule: 'REGEX:commodity_other_metals', confidence: 0.85 };
  }
  
  // Priority 7: FX
  if (FX_PAIRS_PATTERN.test(norm) || FX_PAIRS_PATTERN.test(asciiNorm) || FX_PAIR_NOTATION.test(norm)) {
    return { cluster_primary: 'FX - Majors/Minors', cluster_secondary: null, matched_rule: 'REGEX:fx_pairs', confidence: 0.9 };
  }
  if (FX_GENERIC_PATTERN.test(norm) || FX_GENERIC_PATTERN.test(asciiNorm)) {
    return { cluster_primary: 'FX - Majors/Minors', cluster_secondary: null, matched_rule: 'REGEX:fx_generic', confidence: 0.85 };
  }
  
  // Priority 8: Indices
  if (INDICES_PATTERN.test(norm) || INDICES_PATTERN.test(asciiNorm)) {
    return { cluster_primary: 'Indices', cluster_secondary: null, matched_rule: 'REGEX:indices', confidence: 0.9 };
  }
  
  // Priority 9: ETFs
  if (ETFS_PATTERN.test(norm) || ETFS_PATTERN.test(asciiNorm)) {
    return { cluster_primary: 'ETFs', cluster_secondary: null, matched_rule: 'REGEX:etfs', confidence: 0.85 };
  }
  
  // Priority 10: Stocks
  if (STOCKS_SINGLE_NAMES.test(norm) || STOCKS_SINGLE_NAMES.test(asciiNorm)) {
    return { cluster_primary: 'Stocks - Single Names', cluster_secondary: null, matched_rule: 'REGEX:stocks_single', confidence: 0.9 };
  }
  if (STOCKS_GENERIC_PATTERN.test(norm) || STOCKS_GENERIC_PATTERN.test(asciiNorm)) {
    return { cluster_primary: 'Stocks - Generic', cluster_secondary: null, matched_rule: 'REGEX:stocks_generic', confidence: 0.8 };
  }
  
  // Priority 11: AI / Bots / Automation
  if (AI_BOTS_PATTERN.test(norm) || AI_BOTS_PATTERN.test(asciiNorm)) {
    return { cluster_primary: 'AI / Bots / Automation', cluster_secondary: null, matched_rule: 'REGEX:ai_bots', confidence: 0.8 };
  }
  
  // Priority 12: Charts / Analysis
  if (CHARTS_PATTERN.test(norm) || CHARTS_PATTERN.test(asciiNorm)) {
    return { cluster_primary: 'Charts / Analysis', cluster_secondary: null, matched_rule: 'REGEX:charts_analysis', confidence: 0.8 };
  }
  
  // Priority 13: Education / How-To
  if (EDUCATION_PATTERN.test(norm) || EDUCATION_PATTERN.test(asciiNorm)) {
    return { cluster_primary: 'Education / How-To', cluster_secondary: null, matched_rule: 'REGEX:education', confidence: 0.8 };
  }
  
  // Priority 14: App / Download
  if (APP_PATTERN.test(norm) || APP_PATTERN.test(asciiNorm)) {
    return { cluster_primary: 'App / Download', cluster_secondary: null, matched_rule: 'REGEX:app_download', confidence: 0.8 };
  }
  
  // Priority 15: Trading - Generic
  if (TRADING_GENERIC_PATTERN.test(norm) || TRADING_GENERIC_PATTERN.test(asciiNorm)) {
    return { cluster_primary: 'Trading - Generic', cluster_secondary: null, matched_rule: 'REGEX:trading_generic', confidence: 0.7 };
  }
  
  // Priority 16: Other sub-buckets (intent-based)
  if (PRICE_TODAY_PATTERN.test(norm) || PRICE_TODAY_PATTERN.test(asciiNorm)) {
    return { cluster_primary: 'Other - Price/Today', cluster_secondary: null, matched_rule: 'OTHER:price_today', confidence: 0.55 };
  }
  if (NEWS_CALENDAR_PATTERN.test(norm) || NEWS_CALENDAR_PATTERN.test(asciiNorm)) {
    return { cluster_primary: 'Other - News/Calendar', cluster_secondary: null, matched_rule: 'OTHER:news_calendar', confidence: 0.55 };
  }
  if (REGULATION_PATTERN.test(norm) || REGULATION_PATTERN.test(asciiNorm)) {
    return { cluster_primary: 'Other - Regulation/Legal', cluster_secondary: null, matched_rule: 'OTHER:regulation', confidence: 0.55 };
  }
  if (LOGIN_ACCESS_PATTERN.test(norm) || LOGIN_ACCESS_PATTERN.test(asciiNorm)) {
    return { cluster_primary: 'Other - Login/Access', cluster_secondary: null, matched_rule: 'OTHER:login_access', confidence: 0.55 };
  }
  
  // Priority 17: Junk / Noise
  if (JUNK_PATTERN.test(norm) || norm.length < 2) {
    return { cluster_primary: 'Junk / Noise', cluster_secondary: null, matched_rule: 'JUNK', confidence: 0.2 };
  }
  
  // Default: General Longtail
  return {
    cluster_primary: 'Other - General Longtail',
    cluster_secondary: null,
    matched_rule: 'DEFAULT:longtail',
    confidence: 0.3,
  };
}

// =====================================================
// INTENT CLASSIFICATION (with no_money_intent FIRST)
// =====================================================

export function classifyIntent(norm: string, asciiNorm: string): { intent: Intent; matched_pattern: string } {
  // HIGHEST PRIORITY: no_money_intent
  if (isNoMoneyIntent(norm, asciiNorm)) {
    return { intent: 'no_money_intent', matched_pattern: 'NO_MONEY_PATTERNS' };
  }
  
  // Check other intents in order
  for (const { intent, pattern } of INTENT_PATTERNS) {
    if (pattern.test(norm) || pattern.test(asciiNorm)) {
      return { intent, matched_pattern: pattern.source };
    }
  }
  
  return { intent: 'generic', matched_pattern: 'DEFAULT' };
}

// =====================================================
// TAG COMPUTATION
// =====================================================

function computeTags(norm: string, asciiNorm: string, language: 'ar' | 'en' | 'mixed'): Tags {
  const tags: Tags = { language };
  
  // Asset tags
  if (BITCOIN_PATTERN.test(norm) || BITCOIN_PATTERN.test(asciiNorm)) {
    tags.asset_tag = 'BTC';
  } else if (ETHEREUM_PATTERN.test(norm) || ETHEREUM_PATTERN.test(asciiNorm)) {
    tags.asset_tag = 'ETH';
  } else if (GOLD_PATTERN.test(norm) || GOLD_PATTERN.test(asciiNorm)) {
    tags.asset_tag = 'XAU';
  } else if (FX_PAIRS_PATTERN.test(norm) || FX_PAIRS_PATTERN.test(asciiNorm)) {
    const match = (norm + ' ' + asciiNorm).match(FX_PAIRS_PATTERN);
    if (match) tags.asset_tag = match[0].toUpperCase();
  }
  
  // Platform tags
  if (TRADINGVIEW_PATTERN.test(norm) || TRADINGVIEW_PATTERN.test(asciiNorm)) {
    tags.platform_tag = 'TradingView';
  } else if (METATRADER_PATTERN.test(norm) || METATRADER_PATTERN.test(asciiNorm)) {
    tags.platform_tag = 'MetaTrader';
  }
  
  return tags;
}

// =====================================================
// OPPORTUNITY SCORING
// =====================================================

function parseNumeric(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  // Remove currency symbols and commas
  const cleaned = String(value).replace(/[$€£,\s]/g, '').replace(/%$/, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function computeScores(rows: ProcessedKeyword[]): void {
  // Group by cluster for normalization
  const clusterMap = new Map<string, ProcessedKeyword[]>();
  
  for (const row of rows) {
    const cluster = row.cluster_primary;
    if (!clusterMap.has(cluster)) clusterMap.set(cluster, []);
    clusterMap.get(cluster)!.push(row);
  }
  
  // Compute scores within each cluster
  for (const [, kwList] of clusterMap) {
    // Get min/max for normalization
    let maxCtr = 0;
    let maxCvr = 0;
    let minCpa = Infinity;
    
    for (const kw of kwList) {
      const ctr = kw.ctr || 0;
      const cvr = kw.cost && kw.cost > 0 && kw.conversions ? kw.conversions / kw.cost : 0;
      const cpa = kw.conversions && kw.conversions > 0 && kw.cost ? kw.cost / kw.conversions : Infinity;
      
      if (ctr > maxCtr) maxCtr = ctr;
      if (cvr > maxCvr) maxCvr = cvr;
      if (cpa < minCpa && cpa > 0) minCpa = cpa;
    }
    
    // Compute normalized score
    for (const kw of kwList) {
      const ctr = kw.ctr || 0;
      const cvr = kw.cost && kw.cost > 0 && kw.conversions ? kw.conversions / kw.cost : 0;
      const cpa = kw.conversions && kw.conversions > 0 && kw.cost ? kw.cost / kw.conversions : Infinity;
      
      const ctrScore = maxCtr > 0 ? (ctr / maxCtr) * 33 : 0;
      const cvrScore = maxCvr > 0 ? (cvr / maxCvr) * 33 : 0;
      const cpaScore = minCpa < Infinity && cpa < Infinity ? (minCpa / cpa) * 34 : 0;
      
      kw.opportunity_score = Math.round(ctrScore + cvrScore + cpaScore);
    }
  }
}

// =====================================================
// LEAKAGE SUGGESTION BUILDER
// =====================================================

const STOPWORDS = new Set([
  'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'are', 'was', 'were',
  'what', 'how', 'why', 'when', 'where', 'which', 'who', 'whom', 'whose', 'that', 'this', 'these', 'those',
  'with', 'from', 'by', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'under', 'over', 'up', 'down', 'out', 'off', 'away', 'back', 'again', 'further', 'then',
  'once', 'here', 'there', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'can', 'will', 'should', 'now',
  // Arabic stopwords
  'في', 'على', 'من', 'إلى', 'عن', 'مع', 'هل', 'ما', 'كيف', 'لماذا', 'متى', 'أين', 'ان', 'كان', 'هذا', 'هذه',
  'ذلك', 'تلك', 'هؤلاء', 'اولئك', 'الذي', 'التي', 'الذين', 'اللاتي', 'اللواتي', 'او', 'و', 'ثم', 'لكن', 'بل',
]);

function extractTokens(text: string, language: 'ar' | 'en' | 'mixed'): string[] {
  const norm = text.toLowerCase().replace(/[.,\/;:_\-\(\)\[\]\{\}\"'`!@#$%^&*+=<>?\\|~]/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = norm.split(' ').filter(t => t.length > 1 && !STOPWORDS.has(t));
  return tokens;
}

function extractBigrams(tokens: string[]): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return bigrams;
}

export function buildLeakageSuggestions(
  rows: ProcessedKeyword[],
  dictionaries: DictionaryEntry[]
): LeakageSuggestion[] {
  // Only analyze "Other - General Longtail" with meaningful spend
  const longtailRows = rows.filter(
    r => r.cluster_primary === 'Other - General Longtail' && (r.cost || 0) >= 10
  );
  
  if (longtailRows.length === 0) return [];
  
  // Count token and bigram frequency
  const tokenCounts = new Map<string, { count: number; cost: number; clicks: number; terms: string[] }>();
  const bigramCounts = new Map<string, { count: number; cost: number; clicks: number; terms: string[] }>();
  
  // Get existing dictionary aliases to avoid duplicates
  const existingAliases = new Set(dictionaries.map(d => d.alias.toLowerCase().trim()));
  
  for (const row of longtailRows) {
    const norm = normalizeTerm(row.keyword);
    const tokens = extractTokens(norm.search_term_norm, norm.language);
    const bigrams = extractBigrams(tokens);
    
    for (const token of tokens) {
      if (existingAliases.has(token)) continue;
      if (!tokenCounts.has(token)) {
        tokenCounts.set(token, { count: 0, cost: 0, clicks: 0, terms: [] });
      }
      const entry = tokenCounts.get(token)!;
      entry.count++;
      entry.cost += row.cost || 0;
      entry.clicks += row.clicks;
      if (entry.terms.length < 5) entry.terms.push(row.keyword);
    }
    
    for (const bigram of bigrams) {
      if (existingAliases.has(bigram)) continue;
      if (!bigramCounts.has(bigram)) {
        bigramCounts.set(bigram, { count: 0, cost: 0, clicks: 0, terms: [] });
      }
      const entry = bigramCounts.get(bigram)!;
      entry.count++;
      entry.cost += row.cost || 0;
      entry.clicks += row.clicks;
      if (entry.terms.length < 5) entry.terms.push(row.keyword);
    }
  }
  
  const suggestions: LeakageSuggestion[] = [];
  
  // Suggest bigrams that appear frequently
  for (const [phrase, data] of bigramCounts) {
    if (data.count >= 3 && data.cost >= 50) {
      suggestions.push({
        suggestion_type: 'dictionary_candidate',
        extracted_phrase: phrase,
        evidence_terms: data.terms,
        evidence_cost: data.cost,
        evidence_clicks: data.clicks,
        proposed_dict_name: 'brand_terms',
        proposed_canonical: phrase.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        proposed_alias: phrase,
      });
    }
  }
  
  // Suggest single tokens that appear very frequently
  for (const [token, data] of tokenCounts) {
    if (data.count >= 5 && data.cost >= 100 && token.length >= 4) {
      // Check if this looks like a potential brand/competitor name
      const isProperNoun = /^[A-Z]/.test(token) || token.length >= 5;
      if (isProperNoun) {
        suggestions.push({
          suggestion_type: 'alias_candidate',
          extracted_phrase: token,
          evidence_terms: data.terms,
          evidence_cost: data.cost,
          evidence_clicks: data.clicks,
          proposed_dict_name: 'competitors',
          proposed_canonical: token.charAt(0).toUpperCase() + token.slice(1),
          proposed_alias: token,
        });
      }
    }
  }
  
  // Sort by evidence cost descending
  return suggestions.sort((a, b) => b.evidence_cost - a.evidence_cost).slice(0, 20);
}

// =====================================================
// MAIN PROCESSING FUNCTION
// =====================================================

export function processKeywords(
  csvText: string,
  dictionaries: DictionaryEntry[],
  customRules: CustomRule[] = []
): { rows: ProcessedKeyword[]; parseResult: CsvParseResult; leakageSuggestions: LeakageSuggestion[] } {
  // Parse and clean CSV (now with expanded ignore patterns)
  const parseResult = parseAndCleanCsv(csvText);
  
  const rows: ProcessedKeyword[] = [];
  
  for (const rawRow of parseResult.cleanRows) {
    // Double-check: skip any row that slipped through
    if (shouldIgnoreRow(rawRow.search_term)) continue;
    
    const keyword = rawRow.search_term;
    const norm = normalizeTerm(keyword);
    
    // Classify
    const classification = classifyPrimary(norm.search_term_norm, norm.search_term_norm_ascii, dictionaries, customRules);
    const intentResult = classifyIntent(norm.search_term_norm, norm.search_term_norm_ascii);
    const tags = computeTags(norm.search_term_norm, norm.search_term_norm_ascii, norm.language);
    
    const row: ProcessedKeyword = {
      keyword,
      clicks: parseNumeric(rawRow.clicks),
      impressions: parseNumeric(rawRow.impressions),
      ctr: rawRow.ctr ? parseNumeric(rawRow.ctr) / 100 : null,
      cost: rawRow.cost ? parseNumeric(rawRow.cost) : null,
      conversions: rawRow.conversions ? parseNumeric(rawRow.conversions) : null,
      campaign: rawRow.campaign || null,
      ad_group: rawRow.ad_group || null,
      match_type: rawRow.match_type || null,
      
      cluster_primary: classification.cluster_primary,
      cluster_secondary: classification.cluster_secondary,
      intent: intentResult.intent,
      matched_rule: classification.matched_rule,
      confidence: classification.confidence,
      tags,
      opportunity_score: null,
      
      search_term_norm: norm.search_term_norm,
      search_term_norm_ascii: norm.search_term_norm_ascii,
    };
    
    rows.push(row);
  }
  
  // Compute opportunity scores
  computeScores(rows);
  
  // Build leakage suggestions
  const leakageSuggestions = buildLeakageSuggestions(rows, dictionaries);
  
  return { rows, parseResult, leakageSuggestions };
}
