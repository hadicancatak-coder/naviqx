import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Search, Target, Activity, Shield, ShieldOff, RotateCcw, KeyRound, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { adminService } from "@/lib/adminService";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TeamsMultiSelect } from "@/components/admin/TeamsMultiSelect";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface User {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  title: string | null;
  working_days: string | null;
  teams: string[] | null;
  role?: string;
  kpisAssigned?: number;
  mfa_enabled?: boolean;
  lastActivity?: {
    action: string;
    time: string;
  } | null;
}

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mfaResetDialogOpen, setMfaResetDialogOpen] = useState(false);
  const [mfaResetUser, setMfaResetUser] = useState<User | null>(null);
  const [passwordResetDialogOpen, setPasswordResetDialogOpen] = useState(false);
  const [passwordResetUser, setPasswordResetUser] = useState<User | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [resetLinkCopied, setResetLinkCopied] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles with MFA status
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*, mfa_enabled')
        .order('name');

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch KPI assignments to count per user
      const { data: kpiAssignments } = await supabase
        .from('kpi_assignments')
        .select('user_id');

      // Fetch recent activity for each user from admin_audit_log
      const { data: activities } = await supabase
        .from('admin_audit_log')
        .select('target_user_id, action, created_at')
        .order('created_at', { ascending: false });

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      // Count KPI assignments per user (user_id in kpi_assignments is profile.id, not auth user_id)
      const kpiCountMap = new Map<string, number>();
      kpiAssignments?.forEach(a => {
        if (a.user_id) {
          kpiCountMap.set(a.user_id, (kpiCountMap.get(a.user_id) || 0) + 1);
        }
      });

      // Get most recent activity per user
      const activityMap = new Map<string, { action: string; time: string }>();
      activities?.forEach(a => {
        if (a.target_user_id && !activityMap.has(a.target_user_id)) {
          activityMap.set(a.target_user_id, {
            action: a.action,
            time: a.created_at || '',
          });
        }
      });

      const usersWithData = profiles?.map(profile => ({
        ...profile,
        role: roleMap.get(profile.user_id) || 'member',
        kpisAssigned: kpiCountMap.get(profile.id) || 0,
        mfa_enabled: profile.mfa_enabled || false,
        lastActivity: activityMap.get(profile.user_id) || null,
      })) || [];

      setUsers(usersWithData);
    } catch (error: any) {
      toast.error('Failed to fetch users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole as 'admin' | 'member' })
        .eq('user_id', userId);

      if (error) throw error;

      await adminService.auditAdminAction({
        action: 'role_change',
        targetUserId: userId,
        changes: { role: newRole },
      });

      toast.success('Role updated successfully');
      fetchUsers();
    } catch (error: any) {
      toast.error('Failed to update role: ' + error.message);
    }
  };

  const handleTeamsChange = async (userId: string, teams: string[]) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ teams: teams as any })
        .eq('user_id', userId);

      if (error) throw error;

      await adminService.auditAdminAction({
        action: 'teams_change',
        targetUserId: userId,
        changes: { teams },
      });

      toast.success('Teams updated successfully');
      fetchUsers();
    } catch (error: any) {
      toast.error('Failed to update teams: ' + error.message);
    }
  };

  const handleWorkingDaysChange = async (userId: string, workingDays: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ working_days: workingDays })
        .eq('user_id', userId);

      if (error) throw error;

      await adminService.auditAdminAction({
        action: 'working_days_change',
        targetUserId: userId,
        changes: { working_days: workingDays },
      });

      toast.success('Working days updated');
      fetchUsers();
    } catch (error: any) {
      toast.error('Failed to update working days: ' + error.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (error) throw error;

      await adminService.auditAdminAction({
        action: 'user_delete',
        targetUserId: userId,
      });

      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error: any) {
      toast.error('Failed to delete user: ' + error.message);
    }
  };

  const handleResetMfa = async () => {
    if (!mfaResetUser) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-mfa', {
        body: { targetUserId: mfaResetUser.user_id },
      });

      if (error) throw error;

      toast.success(`MFA reset for ${mfaResetUser.name}. They will need to set up MFA again.`);
      setMfaResetDialogOpen(false);
      setMfaResetUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error('Failed to reset MFA: ' + error.message);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordResetUser) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { 
          targetUserId: passwordResetUser.user_id,
          targetEmail: passwordResetUser.email 
        },
      });

      if (error) throw error;

      if (data?.resetLink) {
        setResetLink(data.resetLink);
        toast.success(`Password reset link generated for ${passwordResetUser.name}`);
      } else {
        toast.success(`Password reset email sent to ${passwordResetUser.email}`);
        setPasswordResetDialogOpen(false);
        setPasswordResetUser(null);
      }
    } catch (error: any) {
      toast.error('Failed to reset password: ' + error.message);
    }
  };

  const copyResetLink = async () => {
    if (resetLink) {
      await navigator.clipboard.writeText(resetLink);
      setResetLinkCopied(true);
      toast.success('Reset link copied to clipboard');
      setTimeout(() => setResetLinkCopied(false), 2000);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.length === 0) {
      toast.error('Please select users and an action');
      return;
    }

    try {
      if (bulkAction === 'delete') {
        setDeleteDialogOpen(true);
        return;
      }

      if (bulkAction.startsWith('role_')) {
        const role = bulkAction.replace('role_', '') as 'admin' | 'member';
        if (role === 'admin' || role === 'member') {
          await adminService.bulkUpdateUsers({
            userIds: selectedUsers,
            updates: { role },
          });
          toast.success(`Updated ${selectedUsers.length} users`);
        }
      }

      setSelectedUsers([]);
      setBulkAction("");
      fetchUsers();
    } catch (error: any) {
      toast.error('Bulk action failed: ' + error.message);
    }
  };

  const confirmBulkDelete = async () => {
    try {
      await adminService.bulkDeleteUsers(selectedUsers);
      toast.success(`Deleted ${selectedUsers.length} users`);
      setSelectedUsers([]);
      setBulkAction("");
      setDeleteDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast.error('Bulk delete failed: ' + error.message);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleAllUsers = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.user_id));
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-lg">
        <div className="flex items-center gap-md pb-md border-b border-border">
          <div className="flex-1 relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-sm">
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Bulk actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="role_admin">Make Admin</SelectItem>
                  <SelectItem value="role_member">Make Member</SelectItem>
                  <SelectItem value="delete">Delete Users</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleBulkAction} variant="secondary">
                Apply to {selectedUsers.length} user(s)
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <TableSkeleton columns={10} rows={10} />
        ) : (
          <div className="bg-card border border-border rounded">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      onCheckedChange={toggleAllUsers}
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Teams</TableHead>
                  <TableHead>Working Days</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <Target className="h-3.5 w-3.5" />
                      KPIs
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5" />
                      MFA
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5" />
                      Last Activity
                    </div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center">No users found</TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.includes(user.user_id)}
                          onCheckedChange={() => toggleUserSelection(user.user_id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>{user.title || '-'}</TableCell>
                      <TableCell>
                        <TeamsMultiSelect
                          selectedTeams={user.teams || []}
                          onChange={(teams) => handleTeamsChange(user.user_id, teams)}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.working_days || 'mon-fri'}
                          onValueChange={(value) => handleWorkingDaysChange(user.user_id, value)}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mon-fri">Mon-Fri</SelectItem>
                            <SelectItem value="mon-sat">Mon-Sat</SelectItem>
                            <SelectItem value="sun-thu">Sun-Thu</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.user_id, value)}
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={user.kpisAssigned > 0 ? "default" : "secondary"} className="min-w-[32px]">
                          {user.kpisAssigned}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge 
                              variant={user.mfa_enabled ? "default" : "secondary"}
                              className={user.mfa_enabled ? "bg-success/15 text-success border-success/30" : "bg-warning/15 text-warning border-warning/30"}
                            >
                              {user.mfa_enabled ? (
                                <><Shield className="h-3 w-3 mr-1" /> Enabled</>
                              ) : (
                                <><ShieldOff className="h-3 w-3 mr-1" /> Not Set</>
                              )}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {user.mfa_enabled 
                              ? "Two-factor authentication is enabled" 
                              : "User has not set up MFA yet"}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {user.lastActivity ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col">
                                <span className="text-body-sm truncate max-w-[120px]">
                                  {user.lastActivity.action}
                                </span>
                                <span className="text-metadata text-muted-foreground">
                                  {format(new Date(user.lastActivity.time), 'MMM d, h:mm a')}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{user.lastActivity.action}</p>
                              <p className="text-muted-foreground">{format(new Date(user.lastActivity.time), 'PPpp')}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground text-metadata">No activity</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setPasswordResetUser(user);
                                  setResetLink(null);
                                  setPasswordResetDialogOpen(true);
                                }}
                              >
                                <KeyRound className="h-4 w-4 text-primary" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reset Password</TooltipContent>
                          </Tooltip>
                          {user.mfa_enabled && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setMfaResetUser(user);
                                    setMfaResetDialogOpen(true);
                                  }}
                                >
                                  <RotateCcw className="h-4 w-4 text-warning" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Reset MFA</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteUser(user.user_id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete User</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedUsers.length} user(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the selected users and all their data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmBulkDelete} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={mfaResetDialogOpen} onOpenChange={setMfaResetDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-warning" />
                Reset MFA for {mfaResetUser?.name}?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>This will:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Delete all MFA secrets and backup codes</li>
                  <li>End all active MFA sessions</li>
                  <li>Require the user to set up MFA again on next login</li>
                </ul>
                <p className="mt-3 font-medium">
                  Use this if the user lost access to their authenticator app and cannot use backup codes.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetMfa} className="bg-warning hover:bg-warning/90 text-warning-foreground">
                Reset MFA
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={passwordResetDialogOpen} onOpenChange={(open) => {
          setPasswordResetDialogOpen(open);
          if (!open) {
            setResetLink(null);
            setPasswordResetUser(null);
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                Reset Password for {passwordResetUser?.name}?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                {resetLink ? (
                  <div className="space-y-3">
                    <p className="text-success font-medium">Password reset link generated!</p>
                    <p className="text-sm">Share this link with the user. It will expire in 24 hours.</p>
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <code className="flex-1 text-xs break-all">{resetLink}</code>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={copyResetLink}
                      >
                        {resetLinkCopied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p>This will generate a password reset link for <strong>{passwordResetUser?.email}</strong>.</p>
                    <p className="text-sm text-muted-foreground">
                      You can then share this link with the user to allow them to set a new password.
                    </p>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {resetLink ? (
                <AlertDialogAction onClick={() => {
                  setPasswordResetDialogOpen(false);
                  setResetLink(null);
                  setPasswordResetUser(null);
                }}>
                  Done
                </AlertDialogAction>
              ) : (
                <>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetPassword}>
                    Generate Reset Link
                  </AlertDialogAction>
                </>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}