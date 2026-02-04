import { Card, CardContent } from "@/components/ui/card";
import { Shield, AlertTriangle, Clock, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SecurityPostureProps {
  securityScore: number;
  criticalIssues: number;
  lastScanAt: Date | null;
  unresolvedActivities: number;
}

export function SecurityPosture({
  securityScore,
  criticalIssues,
  lastScanAt,
  unresolvedActivities,
}: SecurityPostureProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success-text";
    if (score >= 60) return "text-warning-text";
    return "text-destructive-text";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-success-soft";
    if (score >= 60) return "bg-warning-soft";
    return "bg-destructive-soft";
  };

  return (
    <div className="grid gap-md md:grid-cols-4">
      <Card className={`liquid-glass-elevated rounded-xl hover-lift transition-smooth ${getScoreBg(securityScore)}`}>
        <CardContent className="p-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-metadata font-medium text-muted-foreground">Security Score</p>
              <p className={`text-heading-lg font-bold ${getScoreColor(securityScore)}`}>
                {securityScore}/100
              </p>
            </div>
            <Shield className={`h-8 w-8 ${getScoreColor(securityScore)}`} />
          </div>
        </CardContent>
      </Card>

      <Card className={`liquid-glass-elevated rounded-xl hover-lift transition-smooth ${criticalIssues > 0 ? "bg-destructive-soft" : "bg-success-soft"}`}>
        <CardContent className="p-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-metadata font-medium text-muted-foreground">Critical Issues</p>
              <p className={`text-heading-lg font-bold ${criticalIssues > 0 ? "text-destructive-text" : "text-success-text"}`}>
                {criticalIssues}
              </p>
            </div>
            <AlertTriangle className={`h-8 w-8 ${criticalIssues > 0 ? "text-destructive-text" : "text-success-text"}`} />
          </div>
        </CardContent>
      </Card>

      <Card className="liquid-glass-elevated rounded-xl hover-lift transition-smooth">
        <CardContent className="p-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-metadata font-medium text-muted-foreground">Last Scan</p>
              <p className="text-heading-sm font-semibold text-foreground">
                {lastScanAt 
                  ? formatDistanceToNow(lastScanAt, { addSuffix: true })
                  : "Never"
                }
              </p>
            </div>
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card className={`liquid-glass-elevated rounded-xl hover-lift transition-smooth ${unresolvedActivities > 0 ? "bg-warning-soft" : "bg-success-soft"}`}>
        <CardContent className="p-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-metadata font-medium text-muted-foreground">Suspicious Activity</p>
              <p className={`text-heading-lg font-bold ${unresolvedActivities > 0 ? "text-warning-text" : "text-success-text"}`}>
                {unresolvedActivities}
              </p>
            </div>
            <Activity className={`h-8 w-8 ${unresolvedActivities > 0 ? "text-warning-text" : "text-success-text"}`} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
