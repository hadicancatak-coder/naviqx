import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Eye, MessageSquare, Loader2, ExternalLink, LayoutGrid, List, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useExternalAccess } from "@/hooks/useExternalAccess";
import { useReviewerSession } from "@/hooks/useReviewerSession";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GlassBackground } from "@/components/layout/GlassBackground";
import { logger } from "@/lib/logger";
import { ExternalPageFooter } from "@/components/layout/ExternalPageFooter";
import { FilterBar, FilterPill } from "@/components/layout/FilterBar";
import { ExternalCampaignGrid } from "@/components/campaigns/ExternalCampaignGrid";
import { ExternalCampaignDetailPanel } from "@/components/campaigns/ExternalCampaignDetailPanel";
import { ExternalVersionGallery } from "@/components/campaigns/ExternalVersionGallery";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ExternalComment {
  id: string;
  campaign_id: string | null;
  version_id: string | null;
  entity: string;
  reviewer_name: string;
  reviewer_email: string;
  comment_text: string;
  comment_type: string | null;
  created_at: string;
}

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

interface AccessData {
  entity: string;
  campaign_id?: string;
  email_verified?: boolean;
  reviewer_name?: string;
  reviewer_email?: string;
}

type ViewMode = "grid" | "list";
type SortMode = "latest" | "name" | "versions";

export default function CampaignReview() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { verifyToken, verifyEmail } = useExternalAccess();
  
  // Use the reviewer session hook for IP-based persistence
  const { 
    session: storedSession, 
    loading: sessionLoading, 
    saveSession, 
    hasSession 
  } = useReviewerSession('campaign_review', token);
  
  const [accessData, setAccessData] = useState<AccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  
  // Name and email state - will be populated from session
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isIdentified, setIsIdentified] = useState(false);
  
  const [campaignData, setCampaignData] = useState<CampaignData[]>([]);
  const [versions, setVersions] = useState<VersionData[]>([]);
  const [comments, setComments] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState<{ [key: string]: boolean }>({});
  const [entityComment, setEntityComment] = useState("");
  const [submittingEntityComment, setSubmittingEntityComment] = useState(false);
  
  // Existing comments state
  const [existingComments, setExistingComments] = useState<ExternalComment[]>([]);

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const hasSetInitialValues = useRef(false);
  
  // Auto-populate from stored session
  useEffect(() => {
    if (storedSession && !hasSetInitialValues.current) {
      setName(storedSession.name);
      setEmail(storedSession.email);
      setIsIdentified(true);
      hasSetInitialValues.current = true;
    }
  }, [storedSession]);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const result = await verifyToken(token);
        setAccessData(result);
        
        // Check if user is already verified with a REAL identity (not placeholder "Public Access")
        const isPublicPlaceholder = 
          result.reviewer_name === "Public Access" || 
          result.reviewer_email === "public@cfi.trade";
        
        if (result.email_verified && !isPublicPlaceholder) {
          // Already verified with real identity from database
          setIsIdentified(true);
          if (!storedSession) {
            setEmail(result.reviewer_email || "");
            setName(result.reviewer_name || "");
          }
        }
        
        // Always load campaign data - don't block on identification
        await loadCampaignData(result.entity, result.campaign_id);
      } catch (error: unknown) {
        logger.error("Token verification failed:", error);
        setAccessData(null);
        const errorMessage = error instanceof Error && error.message?.includes("fetch") 
          ? "Network error - please check your connection and try again"
          : (error instanceof Error ? error.message : "This review link is invalid or has expired");
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token, verifyToken, storedSession]);

  const loadCampaignData = async (entity: string, campaignId?: string) => {
    try {
      let campaignIds: string[] = [];
      
      if (campaignId) {
        // Single campaign review
        const { data: campaign, error: campError } = await supabase
          .from("utm_campaigns")
          .select("*")
          .eq("id", campaignId)
          .single();

        if (campError) {
          logger.error("Campaign query error:", campError);
          toast.error("Campaign not found");
          throw campError;
        }

        setCampaignData(campaign ? [campaign] : []);
        campaignIds = campaign ? [campaign.id] : [];

        // Load versions
        const { data: versionData, error: versionError } = await supabase
          .from("utm_campaign_versions")
          .select("id, utm_campaign_id, version_number, version_notes, image_url, asset_link, created_at")
          .eq("utm_campaign_id", campaignId)
          .order("version_number", { ascending: false });

        if (versionError) {
          logger.error("Versions query error:", versionError);
        }
        
        setVersions(versionData || []);
      } else {
        // Entity-wide review - load all campaigns for entity
        const { data: tracking, error: trackError } = await supabase
          .from("campaign_entity_tracking")
          .select("campaign_id, utm_campaigns(*)")
          .eq("entity", entity);

        if (trackError) {
          logger.error("Tracking query error:", trackError);
          toast.error("Failed to load entity campaigns");
          throw trackError;
        }
        
        const campaigns = tracking.map((t) => t.utm_campaigns as CampaignData).filter(Boolean);
        
        if (!campaigns || campaigns.length === 0) {
          logger.debug(`No campaigns found for ${entity}`);
        }
        
        setCampaignData(campaigns);
        campaignIds = campaigns.map((c) => c.id);

        if (campaignIds.length > 0) {
          const { data: versionData, error: versionError } = await supabase
            .from("utm_campaign_versions")
            .select("id, utm_campaign_id, version_number, version_notes, image_url, asset_link, created_at")
            .in("utm_campaign_id", campaignIds)
            .order("version_number", { ascending: false });

          if (versionError) {
            logger.error("Versions query error:", versionError);
          }

          setVersions(versionData || []);
        }
      }
      
      // Load existing comments for this entity
      await loadExistingComments(entity, campaignIds);
    } catch (error: unknown) {
      console.error("Error loading campaign data:", error);
      const message = error instanceof Error ? error.message : "";
      if (message?.includes("expired")) {
        toast.error("This review link has expired");
      } else if (message?.includes("JWT")) {
        toast.error("Invalid review link");
      } else {
        toast.error("Failed to load campaign data");
      }
    }
  };

  const loadExistingComments = async (entity: string, campaignIds: string[]) => {
    try {
      // Fetch all comments for this entity (both campaign-specific and entity-level)
      const query = supabase
        .from("external_campaign_review_comments")
        .select("*")
        .eq("entity", entity)
        .order("created_at", { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Error loading comments:", error);
        return;
      }
      
      setExistingComments(data || []);
    } catch (error) {
      console.error("Error loading existing comments:", error);
    }
  };

  const handleEmailVerification = async () => {
    if (!email.endsWith("@cfi.trade")) {
      toast.error("Please use your @cfi.trade email address");
      return;
    }

    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setVerifying(true);
    try {
      // Save to session for persistence
      await saveSession(name, email);
      
      // Also update the backend
      await verifyEmail.mutateAsync({
        token: token!,
        reviewerName: name,
        reviewerEmail: email,
      });
      
      setIsIdentified(true);
      toast.success("You can now leave feedback");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Verification failed: " + message);
    } finally {
      setVerifying(false);
    }
  };

  const handleCommentSubmit = async (versionId: string, campaignId: string, text: string) => {
    if (!text?.trim()) return;

    setSubmitting({ ...submitting, [versionId]: true });
    try {
      const newComment: ExternalComment = {
        id: `temp-${Date.now()}`,
        campaign_id: campaignId,
        version_id: versionId,
        entity: accessData.entity,
        reviewer_name: name,
        reviewer_email: email,
        comment_text: text,
        comment_type: "version_feedback",
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("external_campaign_review_comments")
        .insert({
          campaign_id: campaignId,
          version_id: versionId,
          reviewer_name: name,
          reviewer_email: email,
          entity: accessData.entity,
          comment_text: text,
          comment_type: "version_feedback",
          access_token: token!,
        });

      if (error) throw error;
      
      // Optimistic update - add to existing comments
      setExistingComments(prev => [newComment, ...prev]);
      setComments({ ...comments, [versionId]: "" });
      toast.success("Feedback submitted");
    } catch (error: unknown) {
      console.error("Comment submission error:", error);
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting({ ...submitting, [versionId]: false });
    }
  };

  const handleEntityCommentSubmit = async () => {
    if (!entityComment.trim()) return;

    setSubmittingEntityComment(true);
    try {
      const newComment: ExternalComment = {
        id: `temp-${Date.now()}`,
        campaign_id: null,
        version_id: null,
        entity: accessData.entity,
        reviewer_name: name,
        reviewer_email: email,
        comment_text: entityComment,
        comment_type: "entity_feedback",
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("external_campaign_review_comments")
        .insert({
          campaign_id: null,
          version_id: null,
          entity: accessData.entity,
          reviewer_name: name,
          reviewer_email: email,
          comment_text: entityComment,
          comment_type: "entity_feedback",
          access_token: token!,
        });

      if (error) throw error;
      
      // Optimistic update
      setExistingComments(prev => [newComment, ...prev]);
      setEntityComment("");
      toast.success("Entity feedback submitted");
    } catch (error: unknown) {
      console.error("Entity comment submission error:", error);
      toast.error("Failed to submit feedback");
    } finally {
      setSubmittingEntityComment(false);
    }
  };

  // Helper to get entity-level comments
  const getEntityComments = () => {
    return existingComments.filter(c => c.campaign_id === null && c.version_id === null);
  };

  // Sort and filter campaigns
  const getSortedCampaigns = () => {
    let filtered = campaignData;
    
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
          // Sort by most recent version
          const aLatest = versions.find(v => v.utm_campaign_id === a.id)?.created_at || "";
          const bLatest = versions.find(v => v.utm_campaign_id === b.id)?.created_at || "";
          return bLatest.localeCompare(aLatest);
        }
      }
    });
  };

  if (loading) {
    return (
      <GlassBackground variant="centered">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </GlassBackground>
    );
  }

  // Show error if no access data or invalid token
  if (!accessData) {
    return (
      <GlassBackground variant="centered">
        <Card className="w-full max-w-md liquid-glass-elevated">
          <CardHeader>
            <CardTitle className="text-heading-lg text-destructive">Invalid Review Link</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                This review link is invalid or has expired. Please request a new link from the campaign manager.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </GlassBackground>
    );
  }

  const entityLevelComments = getEntityComments();
  const sortedCampaigns = getSortedCampaigns();

  return (
    <GlassBackground variant="full">
      {/* Header */}
      <div className="border-b liquid-glass sticky top-0 z-40">
        <div className="container mx-auto py-md px-md">
          <div className="flex items-center gap-sm">
            <Eye className="h-6 w-6 text-primary" />
            <div className="flex-1">
              <h1 className="text-heading-lg font-semibold">Campaign Review</h1>
              <p className="text-body-sm text-muted-foreground">
                {accessData?.entity} {isIdentified && `• Reviewing as ${name}`}
              </p>
            </div>
            <Badge variant="outline" className="text-metadata">
              <ExternalLink className="h-3 w-3 mr-xs" />
              External Review
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-lg px-md space-y-lg">
        {/* Inline Identification Bar - shown when not identified */}
        {!isIdentified && (
          <Card className="mb-md border-primary/30">
            <CardContent className="py-sm px-md">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-sm sm:gap-md">
                <span className="text-body-sm text-muted-foreground">To leave feedback:</span>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full sm:w-40 h-8"
                />
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@cfi.trade"
                  className="w-full sm:w-48 h-8"
                />
                <Button 
                  size="sm" 
                  onClick={handleEmailVerification} 
                  disabled={verifying || !name.trim() || !email.trim()}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-xs animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Start Reviewing"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reviewer Guidance */}
        <Card className="bg-muted/30 border-border/50">
          <CardContent className="py-md px-lg">
            <div className="flex items-start gap-md">
              <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-sm">
                <h3 className="text-body font-semibold text-foreground">How to Review</h3>
                <ul className="text-body-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Click any campaign card below to view its creative versions</li>
                  <li>Each version shows the visual asset and version notes</li>
                  <li>Leave feedback on specific versions using the comment box</li>
                  <li>Your feedback helps improve our campaigns for {accessData?.entity}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filter Bar */}
        <FilterBar
          search={{
            value: searchQuery,
            onChange: setSearchQuery,
            placeholder: "Search campaigns..."
          }}
        >
          <FilterPill>
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(v) => v && setViewMode(v as ViewMode)}
              className="bg-muted rounded-lg p-0.5"
            >
              <ToggleGroupItem value="grid" size="sm" className="h-8 px-sm data-[state=on]:bg-background">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" size="sm" className="h-8 px-sm data-[state=on]:bg-background">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </FilterPill>
          
          <FilterPill>
            <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
              <SelectTrigger className="w-[140px] h-9">
                <ArrowUpDown className="h-3 w-3 mr-xs" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="versions">Versions</SelectItem>
              </SelectContent>
            </Select>
          </FilterPill>
          
          <div className="ml-auto">
            <Badge variant="secondary" className="text-metadata">
              {sortedCampaigns.length} campaign{sortedCampaigns.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </FilterBar>

        {/* Campaign Grid/List */}
        {sortedCampaigns.length === 0 ? (
          <Card>
            <CardContent className="py-xl">
              <div className="text-center text-muted-foreground">
                <p className="text-body">No campaigns available for review at this time.</p>
                <p className="text-body-sm mt-xs">Entity: {accessData?.entity}</p>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <>
            {/* Campaign Thumbnail Grid */}
            <ExternalCampaignGrid
              campaigns={sortedCampaigns}
              versions={versions}
              comments={existingComments}
              selectedCampaignId={expandedCampaignId}
              onSelectCampaign={setExpandedCampaignId}
            />

            {/* Detail Panel - appears below grid when campaign selected */}
            {expandedCampaignId && (() => {
              const selectedCampaign = sortedCampaigns.find(c => c.id === expandedCampaignId);
              const campaignVersions = versions
                .filter(v => v.utm_campaign_id === expandedCampaignId)
                .sort((a, b) => b.version_number - a.version_number);
              
              if (!selectedCampaign) return null;
              
              return (
                <ExternalCampaignDetailPanel
                  campaign={selectedCampaign}
                  versions={campaignVersions}
                  comments={existingComments}
                  onClose={() => setExpandedCampaignId(null)}
                  onSubmitFeedback={handleCommentSubmit}
                  submitting={submitting}
                  commentInputs={comments}
                  onCommentChange={(versionId, value) => setComments({ ...comments, [versionId]: value })}
                />
              );
            })()}
          </>
        ) : (
          // List view - simpler table-like layout
          <div className="space-y-sm">
            {sortedCampaigns.map((campaign) => {
              const campaignVersions = versions.filter(v => v.utm_campaign_id === campaign.id);
              const latestVersion = campaignVersions[0];
              const commentCount = existingComments.filter(c => 
                campaignVersions.some(v => v.id === c.version_id)
              ).length;

              return (
                <Card 
                  key={campaign.id}
                  interactive
                  onClick={() => setExpandedCampaignId(prev => prev === campaign.id ? null : campaign.id)}
                  className={expandedCampaignId === campaign.id ? "ring-2 ring-primary/20" : ""}
                >
                  <div className="flex items-center gap-md p-md">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-muted border border-border">
                      {latestVersion?.image_url ? (
                        <img
                          src={latestVersion.image_url}
                          alt={campaign.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Eye className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-body truncate">{campaign.name}</h3>
                      <p className="text-metadata text-muted-foreground">
                        {campaign.lp_type || campaign.campaign_type || "Campaign"}
                      </p>
                    </div>
                    
                    {/* Badges */}
                    <div className="flex items-center gap-sm">
                      <Badge variant="secondary" className="text-metadata">
                        {campaignVersions.length} v
                      </Badge>
                      {commentCount > 0 && (
                        <Badge className="text-metadata">
                          <MessageSquare className="h-3 w-3 mr-xs" />
                          {commentCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Expanded content - now uses full-width version gallery */}
                  {expandedCampaignId === campaign.id && (
                    <div className="border-t border-border p-md">
                      <ExternalVersionGallery
                        versions={campaignVersions.sort((a, b) => b.version_number - a.version_number)}
                        comments={existingComments.filter(c => campaignVersions.some(v => v.id === c.version_id))}
                        onSubmitFeedback={(versionId, text) => handleCommentSubmit(versionId, campaign.id, text)}
                        submitting={submitting}
                        commentInputs={comments}
                        onCommentChange={(versionId, value) => setComments({ ...comments, [versionId]: value })}
                        expanded
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Entity-Level Feedback Section */}
        <Card className="bg-accent/5 border-2 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-sm">
              <MessageSquare className="h-5 w-5 text-primary" />
              General Feedback for {accessData?.entity}
            </CardTitle>
            <p className="text-body-sm text-muted-foreground">
              Share your overall thoughts or comments about this entity's campaigns
            </p>
          </CardHeader>
          <CardContent className="space-y-md">
            {/* Show existing entity-level comments */}
            {entityLevelComments.length > 0 && (
              <div className="mb-md">
                <div className="flex items-center gap-xs mb-sm">
                  <span className="text-body-sm font-medium">Previous Feedback ({entityLevelComments.length})</span>
                </div>
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-sm pr-sm">
                    {entityLevelComments.map((comment) => (
                      <div key={comment.id} className="flex gap-sm p-sm rounded-lg bg-muted/30 border border-border">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-metadata bg-primary/10">
                            {comment.reviewer_name?.charAt(0).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-sm flex-wrap">
                            <span className="font-medium text-body-sm">{comment.reviewer_name}</span>
                            <span className="text-metadata text-muted-foreground">
                              {format(new Date(comment.created_at), "MMM d, h:mm a")} ({formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })})
                            </span>
                          </div>
                          <p className="text-body-sm text-foreground mt-xs">{comment.comment_text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
            
            <Textarea
              value={entityComment}
              onChange={(e) => setEntityComment(e.target.value)}
              placeholder="Your general feedback for the entity..."
              className="min-h-[120px]"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleEntityCommentSubmit}
                disabled={!entityComment.trim() || submittingEntityComment}
              >
                {submittingEntityComment ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-sm animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Feedback"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ExternalPageFooter />
    </GlassBackground>
  );
}
