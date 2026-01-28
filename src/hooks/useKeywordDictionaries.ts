import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { DictionaryEntry, CustomRule, LeakageSuggestion } from "@/lib/keywordEngine";

// =====================================================
// DATABASE TYPES
// =====================================================

interface DbDictionaryEntry {
  id: string;
  dict_name: string;
  canonical: string;
  alias: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface DbCustomRule {
  id: string;
  rule_name: string;
  pattern: string;
  match_type: string;
  target_cluster_primary: string;
  enabled: boolean;
  created_at: string;
  created_by: string | null;
}

interface DbLeakageSuggestion {
  id: string;
  run_id: string;
  suggestion_type: string;
  extracted_phrase: string;
  evidence_terms: string[] | null;
  evidence_cost: number | null;
  evidence_clicks: number | null;
  proposed_dict_name: string | null;
  proposed_canonical: string | null;
  proposed_alias: string | null;
  status: string;
  accept_as: string | null;
  chosen_canonical: string | null;
  chosen_alias: string | null;
  chosen_cluster_primary: string | null;
  chosen_rule_pattern: string | null;
  created_at: string;
  created_by: string | null;
}

// =====================================================
// DICTIONARIES HOOK
// =====================================================

export function useKeywordDictionaries() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all enabled dictionaries
  const { data: dictionaries = [], isLoading: dictionariesLoading } = useQuery({
    queryKey: ['keyword-dictionaries'],
    queryFn: async (): Promise<DictionaryEntry[]> => {
      const { data, error } = await supabase
        .from('keyword_dictionaries')
        .select('*')
        .eq('enabled', true)
        .order('canonical');

      if (error) throw error;
      
      return (data as DbDictionaryEntry[]).map(d => ({
        id: d.id,
        dict_name: d.dict_name as 'brand_terms' | 'competitors',
        canonical: d.canonical,
        alias: d.alias,
        enabled: d.enabled,
      }));
    },
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Fetch all custom rules
  const { data: customRules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['keyword-custom-rules'],
    queryFn: async (): Promise<CustomRule[]> => {
      const { data, error } = await supabase
        .from('keyword_custom_rules')
        .select('*')
        .eq('enabled', true)
        .order('created_at');

      if (error) throw error;
      
      return (data as DbCustomRule[]).map(r => ({
        id: r.id,
        rule_name: r.rule_name,
        pattern: r.pattern,
        match_type: r.match_type as 'contains_phrase' | 'regex',
        target_cluster_primary: r.target_cluster_primary,
        enabled: r.enabled,
      }));
    },
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Add dictionary entry
  const addDictionaryEntry = useMutation({
    mutationFn: async (entry: { dict_name: 'brand_terms' | 'competitors'; canonical: string; alias: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('keyword_dictionaries')
        .upsert({
          dict_name: entry.dict_name,
          canonical: entry.canonical,
          alias: entry.alias,
          enabled: true,
          created_by: user?.id,
        }, {
          onConflict: 'dict_name,canonical,alias',
        })
        .select()
        .single();

      if (error) throw error;
      
      // Also add punctuation-stripped version if alias contains '.'
      if (entry.alias.includes('.')) {
        const strippedAlias = entry.alias.replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
        if (strippedAlias !== entry.alias) {
          await supabase
            .from('keyword_dictionaries')
            .upsert({
              dict_name: entry.dict_name,
              canonical: entry.canonical,
              alias: strippedAlias,
              enabled: true,
              created_by: user?.id,
            }, {
              onConflict: 'dict_name,canonical,alias',
            });
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyword-dictionaries'] });
      toast({ title: 'Dictionary updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating dictionary', description: error.message, variant: 'destructive' });
    },
  });

  // Add custom rule
  const addCustomRule = useMutation({
    mutationFn: async (rule: { rule_name: string; pattern: string; match_type: 'contains_phrase' | 'regex'; target_cluster_primary: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('keyword_custom_rules')
        .insert({
          rule_name: rule.rule_name,
          pattern: rule.pattern,
          match_type: rule.match_type,
          target_cluster_primary: rule.target_cluster_primary,
          enabled: true,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyword-custom-rules'] });
      toast({ title: 'Custom rule added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding rule', description: error.message, variant: 'destructive' });
    },
  });

  return {
    dictionaries,
    customRules,
    isLoading: dictionariesLoading || rulesLoading,
    addDictionaryEntry,
    addCustomRule,
  };
}

// =====================================================
// LEAKAGE SUGGESTIONS HOOK
// =====================================================

export interface LeakageSuggestionWithId extends LeakageSuggestion {
  id: string;
  run_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  accept_as: 'competitors' | 'brand_terms' | 'custom_rules' | null;
  chosen_canonical: string | null;
  chosen_alias: string | null;
  chosen_cluster_primary: string | null;
  chosen_rule_pattern: string | null;
}

export function useLeakageSuggestions(runId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch suggestions for a specific run
  const { data: suggestions = [], isLoading, refetch } = useQuery({
    queryKey: ['keyword-leakage-suggestions', runId],
    queryFn: async (): Promise<LeakageSuggestionWithId[]> => {
      if (!runId) return [];
      
      const { data, error } = await supabase
        .from('keyword_leakage_suggestions')
        .select('*')
        .eq('run_id', runId)
        .order('evidence_cost', { ascending: false });

      if (error) throw error;
      
      return (data as DbLeakageSuggestion[]).map(s => ({
        id: s.id,
        run_id: s.run_id,
        suggestion_type: s.suggestion_type as 'alias_candidate' | 'dictionary_candidate' | 'new_rule_candidate',
        extracted_phrase: s.extracted_phrase,
        evidence_terms: s.evidence_terms || [],
        evidence_cost: s.evidence_cost || 0,
        evidence_clicks: s.evidence_clicks || 0,
        proposed_dict_name: s.proposed_dict_name || undefined,
        proposed_canonical: s.proposed_canonical || undefined,
        proposed_alias: s.proposed_alias || undefined,
        status: s.status as 'pending' | 'accepted' | 'rejected',
        accept_as: s.accept_as as 'competitors' | 'brand_terms' | 'custom_rules' | null,
        chosen_canonical: s.chosen_canonical,
        chosen_alias: s.chosen_alias,
        chosen_cluster_primary: s.chosen_cluster_primary,
        chosen_rule_pattern: s.chosen_rule_pattern,
      }));
    },
    enabled: !!runId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Save suggestions to database
  const saveSuggestions = useMutation({
    mutationFn: async ({ runId, suggestions }: { runId: string; suggestions: LeakageSuggestion[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const rows = suggestions.map(s => ({
        run_id: runId,
        suggestion_type: s.suggestion_type,
        extracted_phrase: s.extracted_phrase,
        evidence_terms: s.evidence_terms,
        evidence_cost: s.evidence_cost,
        evidence_clicks: s.evidence_clicks,
        proposed_dict_name: s.proposed_dict_name || null,
        proposed_canonical: s.proposed_canonical || null,
        proposed_alias: s.proposed_alias || null,
        status: 'pending',
        created_by: user?.id,
      }));

      const { error } = await supabase
        .from('keyword_leakage_suggestions')
        .insert(rows);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyword-leakage-suggestions'] });
    },
  });

  // Accept a suggestion
  const acceptSuggestion = useMutation({
    mutationFn: async ({ 
      id, 
      accept_as, 
      chosen_canonical, 
      chosen_alias, 
      chosen_cluster_primary, 
      chosen_rule_pattern 
    }: {
      id: string;
      accept_as: 'competitors' | 'brand_terms' | 'custom_rules';
      chosen_canonical?: string;
      chosen_alias?: string;
      chosen_cluster_primary?: string;
      chosen_rule_pattern?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update suggestion status
      const { error: updateError } = await supabase
        .from('keyword_leakage_suggestions')
        .update({
          status: 'accepted',
          accept_as,
          chosen_canonical,
          chosen_alias,
          chosen_cluster_primary,
          chosen_rule_pattern,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Insert into appropriate table based on accept_as
      if (accept_as === 'competitors' || accept_as === 'brand_terms') {
        if (chosen_canonical && chosen_alias) {
          // Insert dictionary entry
          const { error: dictError } = await supabase
            .from('keyword_dictionaries')
            .upsert({
              dict_name: accept_as,
              canonical: chosen_canonical,
              alias: chosen_alias,
              enabled: true,
              created_by: user?.id,
            }, {
              onConflict: 'dict_name,canonical,alias',
            });

          if (dictError) throw dictError;

          // Also add punctuation-stripped version if contains '.'
          if (chosen_alias.includes('.')) {
            const strippedAlias = chosen_alias.replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
            if (strippedAlias !== chosen_alias) {
              await supabase
                .from('keyword_dictionaries')
                .upsert({
                  dict_name: accept_as,
                  canonical: chosen_canonical,
                  alias: strippedAlias,
                  enabled: true,
                  created_by: user?.id,
                }, {
                  onConflict: 'dict_name,canonical,alias',
                });
            }
          }
        }
      } else if (accept_as === 'custom_rules') {
        if (chosen_cluster_primary && chosen_rule_pattern) {
          const { error: ruleError } = await supabase
            .from('keyword_custom_rules')
            .insert({
              rule_name: `Rule for: ${chosen_rule_pattern.substring(0, 30)}`,
              pattern: chosen_rule_pattern,
              match_type: 'contains_phrase',
              target_cluster_primary: chosen_cluster_primary,
              enabled: true,
              created_by: user?.id,
            });

          if (ruleError) throw ruleError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyword-leakage-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['keyword-dictionaries'] });
      queryClient.invalidateQueries({ queryKey: ['keyword-custom-rules'] });
      toast({ title: 'Suggestion accepted and applied' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error accepting suggestion', description: error.message, variant: 'destructive' });
    },
  });

  // Reject a suggestion
  const rejectSuggestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('keyword_leakage_suggestions')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyword-leakage-suggestions'] });
      toast({ title: 'Suggestion rejected' });
    },
  });

  return {
    suggestions,
    isLoading,
    refetch,
    saveSuggestions,
    acceptSuggestion,
    rejectSuggestion,
  };
}
