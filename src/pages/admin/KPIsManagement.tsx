import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Users, Edit, Trash2, Target } from "lucide-react";
import { useKPIs } from "@/hooks/useKPIs";
import { CreateKPIDialog } from "@/components/admin/CreateKPIDialog";
import { AssignKPIDialog } from "@/components/admin/AssignKPIDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { TeamKPI } from "@/types/kpi";

export default function KPIsManagement() {
  const { kpis, isLoading, deleteKPI } = useKPIs();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editingKPI, setEditingKPI] = useState<TeamKPI | null>(null);
  const [assigningKPI, setAssigningKPI] = useState<TeamKPI | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingKPIId, setDeletingKPIId] = useState<string | null>(null);

  const handleEdit = (kpi: TeamKPI) => {
    setEditingKPI(kpi);
    setCreateDialogOpen(true);
  };

  const handleAssign = (kpi: TeamKPI) => {
    setAssigningKPI(kpi);
    setAssignDialogOpen(true);
  };

  const handleDelete = (kpiId: string) => {
    setDeletingKPIId(kpiId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingKPIId) {
      deleteKPI.mutate(deletingKPIId);
      setDeleteDialogOpen(false);
      setDeletingKPIId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "status-neutral",
      pending_approval: "status-warning",
      active: "status-success",
      completed: "status-info",
      archived: "status-neutral",
    };
    return <Badge className={colors[status] || "status-neutral"}>{status.replace('_', ' ')}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-md">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-section-title">KPI Management</h2>
          <p className="text-body text-muted-foreground mt-1">
            Create, assign, and track team KPIs
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create KPI
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Targets</TableHead>
                <TableHead>Assignments</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No KPIs created yet. Click "Create KPI" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                kpis.map((kpi) => (
                  <TableRow key={kpi.id}>
                    <TableCell className="font-medium">{kpi.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{kpi.type}</Badge>
                    </TableCell>
                    <TableCell>{kpi.period}</TableCell>
                    <TableCell>{kpi.weight}%</TableCell>
                    <TableCell>{getStatusBadge(kpi.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{kpi.targets?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{kpi.assignments?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAssign(kpi)}
                          title="Assign to users"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(kpi)}
                          title="Edit KPI"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(kpi.id)}
                          title="Delete KPI"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateKPIDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setEditingKPI(null);
        }}
        editingKPI={editingKPI}
      />

      <AssignKPIDialog
        open={assignDialogOpen}
        onOpenChange={(open) => {
          setAssignDialogOpen(open);
          if (!open) setAssigningKPI(null);
        }}
        kpi={assigningKPI}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete KPI</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this KPI? This action cannot be undone and will remove all assignments and targets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
