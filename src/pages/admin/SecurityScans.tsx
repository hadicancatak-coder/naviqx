import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { logger } from "@/lib/logger";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SecurityScan {
  id: string;
  scan_type: string;
  scan_status: string;
  findings: any;
  summary: any;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

interface SuspiciousActivity {
  id: string;
  user_id: string;
  activity_type: string;
  severity: string;
  details: any;
  resolved: boolean;
  created_at: string;
}

export default function SecurityScans() {
  const [scans, setScans] = useState<SecurityScan[]>([]);
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningManualScan, setRunningManualScan] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch recent scans
      const { data: scansData, error: scansError } = await supabase
        .from('security_scan_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (scansError) throw scansError;
      setScans((scansData as any) || []);

      // Fetch unresolved suspicious activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('suspicious_activities')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (activitiesError) throw activitiesError;
      setSuspiciousActivities(activitiesData || []);
    } catch (error: any) {
      logger.error('Error fetching security data:', error);
      toast({
        title: "Error",
        description: "Failed to load security data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runManualScan = async () => {
    setRunningManualScan(true);
    try {
      const { data, error } = await supabase.functions.invoke('security-scanner');
      
      if (error) throw error;

      toast({
        title: "Security scan completed",
        description: `Found ${data.summary.total_findings} findings`,
      });

      fetchData();
    } catch (error: any) {
      logger.error('Error running manual scan:', error);
      toast({
        title: "Scan failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRunningManualScan(false);
    }
  };

  const resolveSuspiciousActivity = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('suspicious_activities')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', activityId);

      if (error) throw error;

      toast({
        title: "Activity resolved",
        description: "Suspicious activity marked as resolved",
      });

      fetchData();
    } catch (error: any) {
      logger.error('Error resolving activity:', error);
      toast({
        title: "Error",
        description: "Failed to resolve activity",
        variant: "destructive",
      });
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: any = {
      critical: "destructive",
      high: "destructive",
      medium: "default",
      low: "secondary",
    };
    return <Badge variant={variants[severity] || "default"}>{severity}</Badge>;
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === 'critical' || severity === 'high') {
      return <XCircle className="h-5 w-5 text-destructive" />;
    } else if (severity === 'medium') {
      return <AlertTriangle className="h-5 w-5 text-warning" />;
    }
    return <CheckCircle className="h-5 w-5 text-success" />;
  };

  if (loading) {
    return (
      <div className="p-lg">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const latestScan = scans[0];

  return (
    <div className="p-lg space-y-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-lg font-bold text-foreground">Security Monitoring</h1>
          <p className="text-muted-foreground mt-1">
            Automated security scanning and suspicious activity tracking
          </p>
        </div>
        <Button onClick={runManualScan} disabled={runningManualScan}>
          {runningManualScan ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 mr-2" />
              Run Manual Scan
            </>
          )}
        </Button>
      </div>

      {/* Latest Scan Summary */}
      {latestScan && (
        <div className="grid gap-md md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Findings</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-heading-lg font-bold">{latestScan.summary?.total_findings || 0}</div>
              <p className="text-xs text-muted-foreground">
                Last scan: {formatDistanceToNow(new Date(latestScan.created_at), { addSuffix: true })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-heading-lg font-bold text-destructive">
                {latestScan.summary?.by_severity?.critical || 0}
              </div>
              <p className="text-xs text-muted-foreground">High priority issues</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Medium/High</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-heading-lg font-bold text-yellow-600">
                {(latestScan.summary?.by_severity?.high || 0) + (latestScan.summary?.by_severity?.medium || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Needs attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unresolved Activities</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-heading-lg font-bold">{suspiciousActivities.length}</div>
              <p className="text-xs text-muted-foreground">Suspicious activities</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="findings" className="space-y-md">
        <TabsList>
          <TabsTrigger value="findings">Security Findings</TabsTrigger>
          <TabsTrigger value="suspicious">Suspicious Activities</TabsTrigger>
          <TabsTrigger value="history">Scan History</TabsTrigger>
        </TabsList>

        <TabsContent value="findings" className="space-y-md">
          <Card>
            <CardHeader>
              <CardTitle>Latest Scan Findings</CardTitle>
              <CardDescription>
                Security issues detected in the most recent scan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {latestScan?.findings && latestScan.findings.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-md">
                    {latestScan.findings.map((finding: any, index: number) => (
                      <div key={index} className="border rounded-lg p-md">
                        <div className="flex items-start justify-between mb-sm">
                          <div className="flex items-center gap-sm">
                            {getSeverityIcon(finding.severity)}
                            <h3 className="font-semibold">{finding.type.replace(/_/g, ' ').toUpperCase()}</h3>
                          </div>
                          {getSeverityBadge(finding.severity)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{finding.description}</p>
                        {finding.count && (
                          <p className="text-sm font-medium">Count: {finding.count}</p>
                        )}
                        {finding.details && (
                          <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto">
                            {JSON.stringify(finding.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-success" />
                  <p>No security findings in the latest scan</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suspicious" className="space-y-md">
          <Card>
            <CardHeader>
              <CardTitle>Suspicious Activities</CardTitle>
              <CardDescription>
                Unresolved suspicious activities requiring review
              </CardDescription>
            </CardHeader>
            <CardContent>
              {suspiciousActivities.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suspiciousActivities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="font-medium">
                          {activity.activity_type.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell>{getSeverityBadge(activity.severity)}</TableCell>
                        <TableCell className="max-w-md">
                          <pre className="text-xs overflow-auto">
                            {JSON.stringify(activity.details, null, 2)}
                          </pre>
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveSuspiciousActivity(activity.id)}
                          >
                            Resolve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-success" />
                  <p>No unresolved suspicious activities</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-md">
          <Card>
            <CardHeader>
              <CardTitle>Scan History</CardTitle>
              <CardDescription>
                Previous security scans and their results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scan Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Findings</TableHead>
                    <TableHead>Critical</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scans.map((scan) => (
                    <TableRow key={scan.id}>
                      <TableCell>
                        {formatDistanceToNow(new Date(scan.started_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={scan.scan_status === 'completed' ? 'default' : 'secondary'}>
                          {scan.scan_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{scan.summary?.total_findings || 0}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-destructive">
                          {scan.summary?.by_severity?.critical || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        {scan.summary?.scan_duration_ms 
                          ? `${(scan.summary.scan_duration_ms / 1000).toFixed(2)}s`
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
