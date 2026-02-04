import { useState, useMemo } from "react";
import { Search, LayoutGrid, List, ArrowUpDown, MessageSquare, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalCampaignGrid } from "@/components/campaigns/ExternalCampaignGrid";
import { ExternalCampaignDetailPanel } from "@/components/campaigns/ExternalCampaignDetailPanel";
import { ExternalCommentForm } from "./ExternalCommentForm";
import { PublicAccessLink, PublicAccessComment } from "@/hooks/usePublicAccess";
import { format } from "date-fns";

interface CampaignData {
  id: string;
  name: string;
  lp_type?: string;
  campaign_type?: string;
  landing_page?: string;
  description?: string | null;
}

interface VersionData {
  id: string;
  utm_campaign_id: string;
  version_number: number;
  version_notes: string | null;
  image_url: string | null;
  asset_link: string | null;
  created_at: string;
}

interface ExternalReviewActions {
  submitComment: (params: {
    commentText: string;
    commentType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
  }) => void;
  isSubmitting: boolean;
}

interface CampaignReviewContentProps {
  accessData: PublicAccessLink;
  comments: PublicAccessComment[];
  actions: ExternalReviewActions;
  canComment: boolean;
  reviewerName: string;
  campaigns: CampaignData[];
  versions: VersionData[];
  onRequestIdentify?: () => void;
}

type ViewMode = "grid" | "list";
type SortMode = "latest" | "name" | "versions";

export function CampaignReviewContent({
  accessData,
  comments,
  actions,
  canComment,
  reviewerName,
  campaigns,
  versions,
  onRequestIdentify,
}: CampaignReviewContentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});
  const [localSubmitting, setLocalSubmitting] = useState<{ [key: string]: boolean }>({});

  // Transform unified comments to legacy format for existing components
  const legacyComments = useMemo(() => {
    return comments.map(c => ({
      id: c.id,
      campaign_id: (c.metadata?.campaign_id as string) || null,
      version_id: c.resource_id || null,
      entity: accessData.entity || "",
      reviewer_name: c.reviewer_name,
      reviewer_email: c.reviewer_email,
      comment_text: c.comment_text,
      comment_type: c.comment_type,
      created_at: c.created_at,
    }));
  }, [comments, accessData.entity]);

  // Get entity-level comments
  const entityComments = useMemo(() => {
    return legacyComments.filter(c => 
      c.comment_type === "entity_feedback" || 
      (c.campaign_id === null && c.version_id === null)
    );
  }, [legacyComments]);

  // Sort and filter campaigns
  const sortedCampaigns = useMemo(() => {
    let filtered = campaigns;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name?.toLowerCase().includes(query) ||
        c.lp_type?.toLowerCase().includes(query) ||
        c.campaign_type?.toLowerCase().includes(query)
      );
    }

    // Apply sort
    return [...filtered].sort((a, b) => {
      switch (sortMode) {
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "versions": {
          const aVersions = versions.filter(v => v.utm_campaign_id === a.id).length;
          const bVersions = versions.filter(v => v.utm_campaign_id === b.id).length;
          return bVersions - aVersions;
        }
        case "latest":
        default: {
          const aLatest = versions.find(v => v.utm_campaign_id === a.id)?.created_at || "";
          const bLatest = versions.find(v => v.utm_campaign_id === b.id)?.created_at || "";
          return bLatest.localeCompare(aLatest);
        }
      }
    });
  }, [campaigns, versions, searchQuery, sortMode]);

  // Get selected campaign data
  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);
  const selectedVersions = versions
    .filter(v => v.utm_campaign_id === selectedCampaignId)
    .sort((a, b) => b.version_number - a.version_number);
  const selectedComments = legacyComments.filter(c =>
    selectedVersions.some(v => v.id === c.version_id)
  );

  // Handle version comment submission
  const handleVersionCommentSubmit = async (versionId: string, campaignId: string, text: string) => {
    if (!text?.trim()) return;

    setLocalSubmitting(prev => ({ ...prev, [versionId]: true }));
    
    try {
      actions.submitComment({
        commentText: text,
        commentType: "version_feedback",
        resourceId: versionId,
        metadata: { campaign_id: campaignId },
      });
      
      setCommentInputs(prev => ({ ...prev, [versionId]: "" }));
    } finally {
      setLocalSubmitting(prev => ({ ...prev, [versionId]: false }));
    }
  };

  const handleCommentChange = (versionId: string, value: string) => {
    setCommentInputs(prev => ({ ...prev, [versionId]: value }));
  };

  return (
    <div className="space-y-lg">
      {/* Stats Header */}
      <div className="flex items-center gap-md flex-wrap">
        <Badge variant="secondary" className="text-body-sm">
          {sortedCampaigns.length} campaigns
        </Badge>
        <Badge variant="outline" className="text-body-sm">
          {versions.length} versions
        </Badge>
        <Badge variant="outline" className="text-body-sm">
          <MessageSquare className="h-3 w-3 mr-1" />
          {comments.length} comments
        </Badge>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-md flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns..."
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-sm">
          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger className="w-[140px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest First</SelectItem>
              <SelectItem value="name">By Name</SelectItem>
              <SelectItem value="versions">By Versions</SelectItem>
            </SelectContent>
          </Select>

          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as ViewMode)}
          >
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Entity-Level Feedback */}
      {canComment && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-md">
            <div className="space-y-sm">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="text-body-sm font-medium">
                  Overall Feedback for {accessData.entity}
                </span>
              </div>
              <ExternalCommentForm
                onSubmit={actions.submitComment}
                isSubmitting={actions.isSubmitting}
                canComment={canComment}
                reviewerName={reviewerName}
                placeholder="Share overall feedback about these campaigns..."
                commentType="entity_feedback"
                onRequestIdentify={onRequestIdentify}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Entity Comments */}
      {entityComments.length > 0 && (
        <Card>
          <CardContent className="pt-md">
            <div className="flex items-center gap-2 mb-sm">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-body-sm font-medium">
                Entity Feedback ({entityComments.length})
              </span>
            </div>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-sm">
                {entityComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex gap-sm p-sm rounded-lg bg-muted/30 border border-border"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-metadata bg-primary/10">
                        {comment.reviewer_name?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-sm flex-wrap">
                        <span className="font-medium text-body-sm">
                          {comment.reviewer_name}
                        </span>
                        <span className="text-metadata text-muted-foreground">
                          {format(new Date(comment.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-body-sm text-foreground mt-0.5">
                        {comment.comment_text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Campaign Grid/List */}
      {sortedCampaigns.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-body text-muted-foreground">
            {searchQuery ? "No campaigns match your search." : "No campaigns available for review."}
          </p>
        </div>
      ) : (
        <>
          {viewMode === "grid" ? (
            <ExternalCampaignGrid
              campaigns={sortedCampaigns}
              versions={versions}
              comments={legacyComments}
              selectedCampaignId={selectedCampaignId}
              onSelectCampaign={setSelectedCampaignId}
            />
          ) : (
            // List view - simplified table
            <div className="space-y-2">
              {sortedCampaigns.map((campaign) => {
                const campaignVersions = versions.filter(v => v.utm_campaign_id === campaign.id);
                const campaignComments = legacyComments.filter(c =>
                  campaignVersions.some(v => v.id === c.version_id)
                );
                const isSelected = selectedCampaignId === campaign.id;

                return (
                  <div
                    key={campaign.id}
                    onClick={() => setSelectedCampaignId(isSelected ? null : campaign.id)}
                    className={`p-md rounded-lg border cursor-pointer transition-smooth ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground hover:bg-card-hover"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-md">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-body font-medium truncate">{campaign.name}</h3>
                        <p className="text-metadata text-muted-foreground">
                          {campaign.lp_type || campaign.campaign_type || "Campaign"}
                        </p>
                      </div>
                      <div className="flex items-center gap-sm">
                        <Badge variant="secondary">{campaignVersions.length} versions</Badge>
                        {campaignComments.length > 0 && (
                          <Badge variant="outline">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            {campaignComments.length}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Selected Campaign Detail Panel */}
      {selectedCampaign && (
        <ExternalCampaignDetailPanel
          campaign={selectedCampaign}
          versions={selectedVersions}
          comments={selectedComments}
          onClose={() => setSelectedCampaignId(null)}
          onSubmitFeedback={handleVersionCommentSubmit}
          submitting={localSubmitting}
          commentInputs={commentInputs}
          onCommentChange={handleCommentChange}
        />
      )}
    </div>
  );
}
