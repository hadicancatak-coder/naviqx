import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useKPIs } from "@/hooks/useKPIs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { KPIWithRelations } from "@/types/kpi";
import { TEAMS } from "@/lib/constants";

interface AssignKPIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpi: KPIWithRelations | null;
}

interface UserProfile {
  id: string;
  name: string;
  user_id: string;
}

export function AssignKPIDialog({ open, onOpenChange, kpi }: AssignKPIDialogProps) {
  const { assignKPI } = useKPIs();
  const { user } = useAuth();
  const [assignmentType, setAssignmentType] = useState<"user" | "team">("user");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [notes, setNotes] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, user_id")
      .order("name");

    if (!error && data) {
      setUsers(data);
    }
  };

  const resetForm = () => {
    setAssignmentType("user");
    setSelectedUserId("");
    setSelectedTeam("");
    setNotes("");
  };

  const handleSubmit = () => {
    if (!kpi || !user) return;

    const assignment = {
      kpi_id: kpi.id,
      user_id: assignmentType === "user" ? selectedUserId : null,
      team_name: assignmentType === "team" ? selectedTeam : null,
      assigned_by: user.id,
      status: "pending" as const,
      notes: notes || null,
    };

    assignKPI.mutate(assignment, {
      onSuccess: () => {
        onOpenChange(false);
        resetForm();
      },
    });
  };

  const isValid = assignmentType === "user" ? !!selectedUserId : !!selectedTeam;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign KPI</DialogTitle>
          {kpi && (
            <div className="space-y-2 mt-2">
              <p className="text-sm text-muted-foreground">
                Assigning: <span className="font-medium">{kpi.title}</span> (Target: {kpi.target})
              </p>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-md">
          <div className="space-y-2">
            <Label>Assignment Type</Label>
            <Select
              value={assignmentType}
              onValueChange={(v) => setAssignmentType(v as "user" | "team")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Individual User</SelectItem>
                <SelectItem value="team">Team</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {assignmentType === "user" ? (
            <div className="space-y-2">
              <Label>Select User *</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.user_id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Select Team *</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team" />
                </SelectTrigger>
                <SelectContent>
                  {TEAMS.map((team) => (
                    <SelectItem key={team} value={team}>
                      {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any instructions or context..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={assignKPI.isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || assignKPI.isPending}
          >
            {assignKPI.isPending ? "Assigning..." : "Assign KPI"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}