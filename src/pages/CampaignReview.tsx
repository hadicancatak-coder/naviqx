import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Eye, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExternalAccess } from "@/hooks/useExternalAccess";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatDistanceToNow } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GlassBackground } from "@/components/layout/GlassBackground";
import { ExternalPageFooter } from "@/components/layout/ExternalPageFooter";

export default function CampaignReview() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { verifyToken, verifyEmail } = useExternalAccess();
  
  const [accessData, setAccessData] = useState<any>(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  
  const [campaignData, setCampaignData] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [comments, setComments] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState<{ [key: string]: boolean }>({});
  const [entityComment, setEntityComment] = useState("");
  const [submittingEntityComment, setSubmittingEntityComment] = useState(false);

  const hasSetInitialValues = useRef(false);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const result = await verifyToken(token);
        setAccessData(result);
        
        // Check if already verified
        if (result.email_verified) {
          setVerified(true);
          setEmail(result.reviewer_email || "");
          setName(result.reviewer_name || "");
          await loadCampaignData(result.entity, result.campaign_id);
        } else {
          // Pre-fill email ONCE on initial load only
          if (!hasSetInitialValues.current) {
            setEmail(result.reviewer_email || "");
            setName(result.reviewer_name || "");
            hasSetInitialValues.current = true;
          }
        }
      } catch (error: any) {
        console.error("Token verification failed:", error);
        setAccessData(null);
        toast.error(error.message || "This review link is invalid or has expired");
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token, verifyToken]);

  const loadCampaignData = async (entity: string, campaignId?: string) => {
    try {
      if (campaignId) {
        // Single campaign review
        const { data: campaign, error: campError } = await supabase
          .from("utm_campaigns")
          .select("*")
          .eq("id", campaignId)
          .single();

        if (campError) {
          console.error("Campaign query error:", campError);
          toast.error("Campaign not found");
          throw campError;
        }

        setCampaignData(campaign ? [campaign] : []);

        // Load versions
        const { data: versionData, error: versionError } = await supabase
          .from("utm_campaign_versions")
          .select("id, utm_campaign_id, version_number, version_notes, image_url, asset_link")
          .eq("utm_campaign_id", campaignId)
          .order("version_number", { ascending: false });

        if (versionError) {
          console.error("Versions query error:", versionError);
        }
        
        setVersions(versionData || []);
      } else {
        // Entity-wide review - load all campaigns for entity
        // Presence in tracking table = "live" for that entity
        const { data: tracking, error: trackError } = await supabase
          .from("campaign_entity_tracking")
          .select("campaign_id, utm_campaigns(*)")
          .eq("entity", entity);

        if (trackError) {
          console.error("Tracking query error:", trackError);
          toast.error("Failed to load entity campaigns");
          throw trackError;
        }
        
        const campaigns = tracking.map((t: any) => t.utm_campaigns).filter(Boolean);
        
        if (!campaigns || campaigns.length === 0) {
          console.log(`No campaigns found for ${entity}`);
        }
        
        setCampaignData(campaigns);

        const campaignIds = campaigns.map((c: any) => c.id);
        if (campaignIds.length > 0) {
          const { data: versionData, error: versionError } = await supabase
            .from("utm_campaign_versions")
            .select("id, utm_campaign_id, version_number, version_notes, image_url, asset_link")
            .in("utm_campaign_id", campaignIds)
            .order("version_number", { ascending: false });

          if (versionError) {
            console.error("Versions query error:", versionError);
          }

          setVersions(versionData || []);
        }
      }
    } catch (error: any) {
      console.error("Error loading campaign data:", error);
      if (error.message?.includes("expired")) {
        toast.error("This review link has expired");
      } else if (error.message?.includes("JWT")) {
        toast.error("Invalid review link");
      } else {
        toast.error("Failed to load campaign data");
      }
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
      await verifyEmail.mutateAsync({
        token: token!,
        reviewerName: name,
        reviewerEmail: email,
      });
      
      setVerified(true);
      await loadCampaignData(accessData.entity, accessData.campaign_id);
    } catch (error: any) {
      toast.error("Verification failed: " + error.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleCommentSubmit = async (versionId: string, campaignId: string) => {
    const commentText = comments[versionId];
    if (!commentText?.trim()) return;

    setSubmitting({ ...submitting, [versionId]: true });
    try {
      const { error } = await supabase
        .from("external_campaign_review_comments")
        .insert({
          campaign_id: campaignId,
          version_id: versionId,
          reviewer_name: name,
          reviewer_email: email,
          entity: accessData.entity,
          comment_text: commentText,
          comment_type: "version_feedback",
          access_token: token!,
        });

      if (error) throw error;
      
      setComments({ ...comments, [versionId]: "" });
      toast.success("Comment submitted");
    } catch (error: any) {
      toast.error("Failed to submit comment");
    } finally {
      setSubmitting({ ...submitting, [versionId]: false });
    }
  };

  const handleEntityCommentSubmit = async () => {
    if (!entityComment.trim()) return;

    setSubmittingEntityComment(true);
    try {
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
      
      setEntityComment("");
      toast.success("Entity feedback submitted");
    } catch (error: any) {
      toast.error("Failed to submit entity feedback");
    } finally {
      setSubmittingEntityComment(false);
    }
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
        <Card className="w-full max-w-md glass-elevated">
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

  // Show verification form if not verified
  if (!verified) {
    return (
      <GlassBackground variant="centered">
        <Card className="w-full max-w-md glass-elevated">
          <CardHeader>
            <div className="flex items-center gap-sm mb-sm">
              <Eye className="h-6 w-6 text-primary" />
              <CardTitle className="text-heading-lg">Campaign Review Access</CardTitle>
            </div>
            <p className="text-body-sm text-muted-foreground">
              Entity: {accessData?.entity}
            </p>
          </CardHeader>
          <CardContent className="space-y-md">
            <Alert>
              <AlertDescription>
                Please verify your identity to access the campaign review. Only @cfi.trade email addresses are allowed.
              </AlertDescription>
            </Alert>

            <div className="space-y-sm">
              <div>
                <Label htmlFor="name">Your Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email">Your CFI Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@cfi.trade"
                  className="mt-1"
                />
                <p className="text-metadata text-muted-foreground mt-1">
                  Only @cfi.trade email addresses are accepted
                </p>
              </div>
            </div>

            <Button
              onClick={handleEmailVerification}
              disabled={verifying || !name.trim() || !email.trim()}
              className="w-full"
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Access Campaign Review"
              )}
            </Button>
          </CardContent>
        </Card>
      </GlassBackground>
    );
  }

  return (
    <GlassBackground variant="full">
      <div className="border-b glass-elevated sticky top-0 z-40">
        <div className="container mx-auto py-md px-md">
          <div className="flex items-center gap-sm">
            <Eye className="h-6 w-6 text-primary" />
            <div className="flex-1">
              <h1 className="text-page-title">Campaign Review</h1>
              <p className="text-body-sm text-muted-foreground">
                {accessData?.entity} • Reviewing as {name}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-md px-md space-y-lg">
        {!campaignData || campaignData.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <p className="text-body">No campaigns available for review at this time.</p>
                <p className="text-body-sm mt-2">Entity: {accessData?.entity}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          campaignData.map((campaign: any) => {
            const campaignVersions = versions.filter((v) => v.utm_campaign_id === campaign.id);
          
          return (
            <Card key={campaign.id}>
              <CardHeader>
                <CardTitle className="text-heading-lg">{campaign.name}</CardTitle>
                <p className="text-body text-muted-foreground">{campaign.lp_type || "Campaign"}</p>
              </CardHeader>
              <CardContent className="space-y-md">
                <Accordion type="single" collapsible>
                  {campaignVersions.map((version) => (
                    <AccordionItem key={version.id} value={version.id}>
                      <AccordionTrigger className="text-body font-medium">
                        Version {version.version_number}
                        {version.version_notes && (
                          <span className="text-metadata text-muted-foreground ml-sm">
                            • {version.version_notes.substring(0, 50)}
                          </span>
                        )}
                      </AccordionTrigger>
                      <AccordionContent className="space-y-md pt-sm">
                        {version.version_notes && (
                          <div>
                            <p className="text-body-sm text-foreground">{version.version_notes}</p>
                          </div>
                        )}
                        
                        {version.image_url && (
                          <div>
                            <img
                              src={version.image_url}
                              alt={`Version ${version.version_number}`}
                              className="rounded-lg max-w-full h-auto"
                            />
                          </div>
                        )}
                        
                        {version.asset_link && (
                          <div>
                            <a
                              href={version.asset_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-body-sm text-primary hover:underline"
                            >
                              View Asset Link →
                            </a>
                          </div>
                        )}

                        {/* Comment section */}
                        <div className="space-y-sm border-t border-border pt-md">
                          <div className="flex items-center gap-xs">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-body-sm">Leave feedback on this version:</Label>
                          </div>
                          <Textarea
                            value={comments[version.id] || ""}
                            onChange={(e) =>
                              setComments({ ...comments, [version.id]: e.target.value })
                            }
                            placeholder="Share your feedback on lead quality, creative effectiveness, etc..."
                            className="min-h-[100px]"
                          />
                          <Button
                            onClick={() => handleCommentSubmit(version.id, campaign.id)}
                            disabled={!comments[version.id]?.trim() || submitting[version.id]}
                            size="sm"
                          >
                            {submitting[version.id] ? "Submitting..." : "Submit Feedback"}
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          );
        })
        )}

        {/* Entity-Level Feedback Section */}
        <Card className="bg-accent/5 border-2 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              General Feedback for {accessData?.entity}
            </CardTitle>
            <p className="text-body-sm text-muted-foreground">
              Share your overall thoughts or comments about this entity's campaigns
            </p>
          </CardHeader>
          <CardContent className="space-y-md">
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
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Entity Feedback"
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
