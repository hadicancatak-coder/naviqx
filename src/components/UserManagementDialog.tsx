import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { workingDaysSchema, userRoleSchema } from "@/lib/validationSchemas";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserManagementDialog({ open, onOpenChange }: UserManagementDialogProps) {
  const { toast } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open]);

  const fetchMembers = async () => {
    setLoading(true);
    
    // Use admin-only RPC function to get all user profiles with email
    const { data: profiles, error } = await supabase.rpc('get_all_users_admin');
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users. Admin access required.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Fetch all user roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    // Build member list with roles
    const memberList = (profiles || []).map(profile => {
      const userRole = roles?.find(r => r.user_id === profile.user_id)?.role || 'member';
      return {
        ...profile,
        role: userRole,
      };
    });

    setMembers(memberList);
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: "admin" | "member") => {
    try {
      // Validate role with zod
      userRoleSchema.parse(newRole);
      
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Role Updated",
        description: `User role has been updated to ${newRole}`,
      });

      await fetchMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error instanceof z.ZodError ? error.errors[0].message : error.message,
        variant: "destructive",
      });
    }
  };

  const handleWorkingDaysChange = async (userId: string, workingDays: string) => {
    try {
      // Validate working days with zod
      workingDaysSchema.parse(workingDays);
      
      const { data, error } = await supabase
        .from("profiles")
        .update({ working_days: workingDays })
        .eq("user_id", userId)
        .select();

      if (error) throw error;

      toast({
        title: "Working Days Updated",
        description: `Working days set to ${workingDays === 'mon-fri' ? 'Mon-Fri' : 'Sun-Thu'}`,
      });

      await fetchMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error instanceof z.ZodError ? error.errors[0].message : error.message,
        variant: "destructive",
      });
    }
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      // Get the current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      // Call the secure Edge Function to delete user
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: memberToRemove },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Member Removed",
        description: "User has been removed successfully",
      });

      setMemberToRemove(null);
      setRemoveDialogOpen(false);
      await fetchMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading users...</div>
          ) : members.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No users found</div>
          ) : (
            <div className="space-y-md">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-md border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-sm flex-1">
                    <Avatar>
                      <AvatarImage src={member.avatar_url || ""} />
                      <AvatarFallback>{member.name?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{member.name}</h4>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                      {member.username && (
                        <p className="text-xs text-muted-foreground">@{member.username}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        member.role === "admin"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {member.role}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-xs ml-md">
                    <Select
                      value={member.working_days || 'mon-fri'}
                      onValueChange={(value) =>
                        handleWorkingDaysChange(member.user_id, value)
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mon-fri">Mon-Fri</SelectItem>
                        <SelectItem value="sun-thu">Sun-Thu</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={member.role}
                      onValueChange={(value) =>
                        handleRoleChange(member.user_id, value as "admin" | "member")
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setMemberToRemove(member.user_id);
                        setRemoveDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member? This will permanently delete their
              account and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
