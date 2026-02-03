import { UtmLinkFilters } from "@/hooks/useUtmLinks";
import { useUtmCampaigns } from "@/hooks/useUtmCampaigns";
import { useUtmPlatforms } from "@/hooks/useUtmPlatforms";
import { useSystemEntities } from "@/hooks/useSystemEntities";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const LP_TYPES = [
  { value: "static", label: "Static" },
  { value: "dynamic", label: "Dynamic" },
];

interface UtmInlineFiltersProps {
  filters: UtmLinkFilters;
  onFiltersChange: (filters: UtmLinkFilters) => void;
}

export const UtmInlineFilters = ({ filters, onFiltersChange }: UtmInlineFiltersProps) => {
  const { data: campaigns = [] } = useUtmCampaigns();
  const { data: platforms = [] } = useUtmPlatforms();
  const { data: entities = [] } = useSystemEntities();

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true));

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex flex-wrap items-center gap-sm p-sm bg-muted/30 rounded-lg border">
      <span className="text-body-sm font-medium text-muted-foreground">Filters:</span>
      
      {/* Campaign */}
      <Select
        value={Array.isArray(filters.campaign_name) ? filters.campaign_name[0] : (filters.campaign_name || "all")}
        onValueChange={(value) => onFiltersChange({ ...filters, campaign_name: value === "all" ? undefined : [value] })}
      >
        <SelectTrigger className="h-8 w-[140px] bg-background">
          <SelectValue placeholder="Campaign" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Campaigns</SelectItem>
          {campaigns.map((campaign) => (
            <SelectItem key={campaign.id} value={campaign.name}>
              {campaign.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Platform */}
      <Select
        value={Array.isArray(filters.platform) ? filters.platform[0] : (filters.platform || "all")}
        onValueChange={(value) => onFiltersChange({ ...filters, platform: value === "all" ? undefined : [value] })}
      >
        <SelectTrigger className="h-8 w-[140px] bg-background">
          <SelectValue placeholder="Platform" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Platforms</SelectItem>
          {platforms.map((platform) => (
            <SelectItem key={platform.id} value={platform.name}>
              {platform.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Entity */}
      <Select
        value={filters.entity?.[0] || "all"}
        onValueChange={(value) => onFiltersChange({ ...filters, entity: value === "all" ? undefined : [value] })}
      >
        <SelectTrigger className="h-8 w-[140px] bg-background">
          <SelectValue placeholder="Entity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Entities</SelectItem>
          {entities.map((entity) => (
            <SelectItem key={entity.name} value={entity.name}>
              {entity.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* LP Type */}
      <Select
        value={filters.lp_type || "all"}
        onValueChange={(value) => onFiltersChange({ ...filters, lp_type: value === "all" ? undefined : value })}
      >
        <SelectTrigger className="h-8 w-[140px] bg-background">
          <SelectValue placeholder="LP Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All LP Types</SelectItem>
          {LP_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear All */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="h-8 gap-1"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
};
