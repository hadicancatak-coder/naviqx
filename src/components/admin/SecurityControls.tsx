import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, ShieldCheck, Mail, Key } from "lucide-react";

interface SecurityControlsProps {
  mfaEnforced: boolean;
  emailDomainRestriction: string | null;
  permissivePoliciesCount: number;
}

export function SecurityControls({
  mfaEnforced,
  emailDomainRestriction,
  permissivePoliciesCount,
}: SecurityControlsProps) {
  return (
    <Card>
      <CardHeader className="pb-sm">
        <CardTitle className="text-heading-sm">Security Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <Key className="h-4 w-4 text-muted-foreground" />
            <span className="text-body-sm">MFA Enforcement</span>
          </div>
          {mfaEnforced ? (
            <Badge className="status-success gap-xs">
              <CheckCircle className="h-3 w-3" />
              Enabled
            </Badge>
          ) : (
            <Badge className="status-warning gap-xs">
              <AlertTriangle className="h-3 w-3" />
              Disabled
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-body-sm">Email Domain Restriction</span>
          </div>
          {emailDomainRestriction ? (
            <Badge className="status-success gap-xs">
              <CheckCircle className="h-3 w-3" />
              {emailDomainRestriction}
            </Badge>
          ) : (
            <Badge className="status-warning gap-xs">
              <AlertTriangle className="h-3 w-3" />
              Not Configured
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-body-sm">RLS Policies</span>
          </div>
          {permissivePoliciesCount > 0 ? (
            <Badge className="status-info gap-xs">
              <AlertTriangle className="h-3 w-3" />
              {permissivePoliciesCount} permissive (audit tables)
            </Badge>
          ) : (
            <Badge className="status-success gap-xs">
              <CheckCircle className="h-3 w-3" />
              All secured
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
