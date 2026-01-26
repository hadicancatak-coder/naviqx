import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { GlassBackground } from "@/components/layout/GlassBackground";

/**
 * CampaignsLogExternal is deprecated.
 * All external review traffic is now routed to the improved CampaignReview page.
 */
export default function CampaignsLogExternal() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the unified CampaignReview page
    if (token) {
      navigate(`/campaigns-log/review/${token}`, { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [token, navigate]);

  return (
    <GlassBackground variant="centered">
      <div className="flex flex-col items-center gap-md">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-body-sm text-muted-foreground">Redirecting to campaign review...</p>
      </div>
    </GlassBackground>
  );
}
