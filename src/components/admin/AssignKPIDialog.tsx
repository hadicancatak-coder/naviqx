import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useKPIs } from "@/hooks/useKPIs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { TeamKPI } from "@/types/kpi";
import { TEAMS } from "@/lib/constants";

interface AssignKPIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpi: TeamKPI | null;
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
  const [userCurrentWeight, setUserCurrentWeight] = useState(0);
  const { kpis } = useKPIs();

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  useEffect(() => {
    if (selectedUserId && kpis) {
      const userKPIs = kpis.filter(k => 
        k.assignments?.some(a => a.user_id === selectedUserId && a.status !== 'rejected')
      );
      const totalWeight = userKPIs.reduce((sum, k) => sum + k.weight, 0);
      setUserCurrentWeight(totalWeight);
    } else {
      setUserCurrentWeight(0);
    }
  }, [selectedUserId, kpis]);

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
                Assigning: <span className="font-medium">{kpi.name}</span> (Weight: {kpi.weight}%)
              </p>
              {assignmentType === "user" && selectedUserId && (
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline">Current Weight: {userCurrentWeight}%</Badge>
                  <Badge variant="outline">New Weight: {userCurrentWeight + kpi.weight}%</Badge>
                  <Badge variant={userCurrentWeight + kpi.weight > 100 ? "destructive" : "secondary"}>
                    Available: {100 - userCurrentWeight}%
                  </Badge>
                </div>
              )}
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
