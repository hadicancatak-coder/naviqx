import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { checkCompliance, type ComplianceIssue } from "@/lib/adQualityScore";
import { useEntityAdRules } from "@/hooks/useEntityAdRules";

interface AdComplianceCheckerProps {
  headlines: string[];
  descriptions: string[];
  sitelinks: string[];
  callouts: string[];
  entity?: string;
}

export const AdComplianceChecker = ({
  headlines,
  descriptions,
  sitelinks,
  callouts,
  entity,
}: AdComplianceCheckerProps) => {
  const { rules } = useEntityAdRules(entity);
  const issues = checkCompliance(
    headlines, 
    descriptions, 
    sitelinks, 
    callouts, 
    entity
  );
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  if (issues.length === 0) {
    return (
      <Card className="border-success/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <CardTitle className="text-heading-sm">Compliance Check - All Clear ✓</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-body-sm text-muted-foreground">
            No compliance issues detected. Your ad follows brand guidelines.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={errors.length > 0 ? "border-destructive/50" : "border-warning/50"}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {errors.length > 0 ? (
              <XCircle className="h-5 w-5 text-destructive" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-warning" />
            )}
            <CardTitle className="text-heading-sm">Compliance Issues Found</CardTitle>
          </div>
          <div className="flex gap-2">
            {errors.length > 0 && (
              <Badge variant="destructive">{errors.length} Error{errors.length > 1 ? 's' : ''}</Badge>
            )}
            {warnings.length > 0 && (
              <Badge variant="outline" className="status-warning">
                {warnings.length} Warning{warnings.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {errors.length > 0 && (
          <div className="space-y-2">
            <div className="font-medium text-body-sm text-destructive">⛔ Errors (Must Fix)</div>
            <ul className="space-y-2">
              {errors.map((issue, idx) => (
                <li key={idx} className="flex items-start gap-2 text-body-sm p-2 rounded bg-destructive-soft">
                  <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">{issue.message}</div>
                    <div className="text-metadata text-muted-foreground mt-1">
                      Field: {issue.field}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="space-y-2">
            <div className="font-medium text-body-sm text-warning">⚠️ Warnings (Recommended)</div>
            <ul className="space-y-2">
              {warnings.map((issue, idx) => (
                <li key={idx} className="flex items-start gap-2 text-body-sm p-2 rounded bg-warning-soft">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">{issue.message}</div>
                    <div className="text-metadata text-muted-foreground mt-1">
                      Field: {issue.field}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
