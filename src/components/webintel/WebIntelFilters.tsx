import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export interface WebIntelFiltersState {
  search: string;
  countries: string[];
  types: string[];
  categories: string[];
  tags: string[];
  entities: string[];
}

interface WebIntelFiltersProps {
  filters: WebIntelFiltersState;
  onFiltersChange: (filters: WebIntelFiltersState) => void;
  availableCountries: string[];
  availableCategories: string[];
  availableTags: string[];
  availableEntities: string[];
}

const SITE_TYPES = ['Website', 'App', 'Portal', 'Forum'];

export function WebIntelFilters({
  filters,
  onFiltersChange,
  availableCountries,
  availableCategories,
  availableTags,
  availableEntities,
}: WebIntelFiltersProps) {
  const hasActiveFilters = 
    filters.search || 
    filters.countries.length > 0 || 
    filters.types.length > 0 || 
    filters.categories.length > 0 || 
    filters.tags.length > 0 ||
    filters.entities.length > 0;

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      countries: [],
      types: [],
      categories: [],
      tags: [],
      entities: [],
    });
  };

  return (
    <div className="space-y-md">
      <div className="flex items-center gap-md flex-wrap">
        <Input
          placeholder="Search sites, URLs, or publishers..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="max-w-sm"
        />

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>

      <div className="flex items-center gap-sm flex-wrap">
        {/* Country Filter */}
        <Select
          value={undefined}
          onValueChange={(value) => {
            if (!filters.countries.includes(value)) {
              onFiltersChange({ ...filters, countries: [...filters.countries, value] });
            }
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Country" />
          </SelectTrigger>
          <SelectContent>
            {availableCountries
              .filter(c => !filters.countries.includes(c))
              .map(country => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select
          value={undefined}
          onValueChange={(value) => {
            if (!filters.types.includes(value)) {
              onFiltersChange({ ...filters, types: [...filters.types, value] });
            }
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Type" />
          </SelectTrigger>
          <SelectContent>
            {SITE_TYPES
              .filter(t => !filters.types.includes(t))
              .map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select
          value={undefined}
          onValueChange={(value) => {
            if (!filters.categories.includes(value)) {
              onFiltersChange({ ...filters, categories: [...filters.categories, value] });
            }
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Category" />
          </SelectTrigger>
          <SelectContent>
            {availableCategories
              .filter(c => !filters.categories.includes(c))
              .map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* Tags Filter */}
        <Select
          value={undefined}
          onValueChange={(value) => {
            if (!filters.tags.includes(value)) {
              onFiltersChange({ ...filters, tags: [...filters.tags, value] });
            }
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Tags" />
          </SelectTrigger>
          <SelectContent>
            {availableTags
              .filter(t => !filters.tags.includes(t))
              .map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* Entity Filter */}
        <Select
          value={undefined}
          onValueChange={(value) => {
            if (!filters.entities.includes(value)) {
              onFiltersChange({ ...filters, entities: [...filters.entities, value] });
            }
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Entity" />
          </SelectTrigger>
          <SelectContent>
            {availableEntities
              .filter(e => !filters.entities.includes(e))
              .map(entity => (
                <SelectItem key={entity} value={entity}>{entity}</SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      
      {hasActiveFilters && (
        <div className="flex gap-sm flex-wrap">
          {filters.countries.map(c => (
            <Badge key={c} variant="secondary">
              {c}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onFiltersChange({ ...filters, countries: filters.countries.filter(x => x !== c) })}
              />
            </Badge>
          ))}
          {filters.types.map(t => (
            <Badge key={t} variant="secondary">
              {t}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onFiltersChange({ ...filters, types: filters.types.filter(x => x !== t) })}
              />
            </Badge>
          ))}
          {filters.categories.map(c => (
            <Badge key={c} variant="secondary">
              {c}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onFiltersChange({ ...filters, categories: filters.categories.filter(x => x !== c) })}
              />
            </Badge>
          ))}
          {filters.tags.map(t => (
            <Badge key={t} variant="secondary">
              {t}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onFiltersChange({ ...filters, tags: filters.tags.filter(x => x !== t) })}
              />
            </Badge>
          ))}
          {filters.entities.map(e => (
            <Badge key={e} variant="secondary">
              {e}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer" 
                onClick={() => onFiltersChange({ ...filters, entities: filters.entities.filter(x => x !== e) })}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
