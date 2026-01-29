import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Users, Edit, Trash2, Target, Calendar } from "lucide-react";
import { useKPIs } from "@/hooks/useKPIs";
import { CreateKPIDialog } from "@/components/admin/CreateKPIDialog";
import { AssignKPIDialog } from "@/components/admin/AssignKPIDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LoadingState } from "@/components/layout/LoadingState";
import type { KPIWithRelations } from "@/types/kpi";
import { format } from "date-fns";
export default function KPIsManagement() {
  const { kpis, isLoading, deleteKPI } = useKPIs();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editingKPI, setEditingKPI] = useState<KPIWithRelations | null>(null);
  const [assigningKPI, setAssigningKPI] = useState<KPIWithRelations | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingKPIId, setDeletingKPIId] = useState<string | null>(null);

  const handleEdit = (kpi: KPIWithRelations) => {
    setEditingKPI(kpi);
    setCreateDialogOpen(true);
  };

  const handleAssign = (kpi: KPIWithRelations) => {
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

  if (isLoading) {
    return <LoadingState variant="section" minHeight="min-h-[300px]" />;
  }

  return (
    <div className="space-y-lg">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-section-title">KPI Management</h2>
          <p className="text-body text-muted-foreground mt-xs">
            Create, assign, and track team KPIs
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-sm" />
          Create KPI
        </Button>
      </div>

      <Card>
        {/* eslint-disable-next-line no-restricted-syntax */}
        <CardContent className="!p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Metric Type</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Targets</TableHead>
                <TableHead>Assignments</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-xl text-muted-foreground">
                    No KPIs created yet. Click "Create KPI" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                kpis.map((kpi) => (
                  <TableRow key={kpi.id}>
                    <TableCell className="font-medium">{kpi.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{kpi.metric_type}</Badge>
                    </TableCell>
                    <TableCell>{kpi.target}</TableCell>
                    <TableCell>
                      {kpi.deadline ? (
                        <div className="flex items-center gap-xs text-body-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(kpi.deadline), 'MMM d, yyyy')}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-xs">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span className="text-body-sm">{kpi.targets?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-xs">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-body-sm">{kpi.assignments?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-xs">
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