import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, RefreshCw } from "lucide-react";
import { logger } from "@/lib/logger";
import { SecurityPosture } from "./SecurityPosture";
import { SecurityFindings, type Finding } from "./SecurityFindings";
import { SuspiciousActivityList, type SuspiciousActivity } from "./SuspiciousActivityList";
import { SecurityControls } from "./SecurityControls";

interface SecurityScan {
  id: string;
  scan_type: string;
  scan_status: string;
  findings: Array<{
    type: string;
    severity: string;
    description: string;
    count?: number;
    details?: Record<string, unknown>;
  }>;
  summary: {
    total_findings: number;
    by_severity?: {
      critical?: number;
      high?: number;
      medium?: number;
      low?: number;
    };
  };
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export function SecurityDashboard() {
  const [latestScan, setLatestScan] = useState<SecurityScan | null>(null);
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningManualScan, setRunningManualScan] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch latest scan
      const { data: scansData, error: scansError } = await supabase
        .from("security_scan_results")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

      if (scansError) throw scansError;
      setLatestScan((scansData?.[0] as unknown as SecurityScan) || null);

      // Fetch unresolved suspicious activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from("suspicious_activities")
        .select("*")
        .eq("resolved", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (activitiesError) throw activitiesError;
      setSuspiciousActivities((activitiesData as unknown as SuspiciousActivity[]) || []);
    } catch (error: unknown) {
      logger.error("Error fetching security data:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load security data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const runManualScan = async () => {
    setRunningManualScan(true);
    try {
      const { data, error } = await supabase.functions.invoke("security-scanner");

      if (error) throw error;

      toast({
        title: "Security scan completed",
        description: `Found ${data.summary.total_findings} findings`,
      });

      fetchData();
    } catch (error: unknown) {
      logger.error("Error running manual scan:", error);
      toast({
        title: "Scan failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setRunningManualScan(false);
    }
  };

  const cleanupExpiredSessions = async () => {
    try {
      const { error } = await supabase
        .from("mfa_sessions")
        .delete()
        .lt("expires_at", new Date().toISOString());

      if (error) throw error;

      toast({
        title: "Cleanup complete",
        description: "Running fresh security scan...",
      });

      // Run a new scan to refresh findings with current data
      await runManualScan();
    } catch (error: unknown) {
      logger.error("Error cleaning up sessions:", error);
      toast({
        title: "Cleanup failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const resolveSuspiciousActivity = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from("suspicious_activities")
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", activityId);

      if (error) throw error;

      toast({
        title: "Activity resolved",
        description: "Suspicious activity marked as resolved",
      });

      fetchData();
    } catch (error: unknown) {
      logger.error("Error resolving activity:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to resolve activity",
        variant: "destructive",
      });
    }
  };

  // Calculate security score based on findings
  const calculateSecurityScore = (): number => {
    if (!latestScan) return 100;
    
    const { by_severity } = latestScan.summary;
    if (!by_severity) return 100;
    
    let score = 100;
    score -= (by_severity.critical || 0) * 25;
    score -= (by_severity.high || 0) * 15;
    score -= (by_severity.medium || 0) * 5;
    score -= (by_severity.low || 0) * 2;
    score -= suspiciousActivities.length * 3;
    
    return Math.max(0, Math.min(100, score));
  };

  // Transform scan findings to UI format
  const transformFindings = (): Finding[] => {
    if (!latestScan?.findings) return [];
    
    return latestScan.findings.map((f, idx) => ({
      id: `${latestScan.id}-${idx}`,
      type: f.type,
      severity: f.severity as Finding["severity"],
      title: f.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      description: f.description,
      details: f.details ? JSON.stringify(f.details, null, 2) : undefined,
      source: "scanner" as const,
      fixUrl: "https://supabase.com/docs/guides/database/database-linter",
      onCleanup: f.type === "expired_mfa_sessions" || f.type === "stale_mfa_sessions" 
        ? cleanupExpiredSessions 
        : undefined,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const securityScore = calculateSecurityScore();
  const criticalIssues = latestScan?.summary?.by_severity?.critical || 0;
  const lastScanAt = latestScan ? new Date(latestScan.created_at) : null;

  return (
    <div className="space-y-lg">
      {/* Header with Run Scan button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-heading-md font-semibold">Security Dashboard</h2>
          <p className="text-muted-foreground mt-xs">
            Monitor security posture and respond to threats
          </p>
        </div>
        <Button onClick={runManualScan} disabled={runningManualScan}>
          {runningManualScan ? (
            <>
              <RefreshCw className="h-4 w-4 mr-sm animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 mr-sm" />
              Run Scan
            </>
          )}
        </Button>
      </div>

      {/* Security Posture Overview */}
      <SecurityPosture
        securityScore={securityScore}
        criticalIssues={criticalIssues}
        lastScanAt={lastScanAt}
        unresolvedActivities={suspiciousActivities.length}
      />

      {/* Main Content Grid */}
      <div className="grid gap-lg lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-lg">
          {/* Security Findings */}
          <SecurityFindings findings={transformFindings()} />

          {/* Suspicious Activities */}
          <SuspiciousActivityList
            activities={suspiciousActivities}
            onResolve={resolveSuspiciousActivity}
            loading={loading}
          />
        </div>

        {/* Sidebar with Security Controls */}
        <div className="space-y-lg">
          <SecurityControls
            mfaEnforced={true}
            emailDomainRestriction="@cfi.trade"
            permissivePoliciesCount={18}
          />
        </div>
      </div>
    </div>
  );
}
