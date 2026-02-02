import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUtmCampaigns } from '@/hooks/useUtmCampaigns';
import { ExternalLink, Search, SortAsc, SortDesc, Info } from 'lucide-react';
import type { UtmCampaign } from '@/hooks/useUtmCampaigns';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function CampaignLibrary() {
  const navigate = useNavigate();
  const { data: campaigns = [], isLoading } = useUtmCampaigns();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'usage' | 'lastUsed' | 'updated'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleManageClick = () => {
    navigate('/campaigns-log');
    toast.info('Redirected to Campaign Log for editing');
  };

  // Filter campaigns by search query
  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.landing_page?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort campaigns
  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'usage':
        comparison = (a.usage_count || 0) - (b.usage_count || 0);
        break;
      case 'lastUsed': {
        const aTime = a.last_used_at ? new Date(a.last_used_at).getTime() : 0;
        const bTime = b.last_used_at ? new Date(b.last_used_at).getTime() : 0;
        comparison = aTime - bTime;
        break;
      }
      case 'updated': {
        const aUpdated = new Date(a.created_at).getTime();
        const bUpdated = new Date(b.created_at).getTime();
        comparison = aUpdated - bUpdated;
        break;
      }
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-lg text-center text-muted-foreground">
          Loading campaigns...
        </CardContent>
      </Card>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="py-lg text-center text-muted-foreground">
          No campaigns yet. Add a campaign from the Builder tab.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-md">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This is a read-only view. To edit or delete campaigns, please go to{" "}
          {/* eslint-disable-next-line no-restricted-syntax -- legitimate reset for inline link button */}
          <Button variant="link" className="p-0 h-auto font-medium" onClick={handleManageClick}>
            Campaign Log
          </Button>
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="p-md space-y-md">
          {/* Search & Sort Bar */}
          <div className="flex flex-col sm:flex-row gap-sm">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns or landing pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Sort Options */}
            <div className="flex gap-sm">
              <Select value={sortBy} onValueChange={(value: 'name' | 'usage' | 'lastUsed' | 'updated') => setSortBy(value)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Last Edited</SelectItem>
                  <SelectItem value="lastUsed">Last Used</SelectItem>
                  <SelectItem value="usage">Usage Count</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {/* Results Count */}
          <div className="text-body-sm text-muted-foreground">
            Showing {sortedCampaigns.length} of {campaigns.length} campaigns
          </div>
        </CardContent>
        
        {/* eslint-disable-next-line no-restricted-syntax -- legitimate reset for flush table */}
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign Name</TableHead>
                <TableHead>Landing Page</TableHead>
                <TableHead className="text-center">Usage</TableHead>
                <TableHead>Last Edited</TableHead>
                <TableHead>Last Used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>
                    {campaign.landing_page ? (
                      <a
                        href={campaign.landing_page}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-body-sm text-primary hover:underline flex items-center gap-xs"
                      >
                        <span className="max-w-xs truncate">{campaign.landing_page}</span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-body-sm">Not set</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{campaign.usage_count || 0}</Badge>
                  </TableCell>
                  <TableCell className="text-body-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-body-sm text-muted-foreground">
                    {campaign.last_used_at
                      ? formatDistanceToNow(new Date(campaign.last_used_at), { addSuffix: true })
                      : 'Never'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
