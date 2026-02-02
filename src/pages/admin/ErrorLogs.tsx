import { useEffect, useState, useCallback } from "react";
import { errorLogger, type ErrorFilters } from "@/lib/errorLogger";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logger } from "@/lib/logger";

interface ErrorLog {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  error_type: string;
  error_message: string;
  stack_trace: string | null;
  resolved: boolean;
  created_at: string;
  profiles: {
    name: string;
    email: string;
  } | null;
}

export default function ErrorLogs() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [resolvedFilter, setResolvedFilter] = useState<string>("unresolved");
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [clearing, setClearing] = useState(false);

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    try {
      const filters: ErrorFilters = {};
      
      if (severityFilter !== 'all') filters.severity = severityFilter as ErrorFilters['severity'];
      if (typeFilter !== 'all') filters.type = typeFilter as ErrorFilters['type'];
      if (resolvedFilter === 'resolved') filters.resolved = true;
      if (resolvedFilter === 'unresolved') filters.resolved = false;

      const data = await errorLogger.getErrors(filters);
      setErrors(data as ErrorLog[]);
    } catch (error) {
      logger.error('Error fetching error logs:', error);
      toast.error('Failed to fetch error logs');
    } finally {
      setLoading(false);
    }
  }, [severityFilter, typeFilter, resolvedFilter]);

  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  const handleResolve = async (errorId: string) => {
    try {
      const success = await errorLogger.resolveError(errorId);
      if (success) {
        toast.success('Error marked as resolved');
        fetchErrors();
      } else {
        toast.error('Failed to resolve error');
      }
    } catch (error) {
      toast.error('Failed to resolve error');
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
      critical: 'destructive',
      warning: 'default',
      info: 'secondary',
    };
    return <Badge variant={variants[severity] || 'default'}>{severity}</Badge>;
  };

  const [timeRange, setTimeRange] = useState<string>("all");

  const handleClearHistorical = async () => {
    const confirmed = window.confirm(
      'This will mark all errors from before today as resolved. Continue?'
    );
    if (!confirmed) return;
    
    setClearing(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const result = await errorLogger.bulkResolveErrors(today);
      if (result.success) {
        toast.success(`Resolved ${result.count} historical errors`);
        fetchErrors();
      } else {
        toast.error('Failed to clear historical errors');
      }
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-lg">
      <div className="flex items-center gap-md flex-wrap pb-md border-b border-border">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Time Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severityFilter || "all"} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter || "all"} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="database">Database</SelectItem>
            <SelectItem value="auth">Auth</SelectItem>
            <SelectItem value="api">API</SelectItem>
            <SelectItem value="edge_function">Edge Function</SelectItem>
            <SelectItem value="frontend">Frontend</SelectItem>
          </SelectContent>
        </Select>

        <Select value={resolvedFilter || "unresolved"} onValueChange={setResolvedFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unresolved">Unresolved</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={fetchErrors} variant="outline">
          Refresh
        </Button>
        <Button 
          onClick={handleClearHistorical} 
          variant="outline"
          disabled={clearing}
        >
          {clearing ? 'Clearing...' : 'Clear Historical'}
        </Button>
      </div>

      <div>
        <h2 className="text-section-title mb-lg">Error Logs ({errors.length})</h2>
        <div className="bg-card border border-border rounded">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : errors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">No errors found</TableCell>
                </TableRow>
              ) : (
                errors.map((error) => (
                  <TableRow key={error.id}>
                    <TableCell>
                      <div className="flex items-center gap-sm">
                        {getSeverityIcon(error.severity)}
                        {getSeverityBadge(error.severity)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{error.error_type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      <button
                        onClick={() => setSelectedError(error)}
                        className="text-left hover:underline"
                      >
                        {error.error_message}
                      </button>
                    </TableCell>
                    <TableCell>
                      {error.profiles ? error.profiles.name : 'System'}
                    </TableCell>
                    <TableCell className="text-body-sm text-muted-foreground">
                      {format(new Date(error.created_at), 'MMM dd, HH:mm')}
                    </TableCell>
                    <TableCell>
                      {error.resolved ? (
                        <Badge variant="secondary" className="flex items-center gap-xs w-fit">
                          <CheckCircle2 className="h-3 w-3" />
                          Resolved
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="w-fit">Unresolved</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!error.resolved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolve(error.id)}
                        >
                          Resolve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Error Details</DialogTitle>
          </DialogHeader>
          {selectedError && (
            <div className="space-y-md">
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <p className="text-body-sm font-medium text-muted-foreground">Severity</p>
                  <div className="mt-xs">{getSeverityBadge(selectedError.severity)}</div>
                </div>
                <div>
                  <p className="text-body-sm font-medium text-muted-foreground">Type</p>
                  <Badge variant="outline" className="mt-xs">{selectedError.error_type}</Badge>
                </div>
              </div>
              
              <div>
                <p className="text-body-sm font-medium text-muted-foreground mb-sm">Error Message</p>
                <p className="text-body-sm bg-muted p-sm rounded-md">{selectedError.error_message}</p>
              </div>

              {selectedError.stack_trace && (
                <div>
                  <p className="text-body-sm font-medium text-muted-foreground mb-sm">Stack Trace</p>
                  <ScrollArea className="h-[300px] w-full rounded-md border">
                    <pre className="text-metadata p-md bg-muted">{selectedError.stack_trace}</pre>
                  </ScrollArea>
                </div>
              )}

              <div className="flex justify-end gap-sm">
                <Button variant="outline" onClick={() => setSelectedError(null)}>
                  Close
                </Button>
                {!selectedError.resolved && (
                  <Button onClick={() => {
                    handleResolve(selectedError.id);
                    setSelectedError(null);
                  }}>
                    Mark as Resolved
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
