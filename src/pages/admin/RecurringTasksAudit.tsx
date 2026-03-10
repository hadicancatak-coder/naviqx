import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw, Trash2, CheckCircle2, AlertTriangle, ShieldCheck, Repeat,
  Play, Zap, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { getRecurrenceLabelNew, parseLegacyRrule } from "@/lib/recurrenceUtils";

interface DuplicateGroup {
  template_task_id: string;
  occurrence_date: string;
  count: number;
  task_ids: string[];
  titles: string[];
}

interface TemplateHealth {
  id: string;
  title: string;
  next_run_at: string | null;
  occurrence_count: number | null;
  recurrence_rrule: string | null;
  instance_count: number;
}

interface HealthData {
  template_count: number;
  overdue_count: number;
  stuck_count: number;
  duplicate_count: number;
  constraint_exists: boolean;
  checked_at: string;
}

export default function RecurringTasksAudit() {
  const [cleaning, setCleaning] = useState(false);
  const [runningGenerator, setRunningGenerator] = useState(false);
  const [fixingStuck, setFixingStuck] = useState(false);
  const queryClient = useQueryClient();

  // Health RPC
  const {
    data: health,
    isLoading: healthLoading,
    refetch: refetchHealth,
  } = useQuery({
    queryKey: ["admin-recurring-health"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("check_recurring_system_health");
      if (error) throw error;
      return data as unknown as HealthData;
    },
    refetchInterval: 60_000,
  });

  // Fetch duplicate groups
  const {
    data: duplicates,
    isLoading: dupsLoading,
    refetch: refetchDups,
  } = useQuery({
    queryKey: ["admin-recurring-duplicates"],
    queryFn: async () => {
      const { data: rawDups, error: dupError } = await supabase
        .from("tasks")
        .select("id, title, template_task_id, occurrence_date, created_at")
        .not("template_task_id", "is", null)
        .not("occurrence_date", "is", null)
        .order("occurrence_date", { ascending: false });

      if (dupError) throw dupError;

      const groups = new Map<string, DuplicateGroup>();
      for (const row of rawDups || []) {
        const key = `${row.template_task_id}::${row.occurrence_date}`;
        if (!groups.has(key)) {
          groups.set(key, {
            template_task_id: row.template_task_id!,
            occurrence_date: row.occurrence_date!,
            count: 0,
            task_ids: [],
            titles: [],
          });
        }
        const g = groups.get(key)!;
        g.count++;
        g.task_ids.push(row.id);
        g.titles.push(row.title);
      }

      return Array.from(groups.values()).filter((g) => g.count > 1);
    },
  });

  // Fetch template health overview
  const {
    data: templates,
    isLoading: templatesLoading,
    refetch: refetchTemplates,
  } = useQuery({
    queryKey: ["admin-recurring-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, next_run_at, occurrence_count, recurrence_rrule")
        .eq("is_recurrence_template", true)
        .order("title");

      if (error) throw error;

      const results: TemplateHealth[] = [];
      for (const tmpl of data || []) {
        const { count: instanceCount } = await supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("template_task_id", tmpl.id);

        results.push({
          id: tmpl.id,
          title: tmpl.title,
          next_run_at: tmpl.next_run_at,
          occurrence_count: tmpl.occurrence_count as number | null,
          recurrence_rrule: typeof tmpl.recurrence_rrule === "string"
            ? tmpl.recurrence_rrule
            : tmpl.recurrence_rrule
              ? JSON.stringify(tmpl.recurrence_rrule)
              : null,
          instance_count: instanceCount ?? 0,
        });
      }

      return results;
    },
  });

  const handleCleanDuplicates = useCallback(async () => {
    if (!duplicates?.length) return;
    setCleaning(true);
    try {
      let deletedCount = 0;
      for (const group of duplicates) {
        const toDelete = group.task_ids.slice(1);
        const { error } = await supabase
          .from("tasks")
          .delete()
          .in("id", toDelete);

        if (error) {
          toast.error(`Failed to clean duplicates for ${group.titles[0]}`);
        } else {
          deletedCount += toDelete.length;
        }
      }
      toast.success(`Cleaned ${deletedCount} duplicate tasks`);
      refetchDups();
      refetchTemplates();
      refetchHealth();
    } catch {
      toast.error("Cleanup failed");
    } finally {
      setCleaning(false);
    }
  }, [duplicates, refetchDups, refetchTemplates, refetchHealth]);

  const handleRunGenerator = useCallback(async () => {
    setRunningGenerator(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-recurring-tasks");
      if (error) throw error;
      toast.success(`Generator ran: ${data?.created ?? 0} created, ${data?.skipped_duplicate ?? 0} deduped`);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      refetchHealth();
      refetchTemplates();
    } catch (err: unknown) {
      toast.error(`Generator failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunningGenerator(false);
    }
  }, [queryClient, refetchHealth, refetchTemplates]);

  const handleFixStuck = useCallback(async () => {
    setFixingStuck(true);
    try {
      const { data, error } = await supabase.rpc("force_advance_stuck_templates", {
        p_stuck_threshold_hours: 25,
      });
      if (error) throw error;
      const advanced = (data as unknown as { advanced: number })?.advanced ?? 0;
      toast.success(`Advanced ${advanced} stuck templates`);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      refetchHealth();
      refetchTemplates();
    } catch (err: unknown) {
      toast.error(`Fix stuck failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setFixingStuck(false);
    }
  }, [queryClient, refetchHealth, refetchTemplates]);

  const handleRefresh = () => {
    refetchDups();
    refetchTemplates();
    refetchHealth();
  };

  const totalDuplicates = health?.duplicate_count ?? duplicates?.reduce((sum, g) => sum + g.count - 1, 0) ?? 0;

  function getTemplateStatus(tmpl: TemplateHealth): { label: string; variant: string } {
    if (!tmpl.next_run_at) return { label: "Ended", variant: "neutral" };
    const nextRun = new Date(tmpl.next_run_at);
    const now = new Date();
    const hoursOverdue = (now.getTime() - nextRun.getTime()) / (1000 * 60 * 60);
    if (hoursOverdue > 25) return { label: "Stuck", variant: "destructive" };
    if (hoursOverdue > 2) return { label: "Overdue", variant: "warning" };
    return { label: "On schedule", variant: "success" };
  }

  function getScheduleLabel(rruleStr: string | null): string {
    if (!rruleStr) return "—";
    const rule = parseLegacyRrule(rruleStr);
    if (!rule) return "—";
    return getRecurrenceLabelNew(rule) || "—";
  }

  return (
    <div className="space-y-lg">
      {/* Overdue warning banner */}
      {health && health.overdue_count > 0 && (
        <div className="flex items-center gap-sm p-md rounded-lg bg-warning-soft border border-warning/30">
          <AlertTriangle className="h-5 w-5 text-warning-text shrink-0" />
          <p className="text-body-sm text-warning-text">
            <span className="font-semibold">{health.overdue_count} template{health.overdue_count > 1 ? "s" : ""}</span> overdue by 2+ hours.
            The generator may not be running, or templates are stuck.
          </p>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
        <Card className="p-card">
          <div className="flex items-center gap-sm">
            <div className={`p-sm rounded-lg ${health?.constraint_exists ? "bg-success-soft" : "bg-destructive-soft"}`}>
              <ShieldCheck className={`h-5 w-5 ${health?.constraint_exists ? "text-success-text" : "text-destructive-text"}`} />
            </div>
            <div>
              <p className="text-metadata text-muted-foreground">Unique Constraint</p>
              <p className="text-heading-sm font-semibold">
                {healthLoading ? "Checking..." : health?.constraint_exists ? "Active" : "Missing"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-card">
          <div className="flex items-center gap-sm">
            <div className={`p-sm rounded-lg ${totalDuplicates > 0 ? "bg-destructive-soft" : "bg-success-soft"}`}>
              <AlertTriangle className={`h-5 w-5 ${totalDuplicates > 0 ? "text-destructive-text" : "text-success-text"}`} />
            </div>
            <div>
              <p className="text-metadata text-muted-foreground">Duplicate Instances</p>
              <p className="text-heading-sm font-semibold">
                {healthLoading ? "..." : totalDuplicates}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-card">
          <div className="flex items-center gap-sm">
            <div className={`p-sm rounded-lg ${(health?.stuck_count ?? 0) > 0 ? "bg-destructive-soft" : "bg-success-soft"}`}>
              <Clock className={`h-5 w-5 ${(health?.stuck_count ?? 0) > 0 ? "text-destructive-text" : "text-success-text"}`} />
            </div>
            <div>
              <p className="text-metadata text-muted-foreground">Stuck Templates</p>
              <p className="text-heading-sm font-semibold">
                {healthLoading ? "..." : health?.stuck_count ?? 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-card">
          <div className="flex items-center gap-sm">
            <div className="p-sm rounded-lg bg-info-soft">
              <Repeat className="h-5 w-5 text-info-text" />
            </div>
            <div>
              <p className="text-metadata text-muted-foreground">Active Templates</p>
              <p className="text-heading-sm font-semibold">
                {healthLoading ? "..." : health?.template_count ?? 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-sm">
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-sm">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRunGenerator}
          disabled={runningGenerator}
          className="gap-sm"
        >
          <Play className="h-4 w-4" />
          {runningGenerator ? "Running..." : "Run Generator Now"}
        </Button>
        {(health?.stuck_count ?? 0) > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleFixStuck}
            disabled={fixingStuck}
            className="gap-sm"
          >
            <Zap className="h-4 w-4" />
            {fixingStuck ? "Fixing..." : `Fix ${health!.stuck_count} Stuck Templates`}
          </Button>
        )}
        {totalDuplicates > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCleanDuplicates}
            disabled={cleaning}
            className="gap-sm"
          >
            <Trash2 className="h-4 w-4" />
            {cleaning ? "Cleaning..." : `Clean ${totalDuplicates} Duplicates`}
          </Button>
        )}
        {totalDuplicates === 0 && !dupsLoading && !healthLoading && (
          <Badge className="status-success gap-xs">
            <CheckCircle2 className="h-3 w-3" />
            No duplicates found
          </Badge>
        )}
      </div>

      {/* Duplicates Table */}
      {(duplicates?.length ?? 0) > 0 && (
        <Card>
          <div className="p-card border-b border-border">
            <h3 className="text-heading-sm font-semibold text-destructive-text">
              Duplicate Instances ({duplicates!.length} groups)
            </h3>
            <p className="text-metadata text-muted-foreground mt-xs">
              Tasks sharing the same template + occurrence date. Only the oldest will be kept on cleanup.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task Title</TableHead>
                <TableHead>Occurrence Date</TableHead>
                <TableHead>Copies</TableHead>
                <TableHead>Template ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {duplicates!.map((group) => (
                <TableRow key={`${group.template_task_id}::${group.occurrence_date}`}>
                  <TableCell className="font-medium">{group.titles[0]}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {group.occurrence_date}
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive">{group.count}</Badge>
                  </TableCell>
                  <TableCell className="text-metadata text-muted-foreground font-mono">
                    {group.template_task_id.slice(0, 8)}…
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Template Health Table */}
      <Card>
        <div className="p-card border-b border-border">
          <h3 className="text-heading-sm font-semibold">Template Health</h3>
          <p className="text-metadata text-muted-foreground mt-xs">
            All recurring task templates and their instance counts.
          </p>
        </div>
        {templatesLoading ? (
          <div className="p-card text-muted-foreground text-body-sm">Loading templates...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Instances</TableHead>
                <TableHead>Occurrences</TableHead>
                <TableHead>Next Run</TableHead>
                <TableHead>Schedule</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates?.map((tmpl) => {
                const status = getTemplateStatus(tmpl);
                const scheduleLabel = getScheduleLabel(tmpl.recurrence_rrule);

                return (
                  <TableRow key={tmpl.id}>
                    <TableCell className="font-medium">{tmpl.title}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          status.variant === "success" ? "status-success" :
                          status.variant === "warning" ? "status-warning" :
                          status.variant === "destructive" ? "status-destructive" :
                          "status-neutral"
                        }
                      >
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{tmpl.instance_count}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {tmpl.occurrence_count ?? 0}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-metadata">
                      {tmpl.next_run_at
                        ? format(new Date(tmpl.next_run_at), "MMM d, yyyy")
                        : "Not scheduled"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-metadata">
                        {scheduleLabel}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
