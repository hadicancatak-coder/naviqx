import { useState, useMemo, useCallback } from "react";
import { Search, Upload, TrendingUp, Layers, Download, Copy, AlertCircle, CheckCircle2, FolderOpen, Save, ChevronRight, Sparkles, Check, X, Zap, Target, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, CircleCheck, CircleAlert, Circle } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataCard, DataCardHeader } from "@/components/layout/DataCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useKeywordLists } from "@/hooks/useKeywordLists";
import { useKeywordDictionaries, useLeakageSuggestions, type LeakageSuggestionWithId } from "@/hooks/useKeywordDictionaries";
import { SaveKeywordListDialog } from "@/components/keyword-intel/SaveKeywordListDialog";
import { SavedKeywordListsTab } from "@/components/keyword-intel/SavedKeywordListsTab";
import { SuggestionCard } from "@/components/keyword-intel/SuggestionCard";
import { 
  processKeywords, 
  type ProcessedKeyword, 
  type CsvParseResult,
  type LeakageSuggestion,
  CLUSTER_TAXONOMY,
} from "@/lib/keywordEngine";
import {
  computeUnifiedActions,
  generateExecutiveSummary,
  computeClusterKPIs,
  computeConfidenceStats,
  exportUnifiedActionsCSV,
  exportNegativesOnlyCSV,
  exportMovesOnlyCSV,
  INSIGHTS_PRESETS,
  type InsightsPreset,
  type UnifiedAction,
} from "@/lib/keywordInsights";

// Types for UI state
interface ClusterSummary {
  name: string;
  keywords: ProcessedKeyword[];
  totalImpressions: number;
  totalClicks: number;
  totalCost: number;
  totalConversions: number;
  avgCTR: number;
  avgCPA: number;
  avgScore: number;
}

// Sortable column type
type SortColumn = 'keyword' | 'cluster' | 'intent' | 'score' | 'confidence' | 'clicks' | 'impressions' | 'ctr' | 'cost' | 'conversions' | 'cpa' | 'campaign' | 'ad_group';
type SortDirection = 'asc' | 'desc';

export default function KeywordIntel() {
  const { toast } = useToast();
  const { createList } = useKeywordLists();
  const { dictionaries, customRules, isLoading: dictionariesLoading } = useKeywordDictionaries();
  
  const [activeTab, setActiveTab] = useState("upload");
  const [processedData, setProcessedData] = useState<ProcessedKeyword[]>([]);
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [leakageSuggestions, setLeakageSuggestions] = useState<LeakageSuggestion[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isUploaded, setIsUploaded] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);

  // Leakage suggestions from DB
  const { 
    suggestions: dbSuggestions, 
    saveSuggestions, 
    acceptSuggestion, 
    rejectSuggestion 
  } = useLeakageSuggestions(runId);

  // Filters
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [adGroupFilter, setAdGroupFilter] = useState<string>("all");
  const [matchTypeFilter, setMatchTypeFilter] = useState<string>("all");
  const [clusterFilter, setClusterFilter] = useState<string>("all");
  const [intentFilter, setIntentFilter] = useState<string>("all");
  const [minScore, setMinScore] = useState<number>(0);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn>('cost');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Suggestion editing state
  const [editingSuggestion, setEditingSuggestion] = useState<string | null>(null);
  const [suggestionCanonical, setSuggestionCanonical] = useState('');
  const [suggestionAlias, setSuggestionAlias] = useState('');

  // Insights config state - now using presets
  const [insightsPreset, setInsightsPreset] = useState<InsightsPreset>('balanced');
  const insightsConfig = INSIGHTS_PRESETS[insightsPreset];

  // Pending suggestions from DB
  const pendingSuggestions = useMemo(() => {
    return dbSuggestions.filter(s => s.status === 'pending');
  }, [dbSuggestions]);

  // Handle column sort
  const handleSort = useCallback((column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  }, [sortColumn]);

  // Sorted and filtered data
  const filteredData = useMemo(() => {
    const data = processedData.filter(kw => {
      if (campaignFilter !== "all" && kw.campaign !== campaignFilter) return false;
      if (adGroupFilter !== "all" && kw.ad_group !== adGroupFilter) return false;
      if (matchTypeFilter !== "all" && kw.match_type !== matchTypeFilter) return false;
      if (clusterFilter !== "all" && kw.cluster_primary !== clusterFilter) return false;
      if (intentFilter !== "all" && kw.intent !== intentFilter) return false;
      if (kw.opportunity_score !== null && kw.opportunity_score < minScore / 100) return false;
      return true;
    });

    // Sort
    const sorted = [...data].sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let aVal: any, bVal: any;
      switch (sortColumn) {
        case 'keyword': aVal = a.keyword; bVal = b.keyword; break;
        case 'cluster': aVal = a.cluster_primary; bVal = b.cluster_primary; break;
        case 'intent': aVal = a.intent; bVal = b.intent; break;
        case 'score': aVal = a.opportunity_score || 0; bVal = b.opportunity_score || 0; break;
        case 'confidence': aVal = a.confidence; bVal = b.confidence; break;
        case 'clicks': aVal = a.clicks; bVal = b.clicks; break;
        case 'impressions': aVal = a.impressions; bVal = b.impressions; break;
        case 'ctr': aVal = a.ctr || 0; bVal = b.ctr || 0; break;
        case 'cost': aVal = a.cost || 0; bVal = b.cost || 0; break;
        case 'conversions': aVal = a.conversions || 0; bVal = b.conversions || 0; break;
        case 'cpa': 
          aVal = a.conversions ? (a.cost || 0) / a.conversions : Infinity;
          bVal = b.conversions ? (b.cost || 0) / b.conversions : Infinity;
          break;
        case 'campaign': aVal = a.campaign || ''; bVal = b.campaign || ''; break;
        case 'ad_group': aVal = a.ad_group || ''; bVal = b.ad_group || ''; break;
        default: aVal = 0; bVal = 0;
      }
      
      if (typeof aVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [processedData, campaignFilter, adGroupFilter, matchTypeFilter, clusterFilter, intentFilter, minScore, sortColumn, sortDirection]);

  // Get unique values for filters
  const uniqueCampaigns = useMemo(() => 
    [...new Set(processedData.map(k => k.campaign).filter(Boolean) as string[])].sort(), 
    [processedData]
  );
  const uniqueAdGroups = useMemo(() => 
    [...new Set(processedData.map(k => k.ad_group).filter(Boolean) as string[])].sort(), 
    [processedData]
  );
  const uniqueMatchTypes = useMemo(() => 
    [...new Set(processedData.map(k => k.match_type).filter(Boolean) as string[])].sort(), 
    [processedData]
  );
  const uniqueClusters = useMemo(() => 
    [...new Set(processedData.map(k => k.cluster_primary).filter(Boolean))].sort(), 
    [processedData]
  );
  const uniqueIntents = useMemo(() => 
    [...new Set(processedData.map(k => k.intent).filter(Boolean))].sort(), 
    [processedData]
  );

  // Group keywords by cluster for summary
  const clusterSummaries = useMemo((): ClusterSummary[] => {
    const clusterMap = new Map<string, ProcessedKeyword[]>();

    filteredData.forEach(kw => {
      const clusterName = kw.cluster_primary || 'Other';
      if (!clusterMap.has(clusterName)) clusterMap.set(clusterName, []);
      clusterMap.get(clusterName)!.push(kw);
    });

    return Array.from(clusterMap.entries())
      .map(([name, items]) => {
        const totalImpressions = items.reduce((sum, k) => sum + k.impressions, 0);
        const totalClicks = items.reduce((sum, k) => sum + k.clicks, 0);
        const totalCost = items.reduce((sum, k) => sum + (k.cost || 0), 0);
        const totalConversions = items.reduce((sum, k) => sum + (k.conversions || 0), 0);
        const avgCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
        const avgCPA = totalConversions > 0 ? totalCost / totalConversions : 0;
        const avgScore = items.reduce((sum, k) => sum + (k.opportunity_score || 0), 0) / items.length;

        return {
          name,
          keywords: items.sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0)),
          totalImpressions,
          totalClicks,
          totalCost,
          totalConversions,
          avgCTR,
          avgCPA,
          avgScore,
        };
      })
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [filteredData]);

  // =====================================================
  // INSIGHTS COMPUTATIONS (Simplified)
  // =====================================================
  
  const unifiedActions = useMemo(() => 
    computeUnifiedActions(processedData, insightsConfig), 
    [processedData, insightsConfig]
  );
  
  const executiveSummary = useMemo(() => 
    generateExecutiveSummary(processedData, unifiedActions), 
    [processedData, unifiedActions]
  );
  
  const clusterKPIs = useMemo(() => computeClusterKPIs(processedData), [processedData]);
  
  const confidenceStats = useMemo(() => computeConfidenceStats(processedData), [processedData]);

  // Export handlers for insights
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAllActions = () => downloadCSV(exportUnifiedActionsCSV(unifiedActions), 'all_actions.csv');
  const exportNegatives = () => downloadCSV(exportNegativesOnlyCSV(unifiedActions), 'negatives_for_editor.csv');
  const exportMoves = () => downloadCSV(exportMovesOnlyCSV(unifiedActions), 'move_recommendations.csv');

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSourceFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      
      // Process using new engine
      const result = processKeywords(text, dictionaries, customRules);
      
      if (result.parseResult.cleanRows.length === 0) {
        setParseError("Could not find valid data rows. Make sure the file has a 'Search term' column.");
        setProcessedData([]);
        setParseResult(null);
        return;
      }

      setParseError(null);
      setProcessedData(result.rows);
      setParseResult(result.parseResult);
      setLeakageSuggestions(result.leakageSuggestions);
    };
    reader.readAsText(file);
  };

  const confirmUpload = async () => {
    setIsUploaded(true);
    
    // Generate run ID and save leakage suggestions
    const newRunId = crypto.randomUUID();
    setRunId(newRunId);
    
    if (leakageSuggestions.length > 0) {
      await saveSuggestions.mutateAsync({ runId: newRunId, suggestions: leakageSuggestions });
    }
    
    setActiveTab("opportunities");
    toast({ 
      title: "Data imported", 
      description: `${processedData.length} keywords processed with ${leakageSuggestions.length} optimization suggestions` 
    });
  };

  // Export to CSV
  const exportCSV = () => {
    const headers = ['Keyword', 'Cluster', 'Secondary', 'Intent', 'Confidence', 'Matched Rule', 'Score', 'Language', 'Campaign', 'Ad Group', 'Clicks', 'Impr', 'CTR', 'Cost', 'Conv', 'Cost/Conv'];
    const rows = filteredData.map(k => {
      const cpa = k.conversions ? (k.cost || 0) / k.conversions : null;
      return [
        `"${k.keyword}"`,
        k.cluster_primary,
        k.cluster_secondary || '',
        k.intent,
        k.confidence.toFixed(2),
        k.matched_rule,
        k.opportunity_score?.toFixed(2) || '0',
        k.tags.language || 'en',
        `"${k.campaign || ''}"`,
        `"${k.ad_group || ''}"`,
        k.clicks,
        k.impressions,
        k.ctr ? (k.ctr * 100).toFixed(2) + '%' : '',
        k.cost?.toFixed(2) || '',
        k.conversions || '',
        cpa !== null ? cpa.toFixed(2) : ''
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'keyword-opportunities.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyTable = () => {
    const headers = ['Keyword', 'Cluster', 'Intent', 'Score', 'Clicks', 'Impr', 'CTR', 'Cost', 'Conv', 'Cost/Conv'];
    const rows = filteredData.map(k => {
      const cpa = k.conversions ? (k.cost || 0) / k.conversions : null;
      return [
        k.keyword,
        k.cluster_primary,
        k.intent,
        k.opportunity_score?.toFixed(2) || '0',
        k.clicks,
        k.impressions,
        k.ctr ? (k.ctr * 100).toFixed(2) + '%' : '',
        k.cost?.toFixed(2) || '',
        k.conversions || '',
        cpa !== null ? '$' + cpa.toFixed(2) : '-'
      ].join('\t');
    });

    navigator.clipboard.writeText([headers.join('\t'), ...rows].join('\n'));
    toast({ title: "Copied to clipboard" });
  };

  const getScoreBadge = (score: number) => {
    const displayScore = Math.round(score * 100);
    if (displayScore >= 70) return <Badge className="bg-success/15 text-success border-success/30">{displayScore}</Badge>;
    if (displayScore >= 40) return <Badge className="bg-warning/15 text-warning border-warning/30">{displayScore}</Badge>;
    return <Badge variant="secondary">{displayScore}</Badge>;
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) return <Badge className="bg-success/15 text-success border-success/30">{(confidence * 100).toFixed(0)}%</Badge>;
    if (confidence >= 0.7) return <Badge className="bg-warning/15 text-warning border-warning/30">{(confidence * 100).toFixed(0)}%</Badge>;
    return <Badge variant="secondary">{(confidence * 100).toFixed(0)}%</Badge>;
  };

  const getIntentBadge = (intent: string) => {
    const colors: Record<string, string> = {
      'login_access': 'bg-blue-500/15 text-blue-600 border-blue-500/30',
      'transactional_open_account': 'bg-green-500/15 text-green-600 border-green-500/30',
      'app_download': 'bg-purple-500/15 text-purple-600 border-purple-500/30',
      'price_today': 'bg-orange-500/15 text-orange-600 border-orange-500/30',
      'charts_analysis': 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
      'how_to_education': 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
      'regulation_trust': 'bg-red-500/15 text-red-600 border-red-500/30',
      'news_calendar': 'bg-pink-500/15 text-pink-600 border-pink-500/30',
    };
    return <Badge className={colors[intent] || ''} variant={colors[intent] ? undefined : 'secondary'}>{intent}</Badge>;
  };

  // Sortable header component
  const SortableHeader = ({ column, label }: { column: SortColumn; label: string }) => (
    <TableHead 
      className="cursor-pointer hover:bg-subtle transition-smooth select-none"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-xs">
        {label}
        {sortColumn === column ? (
          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
        )}
      </div>
    </TableHead>
  );

  // Handle save analysis
  const handleSaveAnalysis = async (data: { name: string; entity: string; description?: string }) => {
    const items = filteredData.map(kw => ({
      keyword: kw.keyword,
      opportunity_score: kw.opportunity_score ? Math.round(kw.opportunity_score * 100) : null,
      clicks: kw.clicks,
      impressions: kw.impressions,
      ctr: kw.ctr || null,
      cost: kw.cost,
      conversions: kw.conversions,
      campaign: kw.campaign,
      ad_group: kw.ad_group,
      match_type: kw.match_type,
      action_taken: 'pending',
      notes: null,
    }));

    await createList.mutateAsync({
      name: data.name,
      entity: data.entity,
      description: data.description,
      source_file: sourceFileName || undefined,
      items,
    });

    setSaveDialogOpen(false);
  };

  // Handle suggestion actions - With cluster override support
  const handleAcceptSuggestion = async (suggestion: LeakageSuggestionWithId, overrideCluster?: string) => {
    // Determine classification method based on cluster selection
    const cluster = overrideCluster || 'Other';
    const isCompetitor = cluster === 'Competitors';
    const isBrand = cluster === 'Brand - CFI';
    
    // If it's a standard cluster (Competitors/Brand), use dictionary
    // Otherwise, use custom_rules for custom clusters
    if (isCompetitor || isBrand) {
      await acceptSuggestion.mutateAsync({
        id: suggestion.id,
        accept_as: isCompetitor ? 'competitors' : 'brand_terms',
        chosen_canonical: suggestion.proposed_canonical || suggestion.extracted_phrase,
        chosen_alias: suggestion.proposed_alias || suggestion.extracted_phrase,
        chosen_cluster_primary: null,
        chosen_rule_pattern: null,
      });
    } else {
      // Use custom_rules for other clusters - engine will learn from this
      await acceptSuggestion.mutateAsync({
        id: suggestion.id,
        accept_as: 'custom_rules',
        chosen_canonical: null,
        chosen_alias: null,
        chosen_cluster_primary: cluster,
        chosen_rule_pattern: suggestion.extracted_phrase.toLowerCase(),
      });
    }
    
    // Reclassify affected rows in memory
    const alias = suggestion.proposed_alias || suggestion.extracted_phrase;
    const canonical = suggestion.proposed_canonical || suggestion.extracted_phrase;
    
    setProcessedData(prev => prev.map(row => {
      const aliasLower = alias.toLowerCase();
      if (row.cluster_primary.startsWith('Other') && row.keyword.toLowerCase().includes(aliasLower)) {
        return {
          ...row,
          cluster_primary: cluster,
          cluster_secondary: isCompetitor ? canonical : null,
          matched_rule: isCompetitor || isBrand 
            ? `DICT:${isCompetitor ? 'competitors' : 'brand_terms'}:${canonical}`
            : `CUSTOM_RULE:${suggestion.extracted_phrase}`,
          confidence: 1.0,
        };
      }
      return row;
    }));
    
    toast({ 
      title: "Classification learned", 
      description: `"${suggestion.extracted_phrase}" → ${cluster}. Engine will apply this in future analyses.` 
    });
  };

  const handleRejectSuggestion = async (id: string) => {
    await rejectSuggestion.mutateAsync(id);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Keyword Intel"
        description="Analyze search term reports to find opportunities and structure improvements"
        icon={Search}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-lg">
          <TabsTrigger value="upload" className="gap-xs">
            <Upload className="h-4 w-4" /> Upload
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="gap-xs" disabled={!isUploaded}>
            <TrendingUp className="h-4 w-4" /> Keyword List
          </TabsTrigger>
          <TabsTrigger value="clusters" className="gap-xs" disabled={!isUploaded}>
            <Layers className="h-4 w-4" /> Clusters
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-xs" disabled={!isUploaded}>
            <Sparkles className="h-4 w-4" /> Suggestions
            {pendingSuggestions.length > 0 && (
              <Badge variant="secondary" className="ml-xs text-metadata">{pendingSuggestions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-xs" disabled={!isUploaded}>
            <Zap className="h-4 w-4" /> Actions
          </TabsTrigger>
          <TabsTrigger value="saved" className="gap-xs">
            <FolderOpen className="h-4 w-4" /> Saved Lists
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-lg">
          <DataCard>
            <DataCardHeader 
              title="Upload Search Term Report" 
              description="Upload a CSV export from Google Ads Search Term Report. The engine will auto-classify keywords."
            />
            
            <div className="space-y-md">
              <div className="border-2 border-dashed border-border rounded-lg p-lg text-center hover:border-primary/50 transition-smooth">
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-md text-muted-foreground" />
                  <p className="text-body font-medium">Click to upload CSV file</p>
                  <p className="text-body-sm text-muted-foreground mt-xs">
                    Supports Google Ads Search Term Report format (English & Arabic)
                  </p>
                </label>
              </div>

              {parseError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{parseError}</AlertDescription>
                </Alert>
              )}

              {parseResult && processedData.length > 0 && (
                <div className="space-y-md">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <AlertDescription>
                      Processed {parseResult.rowCountClean} of {parseResult.rowCountRaw} rows. 
                      Found {leakageSuggestions.length} optimization suggestions.
                    </AlertDescription>
                  </Alert>

                  {/* Confidence Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
                    <div className="p-md bg-elevated rounded-lg border border-border">
                      <p className="text-metadata text-muted-foreground">Total Keywords</p>
                      <p className="text-heading-md font-semibold">{processedData.length}</p>
                    </div>
                    <div className="p-md bg-elevated rounded-lg border border-border">
                      <p className="text-metadata text-muted-foreground">High Confidence (Dict)</p>
                      <p className="text-heading-md font-semibold text-success">
                        {confidenceStats.dictionaryPercent.toFixed(0)}%
                        <span className="text-metadata text-muted-foreground ml-xs">({confidenceStats.dictionaryMatched})</span>
                      </p>
                    </div>
                    <div className="p-md bg-elevated rounded-lg border border-border">
                      <p className="text-metadata text-muted-foreground">Medium Confidence (Regex)</p>
                      <p className="text-heading-md font-semibold text-warning">
                        {confidenceStats.regexPercent.toFixed(0)}%
                        <span className="text-metadata text-muted-foreground ml-xs">({confidenceStats.regexMatched})</span>
                      </p>
                    </div>
                    <div className="p-md bg-elevated rounded-lg border border-border">
                      <p className="text-metadata text-muted-foreground">Low Confidence (Other)</p>
                      <p className="text-heading-md font-semibold">
                        {confidenceStats.otherPercent.toFixed(0)}%
                        <span className="text-metadata text-muted-foreground ml-xs">({confidenceStats.otherMatched})</span>
                      </p>
                    </div>
                  </div>

                  <ScrollArea className="h-[300px] rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Search Term</TableHead>
                          <TableHead>Cluster</TableHead>
                          <TableHead>Intent</TableHead>
                          <TableHead>Confidence</TableHead>
                          <TableHead>Language</TableHead>
                          <TableHead>Clicks</TableHead>
                          <TableHead>Impr.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {processedData.slice(0, 20).map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium max-w-[200px] truncate">{row.keyword}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-metadata">
                                {row.cluster_primary}
                              </Badge>
                            </TableCell>
                            <TableCell>{getIntentBadge(row.intent)}</TableCell>
                            <TableCell>{getConfidenceBadge(row.confidence)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-metadata">{row.tags.language}</Badge>
                            </TableCell>
                            <TableCell>{row.clicks.toLocaleString()}</TableCell>
                            <TableCell>{row.impressions.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>

                  <Button onClick={confirmUpload}>
                    Confirm & Analyze {processedData.length} Search Terms
                  </Button>
                </div>
              )}

              {!processedData.length && !parseError && (
                <EmptyState
                  icon={Upload}
                  title="No file uploaded"
                  description="Upload a CSV export from Google Ads to get started"
                />
              )}
            </div>
          </DataCard>
        </TabsContent>

        <TabsContent value="opportunities" className="mt-lg space-y-md">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-md">
            <Select value={campaignFilter} onValueChange={setCampaignFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {uniqueCampaigns.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={adGroupFilter} onValueChange={setAdGroupFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Ad Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ad Groups</SelectItem>
                {uniqueAdGroups.map(ag => (
                  <SelectItem key={ag} value={ag}>{ag}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {uniqueMatchTypes.length > 0 && (
              <Select value={matchTypeFilter} onValueChange={setMatchTypeFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Match Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueMatchTypes.map(mt => (
                    <SelectItem key={mt} value={mt}>{mt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {uniqueClusters.length > 0 && (
              <Select value={clusterFilter} onValueChange={setClusterFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Cluster" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clusters</SelectItem>
                  {uniqueClusters.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {uniqueIntents.length > 0 && (
              <Select value={intentFilter} onValueChange={setIntentFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Intent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Intents</SelectItem>
                  {uniqueIntents.map(i => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex items-center gap-xs">
              <span className="text-body-sm text-muted-foreground">Min Score:</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={minScore}
                onChange={(e) => setMinScore(parseInt(e.target.value) || 0)}
                className="w-20"
              />
            </div>

            <div className="ml-auto flex gap-xs">
              <Button variant="outline" size="sm" onClick={copyTable}>
                <Copy className="h-4 w-4 mr-xs" /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-xs" /> Export CSV
              </Button>
              <Button size="sm" onClick={() => setSaveDialogOpen(true)}>
                <Save className="h-4 w-4 mr-xs" /> Save as List
              </Button>
            </div>
          </div>

          <DataCard>
            <DataCardHeader title={`Keyword List (${filteredData.length})`} />
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader column="keyword" label="Search Term" />
                    <SortableHeader column="campaign" label="Campaign" />
                    <SortableHeader column="ad_group" label="Ad Group" />
                    <SortableHeader column="cluster" label="Cluster" />
                    <SortableHeader column="intent" label="Intent" />
                    <SortableHeader column="score" label="Score" />
                    <SortableHeader column="confidence" label="Conf." />
                    <SortableHeader column="clicks" label="Clicks" />
                    <SortableHeader column="cost" label="Cost" />
                    <SortableHeader column="conversions" label="Conv." />
                    <SortableHeader column="cpa" label="Cost/Conv" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((row, i) => {
                    const cpa = row.conversions ? (row.cost || 0) / row.conversions : null;
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          <Tooltip>
                            <TooltipTrigger className="text-left truncate block max-w-[200px]">
                              {row.keyword}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{row.keyword}</p>
                              <p className="text-metadata text-muted-foreground mt-xs">
                                Rule: {row.matched_rule}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-metadata max-w-[120px] truncate">
                          {row.campaign || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-metadata max-w-[120px] truncate">
                          {row.ad_group || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-metadata">
                            {row.cluster_primary}
                          </Badge>
                        </TableCell>
                        <TableCell>{getIntentBadge(row.intent)}</TableCell>
                        <TableCell>{row.opportunity_score !== null ? getScoreBadge(row.opportunity_score) : '-'}</TableCell>
                        <TableCell>{getConfidenceBadge(row.confidence)}</TableCell>
                        <TableCell>{row.clicks.toLocaleString()}</TableCell>
                        <TableCell>{row.cost ? '$' + row.cost.toFixed(2) : '-'}</TableCell>
                        <TableCell>{row.conversions || '-'}</TableCell>
                        <TableCell className={cpa !== null && cpa > 500 ? 'text-destructive font-medium' : ''}>
                          {cpa !== null ? '$' + cpa.toFixed(2) : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </DataCard>
        </TabsContent>

        <TabsContent value="clusters" className="mt-lg space-y-md">
          {/* Cluster Summary Table */}
          <DataCard>
            <DataCardHeader 
              title="Cluster Summary" 
              description="Keywords auto-grouped by the engine's classification rules (dictionaries + regex patterns)"
            />
            {clusterSummaries.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="No clusters found"
                description="Upload keyword data to see clusters"
              />
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cluster</TableHead>
                      <TableHead className="text-right"># Keywords</TableHead>
                      <TableHead className="text-right">Impressions</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Conv.</TableHead>
                      <TableHead className="text-right">Cost/Conv</TableHead>
                      <TableHead className="text-right">Avg Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clusterSummaries.map((summary) => (
                      <TableRow key={summary.name}>
                        <TableCell>
                          <Badge variant={summary.name.startsWith('Other') || summary.name === 'Junk / Noise' ? 'secondary' : 'default'}>
                            {summary.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{summary.keywords.length}</TableCell>
                        <TableCell className="text-right">{summary.totalImpressions.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{summary.totalClicks.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{(summary.avgCTR * 100).toFixed(2)}%</TableCell>
                        <TableCell className="text-right">${summary.totalCost.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{summary.totalConversions}</TableCell>
                        <TableCell className="text-right">
                          {summary.avgCPA > 0 ? `$${summary.avgCPA.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">{getScoreBadge(summary.avgScore)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </DataCard>

          {/* Cluster Drilldown */}
          <DataCard>
            <DataCardHeader 
              title="Cluster Drilldown" 
              description="Expand to see keywords with their classification details"
            />
            <ScrollArea className="h-[400px]">
              <div className="space-y-sm">
                {clusterSummaries.map(summary => (
                  <Collapsible key={summary.name}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-md bg-elevated rounded-lg border border-border hover:bg-card-hover transition-smooth">
                        <div className="flex items-center gap-md">
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-90" />
                          <Badge variant={summary.name.startsWith('Other') ? 'secondary' : 'default'}>
                            {summary.name}
                          </Badge>
                          <span className="text-body-sm text-muted-foreground">
                            {summary.keywords.length} keywords
                          </span>
                        </div>
                        <div className="flex items-center gap-md text-body-sm text-muted-foreground">
                          <span>${summary.totalCost.toFixed(0)}</span>
                          <span>{summary.totalConversions} conv</span>
                          {getScoreBadge(summary.avgScore)}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-xs border border-border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-subtle">
                              <TableHead>Keyword</TableHead>
                              <TableHead>Campaign</TableHead>
                              <TableHead>Ad Group</TableHead>
                              <TableHead>Intent</TableHead>
                              <TableHead className="text-right">Cost</TableHead>
                              <TableHead className="text-right">Conv.</TableHead>
                              <TableHead className="text-right">Cost/Conv</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {summary.keywords.slice(0, 20).map((kw, i) => {
                              const cpa = kw.conversions ? (kw.cost || 0) / kw.conversions : null;
                              return (
                                <TableRow key={i}>
                                  <TableCell className="font-medium max-w-[200px] truncate">{kw.keyword}</TableCell>
                                  <TableCell className="text-muted-foreground text-metadata max-w-[120px] truncate">
                                    {kw.campaign || '-'}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-metadata max-w-[120px] truncate">
                                    {kw.ad_group || '-'}
                                  </TableCell>
                                  <TableCell>{getIntentBadge(kw.intent)}</TableCell>
                                  <TableCell className="text-right">${(kw.cost || 0).toFixed(0)}</TableCell>
                                  <TableCell className="text-right">{kw.conversions || '-'}</TableCell>
                                  <TableCell className="text-right">
                                    {cpa !== null ? `$${cpa.toFixed(0)}` : '-'}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          </DataCard>
        </TabsContent>

        {/* SIMPLIFIED SUGGESTIONS TAB */}
        <TabsContent value="suggestions" className="mt-lg">
          <DataCard>
            <DataCardHeader 
              title={`Classification Suggestions (${pendingSuggestions.length})`}
              description="High-cost terms in 'Other' that likely belong to known clusters. Accept to improve classification."
            />
            
            {pendingSuggestions.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No pending suggestions"
                description="All classification suggestions have been processed"
              />
            ) : (
              <div className="space-y-md">
                {pendingSuggestions.map((suggestion) => (
                  <SuggestionCard 
                    key={suggestion.id}
                    suggestion={suggestion}
                    onAccept={handleAcceptSuggestion}
                    onReject={handleRejectSuggestion}
                    isAccepting={acceptSuggestion.isPending}
                    isRejecting={rejectSuggestion.isPending}
                  />
                ))}
              </div>
            )}
          </DataCard>
        </TabsContent>

        {/* SIMPLIFIED INSIGHTS & ACTIONS TAB */}
        <TabsContent value="insights" className="mt-lg space-y-lg">
          {/* WHAT'S WRONG - Executive Summary */}
          <DataCard>
            <DataCardHeader 
              title="What's Wrong" 
              description="Issues identified in your account structure"
              action={
                <div className="flex gap-xs">
                  <Button 
                    variant={insightsPreset === 'conservative' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setInsightsPreset('conservative')}
                  >
                    Conservative
                  </Button>
                  <Button 
                    variant={insightsPreset === 'balanced' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setInsightsPreset('balanced')}
                  >
                    Balanced
                  </Button>
                  <Button 
                    variant={insightsPreset === 'aggressive' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setInsightsPreset('aggressive')}
                  >
                    Aggressive
                  </Button>
                </div>
              }
            />
            {processedData.length === 0 ? (
              <EmptyState
                icon={Zap}
                title="No data to analyze"
                description="Upload search term data to generate insights"
              />
            ) : (
              <div className="space-y-sm">
                {executiveSummary.bullets.map((bullet, i) => (
                  <div key={i} className="flex items-start gap-md p-md bg-elevated rounded-lg border border-border">
                    {bullet.icon === 'red' && <CircleAlert className="h-5 w-5 text-destructive flex-shrink-0 mt-xs" />}
                    {bullet.icon === 'yellow' && <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-xs" />}
                    {bullet.icon === 'green' && <CircleCheck className="h-5 w-5 text-success flex-shrink-0 mt-xs" />}
                    <p className="text-body">{bullet.text}</p>
                  </div>
                ))}
                
                <div className="flex items-center gap-lg pt-md text-body-sm text-muted-foreground">
                  <span>Total Spend: <strong className="text-foreground">${executiveSummary.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></span>
                  <span>Wasted: <strong className="text-destructive">${executiveSummary.totalWasted.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></span>
                  <span>Actions: <strong className="text-foreground">{executiveSummary.totalActions}</strong></span>
                </div>
              </div>
            )}
          </DataCard>

          {/* ACTIONS TO TAKE - Unified Table */}
          <DataCard>
            <DataCardHeader 
              title={`Actions to Take (${unifiedActions.length})`}
              description="All recommended changes in one place"
              action={
                <div className="flex gap-xs">
                  <Button variant="outline" size="sm" onClick={exportNegatives}>
                    <Download className="h-4 w-4 mr-xs" /> Negatives CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportMoves}>
                    <Download className="h-4 w-4 mr-xs" /> Moves CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportAllActions}>
                    <Download className="h-4 w-4 mr-xs" /> All Actions
                  </Button>
                </div>
              }
            />
            {unifiedActions.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No actions recommended"
                description="Your account structure looks healthy based on current thresholds"
              />
            ) : (
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Search Term</TableHead>
                      <TableHead>Current Location</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Conv.</TableHead>
                      <TableHead className="text-right">Savings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unifiedActions.slice(0, 100).map((action) => (
                      <TableRow key={action.id}>
                        <TableCell className="font-medium max-w-[180px] truncate">{action.search_term}</TableCell>
                        <TableCell className="text-muted-foreground text-metadata max-w-[150px] truncate">
                          {action.current_campaign ? `${action.current_campaign}` : '-'}
                          {action.current_ad_group ? ` / ${action.current_ad_group}` : ''}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              action.action_type === 'add_negative' ? 'bg-destructive/15 text-destructive border-destructive/30' :
                              action.action_type === 'move' ? 'bg-warning/15 text-warning border-warning/30' :
                              action.action_type === 'isolate' ? 'bg-primary/15 text-primary border-primary/30' :
                              action.action_type === 'review_manually' ? 'bg-muted text-muted-foreground' :
                              'bg-success/15 text-success border-success/30'
                            }
                          >
                            {action.action_type === 'add_negative' ? 'Add Negative' : 
                             action.action_type === 'move' ? 'Move' :
                             action.action_type === 'isolate' ? 'Isolate' :
                             action.action_type === 'review_manually' ? 'Review' :
                             action.action_type.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-primary font-medium max-w-[150px] truncate">
                          {action.target}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-metadata max-w-[200px] truncate">
                          {action.reason}
                        </TableCell>
                        <TableCell className="text-right">${action.evidence_cost.toFixed(0)}</TableCell>
                        <TableCell className="text-right">{action.evidence_conversions}</TableCell>
                        <TableCell className="text-right text-success font-medium">
                          {action.evidence_cost > 0 ? `$${action.evidence_cost.toFixed(0)}` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </DataCard>
        </TabsContent>

        <TabsContent value="saved" className="mt-lg">
          <SavedKeywordListsTab />
        </TabsContent>
      </Tabs>

      <SaveKeywordListDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        keywords={filteredData.map(kw => ({
          keyword: kw.keyword,
          opportunity_score: kw.opportunity_score ? Math.round(kw.opportunity_score * 100) : null,
          clicks: kw.clicks,
          impressions: kw.impressions,
          ctr: kw.ctr || null,
          cost: kw.cost,
          conversions: kw.conversions,
          campaign: kw.campaign,
          ad_group: kw.ad_group,
          match_type: kw.match_type,
        }))}
        onSave={handleSaveAnalysis}
        isSaving={createList.isPending}
      />
    </PageContainer>
  );
}
