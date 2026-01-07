import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FolderOpen, Layers } from 'lucide-react';

interface CampaignGroupingFiltersProps {
  campaignName: string;
  onCampaignNameChange: (value: string) => void;
  adGroupName: string;
  onAdGroupNameChange: (value: string) => void;
  campaigns: string[];
  adGroups: string[];
}

export function CampaignGroupingFilters({
  campaignName,
  onCampaignNameChange,
  adGroupName,
  onAdGroupNameChange,
  campaigns,
  adGroups,
}: CampaignGroupingFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
      <div className="space-y-xs">
        <Label htmlFor="campaign-filter" className="flex items-center gap-xs">
          <FolderOpen className="h-4 w-4" />
          Campaign
        </Label>
        <Select value={campaignName} onValueChange={onCampaignNameChange}>
          <SelectTrigger>
            <SelectValue placeholder="All campaigns" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All campaigns</SelectItem>
            {campaigns.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-xs">
        <Label htmlFor="ad-group-filter" className="flex items-center gap-xs">
          <Layers className="h-4 w-4" />
          Ad Group
        </Label>
        <Select value={adGroupName} onValueChange={onAdGroupNameChange}>
          <SelectTrigger>
            <SelectValue placeholder="All ad groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ad groups</SelectItem>
            {adGroups.map(ag => (
              <SelectItem key={ag} value={ag}>{ag}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
