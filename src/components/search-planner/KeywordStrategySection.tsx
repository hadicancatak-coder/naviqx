import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, X, Save } from 'lucide-react';

const MAX_KEYWORDS = 20;

const MATCH_TYPE_LABELS: Record<string, { notation: (kw: string) => string; color: string }> = {
  exact: { notation: (kw) => `[${kw}]`, color: 'bg-primary/10 text-primary border-primary/30' },
  phrase: { notation: (kw) => `"${kw}"`, color: 'bg-warning/10 text-warning-text border-warning/30' },
  broad: { notation: (kw) => kw, color: 'bg-muted text-muted-foreground border-border' },
};

interface KeywordStrategySectionProps {
  adGroupId: string;
  matchTypes: string[];
}

export function KeywordStrategySection({ adGroupId, matchTypes }: KeywordStrategySectionProps) {
  const [keywords, setKeywords] = useState<string[]>(['']);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load keywords from ad_groups.keywords
  useEffect(() => {
    const loadKeywords = async () => {
      const { data, error } = await supabase
        .from('ad_groups')
        .select('keywords')
        .eq('id', adGroupId)
        .single();

      if (!error && data?.keywords && Array.isArray(data.keywords)) {
        const loaded = data.keywords as string[];
        setKeywords(loaded.length > 0 ? loaded : ['']);
      }
    };
    loadKeywords();
  }, [adGroupId]);

  const updateKeyword = useCallback((index: number, value: string) => {
    setKeywords(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
    setHasChanges(true);
  }, []);

  const addKeyword = useCallback(() => {
    if (keywords.length < MAX_KEYWORDS) {
      setKeywords(prev => [...prev, '']);
      setHasChanges(true);
    }
  }, [keywords.length]);

  const removeKeyword = useCallback((index: number) => {
    setKeywords(prev => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.length === 0 ? [''] : updated;
    });
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const validKeywords = keywords.filter(k => k.trim());
      const { error } = await supabase
        .from('ad_groups')
        .update({ keywords: validKeywords })
        .eq('id', adGroupId);

      if (error) throw error;
      toast.success('Keywords saved');
      setHasChanges(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to save keywords');
    } finally {
      setIsSaving(false);
    }
  };

  const validCount = keywords.filter(k => k.trim()).length;
  const validMatchTypes = matchTypes.length > 0 ? matchTypes : ['broad'];

  return (
    <div className="space-y-sm">
      <div className="flex items-center justify-between">
        <Label className="text-body-sm font-semibold">Keywords</Label>
        <div className="flex items-center gap-xs">
          <span className="text-metadata text-muted-foreground">
            {validCount}/{MAX_KEYWORDS}
          </span>
          {hasChanges && (
            <Button size="sm" variant="ghost" onClick={handleSave} disabled={isSaving} className="h-7 px-2">
              <Save className="h-3.5 w-3.5 mr-1" />
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Match type badges */}
      <div className="flex gap-xs flex-wrap">
        {validMatchTypes.map(type => (
          <Badge key={type} variant="outline" className={`text-metadata ${MATCH_TYPE_LABELS[type]?.color || ''}`}>
            {type === 'exact' ? 'Exact [keyword]' : type === 'phrase' ? 'Phrase "keyword"' : 'Broad keyword'}
          </Badge>
        ))}
      </div>

      {/* Keyword inputs */}
      <div className="space-y-xs">
        {keywords.map((keyword, index) => (
          <div key={index} className="flex items-center gap-xs">
            <div className="flex-1 relative">
              <Input
                placeholder={`Keyword ${index + 1}`}
                value={keyword}
                onChange={(e) => updateKeyword(index, e.target.value)}
                className="pr-20"
              />
              {keyword.trim() && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2 flex gap-0.5">
                  {validMatchTypes.map(type => (
                    <span key={type} className="text-metadata text-muted-foreground">
                      {type === 'exact' ? `[${keyword.trim().substring(0, 8)}...]` : type === 'phrase' ? `"${keyword.trim().substring(0, 8)}..."` : ''}
                    </span>
                  )).filter(Boolean).slice(0, 1)}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => removeKeyword(index)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {keywords.length < MAX_KEYWORDS && (
        <Button variant="ghost" size="sm" onClick={addKeyword} className="text-muted-foreground">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Keyword
        </Button>
      )}
    </div>
  );
}
