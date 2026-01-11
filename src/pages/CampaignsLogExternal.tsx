import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Eye, ExternalLink as ExternalLinkIcon, MessageSquare, MousePointerClick, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useExternalAccess } from "@/hooks/useExternalAccess";
import { useUtmCampaigns } from "@/hooks/useUtmCampaigns";
import { EntityCampaignTable } from "@/components/campaigns/EntityCampaignTable";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { GlassBackground } from "@/components/layout/GlassBackground";

export default function CampaignsLogExternal() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { verifyToken, verifyEmail } = useExternalAccess();
  const { data: campaigns = [] } = useUtmCampaigns();
  
  const [accessData, setAccessData] = useState<any>(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  
  // Email verification form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const hasSetInitialValues = useRef(false);

  // Verify token on mount
  useEffect(() => {
    const verify = async () => {
      if (!token) {
        toast.error("Invalid review link");
        navigate("/");
        return;
      }

      try {
        const result = await verifyToken(token);
        setAccessData(result);
        setVerified(result.email_verified);
        
        if (!result.email_verified && !hasSetInitialValues.current) {
          setEmail(result.reviewer_email);
          setName(result.reviewer_name || "");
          hasSetInitialValues.current = true;
        }
      } catch (error: any) {
        toast.error(error.message || "Invalid or expired link");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token, verifyToken, navigate]);

  const handleEmailVerification = async () => {
    if (!email.endsWith("@cfi.trade")) {
      toast.error("Email must be from @cfi.trade domain");
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
      toast.success("Access granted!");
    } catch (error: any) {
      toast.error(error.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  // Fetch tracking records for this entity (for external access)
  const [entityCampaigns, setEntityCampaigns] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchEntityCampaigns = async () => {
      if (!accessData?.entity) return;
      
      try {
        // Fetch tracking records for this entity
        const { data: trackingData, error: trackingError } = await supabase
          .from('campaign_entity_tracking')
          .select('campaign_id')
          .eq('entity', accessData.entity);
        
        if (trackingError) {
          console.error('Failed to fetch tracking data:', trackingError);
          return;
        }
        
        if (!trackingData || trackingData.length === 0) {
          setEntityCampaigns([]);
          return;
        }
        
        // Get campaign IDs
        const campaignIds = trackingData.map(t => t.campaign_id);
        
        // Fetch campaigns that are tracked for this entity
        const filteredCampaigns = campaigns
          .filter(c => campaignIds.includes(c.id))
          .map(c => ({
            id: c.id,
            name: c.name,
            notes: null,
          }));
        
        setEntityCampaigns(filteredCampaigns);
      } catch (error) {
        console.error('Error fetching entity campaigns:', error);
      }
    };
    
    fetchEntityCampaigns();
  }, [accessData, campaigns]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show verification form if not verified
  if (!verified) {
    return (
      <GlassBackground variant="centered">
        <Card className="max-w-md w-full glass-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Email Verification Required
            </CardTitle>
            <CardDescription>
              Please verify your @cfi.trade email to access the campaign review
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-md">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (@cfi.trade)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@cfi.trade"
              />
            </div>
            <Button
              onClick={handleEmailVerification}
              disabled={verifying}
              className="w-full"
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Access"
              )}
            </Button>
          </CardContent>
        </Card>
      </GlassBackground>
    );
  }

  return (
    <GlassBackground variant="full">
      {/* Header */}
      <div className="border-b glass-elevated sticky top-0 z-40">
        <div className="container mx-auto py-4 px-6">
          <PageHeader 
            title={`Campaign Review: ${accessData?.entity}`}
            description={`Viewing as ${name} (${email})`}
            icon={Eye}
          />
        </div>
      </div>

      {/* Usage Guide */}
      <div className="container mx-auto py-6 px-6">
        <Alert className="mb-lg bg-primary/5 border-primary/20">
          <CheckCircle className="h-4 w-4 text-primary" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold text-foreground">How to use this review page:</p>
              <ul className="space-y-1 text-sm">
                <li className="flex items-start gap-2">
                  <MousePointerClick className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span><strong>Click on any campaign card</strong> to view its full details, images, and metadata</span>
                </li>
                <li className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span><strong>Click the "Comments" button</strong> at the top right to add feedback or tag team members (use @)</span>
                </li>
                <li className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span><strong>Add campaign-specific comments</strong> by opening a campaign and using the comments section there</span>
                </li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        {/* Campaign Table */}
        <EntityCampaignTable
          entity={accessData.entity}
          campaigns={entityCampaigns}
          isExternal={true}
          externalReviewerName={name}
          externalReviewerEmail={email}
        />
      </div>

      {/* Footer */}
      <footer className="border-t border-border glass-elevated mt-8">
        <div className="container mx-auto px-6 py-6 text-center">
          <p className="text-body-sm text-muted-foreground">
            Proudly presented by the Performance Marketing Team at CFI Group. This page was built internally with AI. Do not share with third parties; internal use only.
          </p>
        </div>
      </footer>
    </GlassBackground>
  );
}
