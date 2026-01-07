import { useState } from "react";
import { ChevronDown, ChevronUp, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SimpleMultiSelect } from "@/components/utm/SimpleMultiSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LocationFilters {
  cities: string[];
  agencies: string[];
  categories: string[];
  campaignId?: string;
}

interface FloatingFilterBoxProps {
  filters: LocationFilters;
  onFiltersChange: (filters: LocationFilters) => void;
  availableCities: string[];
  availableAgencies: string[];
  campaigns: Array<{ id: string; name: string }>;
}

export function FloatingFilterBox({
  filters,
  onFiltersChange,
  availableCities,
  availableAgencies,
  campaigns,
}: FloatingFilterBoxProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleClearFilters = () => {
    onFiltersChange({
      cities: [],
      agencies: [],
      categories: [],
      campaignId: undefined,
    });
  };

  const activeFilterCount =
    filters.cities.length +
    filters.agencies.length +
    filters.categories.length +
    (filters.campaignId ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  const categoryOptions = [
    { value: "billboards", label: "🪧 Billboards" },
    { value: "transit", label: "🚌 Transit" },
    { value: "street", label: "🚶 Street Furniture" },
    { value: "digital", label: "📱 Digital Screens" },
  ];

  return (
    <div className="relative w-80 max-w-[calc(100vw-2rem)]">
      <div className="relative rounded-xl border border-border/30 bg-background/75 backdrop-blur-lg shadow-2xl overflow-hidden">
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background/40 to-accent/8 pointer-events-none" />
        
        {/* Header */}
        <div className="relative p-3 flex items-center justify-between border-b border-border/30 bg-background/20">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">Filters</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="h-5 px-1.5 text-metadata">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp />
            ) : (
              <ChevronDown />
            )}
          </Button>
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="relative">
            <ScrollArea className="max-h-[calc(100vh-200px)]">
              <div className="p-md space-y-md bg-gradient-to-b from-transparent via-background/10 to-transparent">
                {/* Cities Filter */}
                <div className="space-y-2">
                  <label className="text-body-sm font-medium text-foreground">Cities</label>
                  <SimpleMultiSelect
                    options={availableCities.map((city) => ({
                      value: city,
                      label: city,
                    }))}
                    selected={filters.cities}
                    onChange={(cities) =>
                      onFiltersChange({ ...filters, cities })
                    }
                    placeholder="Select cities..."
                  />
                </div>

                {/* Agencies Filter */}
                <div className="space-y-2">
                  <label className="text-body-sm font-medium text-foreground">Agencies</label>
                  <SimpleMultiSelect
                    options={availableAgencies.map((agency) => ({
                      value: agency,
                      label: agency,
                    }))}
                    selected={filters.agencies}
                    onChange={(agencies) =>
                      onFiltersChange({ ...filters, agencies })
                    }
                    placeholder="Select agencies..."
                  />
                </div>

                {/* Categories Filter */}
                <div className="space-y-2">
                  <label className="text-body-sm font-medium text-foreground">Categories</label>
                  <SimpleMultiSelect
                    options={categoryOptions}
                    selected={filters.categories}
                    onChange={(categories) =>
                      onFiltersChange({ ...filters, categories })
                    }
                    placeholder="Select categories..."
                  />
                </div>

                {/* Campaign Filter */}
                <div className="space-y-2">
                  <label className="text-body-sm font-medium text-foreground">Campaign</label>
                  <Select
                    value={filters.campaignId || "all"}
                    onValueChange={(value) =>
                      onFiltersChange({
                        ...filters,
                        campaignId: value === "all" ? undefined : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All campaigns" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All campaigns</SelectItem>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Active Filters */}
                {hasActiveFilters && (
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-metadata font-medium text-muted-foreground">
                        Active Filters
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                        className="h-6 px-2 text-metadata"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear All
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {filters.cities.map((city) => (
                        <Badge
                          key={city}
                          variant="secondary"
                          className="text-metadata px-2 py-0.5"
                        >
                          {city}
                          <X
                            className="h-3 w-3 ml-1 cursor-pointer"
                            onClick={() =>
                              onFiltersChange({
                                ...filters,
                                cities: filters.cities.filter((c) => c !== city),
                              })
                            }
                          />
                        </Badge>
                      ))}
                      {filters.agencies.map((agency) => (
                        <Badge
                          key={agency}
                          variant="secondary"
                          className="text-metadata px-2 py-0.5"
                        >
                          {agency}
                          <X
                            className="h-3 w-3 ml-1 cursor-pointer"
                            onClick={() =>
                              onFiltersChange({
                                ...filters,
                                agencies: filters.agencies.filter(
                                  (a) => a !== agency
                                ),
                              })
                            }
                          />
                        </Badge>
                      ))}
                      {filters.categories.map((category) => {
                        const categoryOption = categoryOptions.find(
                          (opt) => opt.value === category
                        );
                        return (
                          <Badge
                            key={category}
                            variant="secondary"
                            className="text-metadata px-2 py-0.5"
                          >
                            {categoryOption?.label || category}
                            <X
                              className="h-3 w-3 ml-1 cursor-pointer"
                              onClick={() =>
                                onFiltersChange({
                                  ...filters,
                                  categories: filters.categories.filter(
                                    (c) => c !== category
                                  ),
                                })
                              }
                            />
                          </Badge>
                        );
                      })}
                      {filters.campaignId && (
                        <Badge
                          variant="secondary"
                          className="text-metadata px-2 py-0.5"
                        >
                          {campaigns.find((c) => c.id === filters.campaignId)
                            ?.name || "Campaign"}
                          <X
                            className="h-3 w-3 ml-1 cursor-pointer"
                            onClick={() =>
                              onFiltersChange({
                                ...filters,
                                campaignId: undefined,
                              })
                            }
                          />
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
