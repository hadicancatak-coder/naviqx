import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Upload, Grid3x3, List, Download } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAdElements } from '@/hooks/useAdElements';
import { ElementCard } from './ElementCard';
import { CreateElementDialog } from './CreateElementDialog';
import { BulkImportDialog } from './BulkImportDialog';
import { AdvancedFilters } from './AdvancedFilters';
import { SavedElementsTableView } from './SavedElementsTableView';
import { SavedAdsTableView } from './SavedAdsTableView';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { ENTITIES } from '@/lib/constants';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function SavedElementsLibrary() {
  const [activeTab, setActiveTab] = useState<'headline' | 'description' | 'sitelink' | 'callout'>('headline');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  const debouncedSearch = useDebouncedValue(search, 500);
  
  const { data: elements, isLoading } = useAdElements({
    elementType: activeTab,
    search: debouncedSearch,
    entity: entityFilter === 'all' ? undefined : entityFilter,
    language: languageFilter,
    platform: platformFilter,
    ...filters,
  });

  const exportToCSV = () => {
    if (!elements || elements.length === 0) return;
    
    const headers = ['Type', 'Content', 'Entity', 'Language', 'Platform', 'Status', 'Uses', 'Created'];
    const rows = elements.map(el => [
      activeTab,
      el.content?.text || el.content,
      el.entity?.join('; ') || '',
      el.language || 'EN',
      el.platform || 'ppc',
      el.google_status || 'pending',
      el.use_count || 0,
      format(new Date(el.created_at), 'yyyy-MM-dd')
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saved-${activeTab}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-md">
      <div className="flex items-center justify-between">
        <h2 className="text-heading-lg font-semibold">Saved Elements Library</h2>
        <div className="flex gap-xs">
          <ToggleGroup type="single" value={viewMode} onValueChange={(v: any) => v && setViewMode(v)}>
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <Grid3x3 className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Table view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setShowBulkImport(true)} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Element
          </Button>
        </div>
      </div>

      <div className="flex gap-xs flex-wrap">
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {ENTITIES.map((ent) => (
              <SelectItem key={ent} value={ent}>{ent}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={languageFilter} onValueChange={setLanguageFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            <SelectItem value="EN">English</SelectItem>
            <SelectItem value="AR">Arabic</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="ppc">PPC</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="snap">Snap</SelectItem>
            <SelectItem value="reddit">Reddit</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search elements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <AdvancedFilters onFiltersChange={setFilters} />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="headline">Headlines</TabsTrigger>
          <TabsTrigger value="description">Descriptions</TabsTrigger>
          <TabsTrigger value="sitelink">Sitelinks</TabsTrigger>
          <TabsTrigger value="callout">Callouts</TabsTrigger>
        </TabsList>

        {['headline', 'description', 'sitelink', 'callout'].map((type) => (
          <TabsContent key={type} value={type} className="space-y-md mt-md">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : elements && elements.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="grid gap-md md:grid-cols-2 lg:grid-cols-3">
                  {elements.map((element) => (
                    <ElementCard key={element.id} element={element} />
                  ))}
                </div>
              ) : (
                <SavedElementsTableView elements={elements} />
              )
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground mb-md">No {type}s saved yet</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First {type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <CreateElementDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        elementType={activeTab}
      />
      
      <BulkImportDialog 
        open={showBulkImport} 
        onOpenChange={setShowBulkImport}
        elementType={activeTab}
      />
    </div>
  );
}
