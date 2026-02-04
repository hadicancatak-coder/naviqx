import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, XCircle, Info, CheckCircle, ExternalLink } from "lucide-react";

export interface Finding {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  details?: string;
  source: "scanner" | "linter" | "runtime";
  actionable?: boolean;
  fixUrl?: string;
  onCleanup?: () => void;
}

interface SecurityFindingsProps {
  findings: Finding[];
  onAcknowledge?: (findingId: string) => void;
}

export function SecurityFindings({ findings, onAcknowledge }: SecurityFindingsProps) {
  const getSeverityIcon = (severity: Finding["severity"]) => {
    switch (severity) {
      case "critical":
      case "high":
        return <XCircle className="h-5 w-5 text-destructive-text" />;
      case "medium":
        return <AlertTriangle className="h-5 w-5 text-warning-text" />;
      case "low":
        return <Info className="h-5 w-5 text-info-text" />;
      default:
        return <Info className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getSeverityBadgeClass = (severity: Finding["severity"]) => {
    switch (severity) {
      case "critical":
        return "status-destructive";
      case "high":
        return "status-destructive";
      case "medium":
        return "status-warning";
      case "low":
        return "status-info";
      default:
        return "status-neutral";
    }
  };

  const getSourceBadge = (source: Finding["source"]) => {
    const labels = {
      scanner: "Edge Function Scan",
      linter: "Database Linter",
      runtime: "Runtime Check",
    };
    return (
      <Badge variant="outline" className="text-metadata">
        {labels[source]}
      </Badge>
    );
  };

  if (findings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-sm">Active Findings</CardTitle>
          <CardDescription>Security issues requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-xl text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-sm text-success-text" />
            <p>No active security findings</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-heading-sm">Active Findings</CardTitle>
        <CardDescription>
          {findings.length} security issue{findings.length !== 1 ? "s" : ""} requiring attention
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-md">
            {findings.map((finding) => (
              <div
                key={finding.id}
                className="border border-border rounded-lg p-md hover:bg-card-hover transition-smooth"
              >
                <div className="flex items-start justify-between mb-sm">
                  <div className="flex items-center gap-sm">
                    {getSeverityIcon(finding.severity)}
                    <h3 className="font-semibold text-foreground">{finding.title}</h3>
                  </div>
                  <div className="flex items-center gap-xs">
                    {getSourceBadge(finding.source)}
                    <Badge className={getSeverityBadgeClass(finding.severity)}>
                      {finding.severity.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-body-sm text-muted-foreground mb-sm">
                  {finding.description}
                </p>
                
                {finding.details && (
                  <pre className="text-metadata bg-muted p-sm rounded mt-sm overflow-auto max-h-32">
                    {finding.details}
                  </pre>
                )}

                <div className="flex items-center gap-sm mt-md">
                  {finding.onCleanup && (
                    <Button size="sm" variant="default" onClick={finding.onCleanup}>
                      Clean Now
                    </Button>
                  )}
                  {finding.fixUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={finding.fixUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-xs" />
                        How to Fix
                      </a>
                    </Button>
                  )}
                  {onAcknowledge && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onAcknowledge(finding.id)}
                    >
                      Acknowledge
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
