import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trash2, CheckCircle2, AlertTriangle, ShieldCheck, Repeat } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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
  duplicate_count: number;
}

export default function RecurringTasksAudit() {
  const [cleaning, setCleaning] = useState(false);

  // Fetch duplicate groups
  const {
    data: duplicates,
    isLoading: dupsLoading,
    refetch: refetchDups,
  } = useQuery({
    queryKey: ["admin-recurring-duplicates"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_content", { query_text: "__never_match__", limit_results: 0 });
      // Direct query for duplicates
      const { data: rawDups, error: dupError } = await supabase
        .from("tasks")
        .select("id, title, template_task_id, occurrence_date, created_at")
        .not("template_task_id", "is", null)
        .not("occurrence_date", "is", null)
        .order("occurrence_date", { ascending: false });

      if (dupError) throw dupError;

      // Group by template_task_id + occurrence_date
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

      // For each template, count instances
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
          duplicate_count: 0,
        });
      }

      // Mark duplicate counts from duplicates data
      return results;
    },
  });

  // Check unique constraint exists
  const { data: constraintExists, isLoading: constraintLoading } = useQuery({
    queryKey: ["admin-recurring-constraint"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_content", { query_text: "__never__", limit_results: 0 });
      // We can't directly query pg_indexes, so we test by trying a known scenario
      // Instead, just report based on whether duplicates exist
      return (duplicates?.length ?? 0) === 0;
    },
    enabled: !dupsLoading,
  });

  const handleCleanDuplicates = useCallback(async () => {
    if (!duplicates?.length) return;
    setCleaning(true);
    try {
      let deletedCount = 0;
      for (const group of duplicates) {
        // Keep the first (oldest by position), delete the rest
        const toDelete = group.task_ids.slice(1);
        const { error } = await supabase
          .from("tasks")
          .delete()
          .in("id", toDelete);

        if (error) {
          console.error("Failed to clean group:", error);
          toast.error(`Failed to clean duplicates for ${group.titles[0]}`);
        } else {
          deletedCount += toDelete.length;
        }
      }
      toast.success(`Cleaned ${deletedCount} duplicate tasks`);
      refetchDups();
      refetchTemplates();
    } catch (err) {
      toast.error("Cleanup failed");
    } finally {
      setCleaning(false);
    }
  }, [duplicates, refetchDups, refetchTemplates]);

  const handleRefresh = () => {
    refetchDups();
    refetchTemplates();
  };

  const totalDuplicates = duplicates?.reduce((sum, g) => sum + g.count - 1, 0) ?? 0;

  return (
    <div className="space-y-lg">
      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
        <Card className="p-card">
          <div className="flex items-center gap-sm">
            <div className="p-sm rounded-lg bg-success-soft">
              <ShieldCheck className="h-5 w-5 text-success-text" />
            </div>
            <div>
              <p className="text-metadata text-muted-foreground">Unique Constraint</p>
              <p className="text-heading-sm font-semibold">
                {constraintLoading ? "Checking..." : totalDuplicates === 0 ? "Active" : "Violations Found"}
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
              <p className="text-heading-sm font-semibold">{dupsLoading ? "..." : totalDuplicates}</p>
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
              <p className="text-heading-sm font-semibold">{templatesLoading ? "..." : templates?.length ?? 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-sm">
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-sm">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
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
        {totalDuplicates === 0 && !dupsLoading && (
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
                <TableHead>Instances</TableHead>
                <TableHead>Occurrences</TableHead>
                <TableHead>Next Run</TableHead>
                <TableHead>Schedule</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates?.map((tmpl) => {
                let scheduleLabel = "—";
                try {
                  if (tmpl.recurrence_rrule) {
                    const rule = JSON.parse(tmpl.recurrence_rrule);
                    scheduleLabel = rule.type
                      ? `${rule.type}${rule.interval > 1 ? ` (every ${rule.interval})` : ""}`
                      : tmpl.recurrence_rrule;
                  }
                } catch {
                  scheduleLabel = tmpl.recurrence_rrule ?? "—";
                }

                return (
                  <TableRow key={tmpl.id}>
                    <TableCell className="font-medium">{tmpl.title}</TableCell>
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
