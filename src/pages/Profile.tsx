import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { TaskCard } from "@/components/tasks/TaskCard";
import { useTaskDrawer } from "@/contexts/TaskDrawerContext";
import { Upload, Users, Target, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useKPIs } from "@/hooks/useKPIs";
import { Progress } from "@/components/ui/progress";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { useProfile, useTeamMembers, useUserTasks } from "@/hooks/useProfileData";
import { useQueryClient } from "@tanstack/react-query";

const TEAMS = ["SocialUA", "PPC", "PerMar"];

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const targetUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;
  
  // Use React Query hooks - use isPending (not isLoading) to catch initial state before fetch starts
  const { data: profile, isPending: profilePending, isError: profileError } = useProfile(targetUserId);
  const { data: teamMembers = [] } = useTeamMembers(profile?.teams);
  const { data: tasks = { all: [], ongoing: [], completed: [], pending: [], blocked: [], failed: [] } } = useUserTasks(targetUserId, profile?.teams);
  
  // Local form state for editing
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [tagline, setTagline] = useState("");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const { openTaskDrawer } = useTaskDrawer();

  const { kpis } = useKPIs();
  
  // Filter KPIs for the profile being viewed
  const profileKPIs = kpis?.filter(kpi => 
    kpi.assignments?.some(a => a.user_id === targetUserId)
  ) || [];

  // Sync form state when profile data loads
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setTitle(profile.title || "");
      setPhoneNumber(profile.phone_number || "");
      setTagline(profile.tagline || "");
      setSelectedTeams((profile.teams as string[]) || []);
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.type !== 'image/png') {
      toast({
        title: "Invalid file type",
        description: "Only PNG images are allowed",
        variant: "destructive"
      });
      e.target.value = '';
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Avatar must be under 2MB",
        variant: "destructive"
      });
      e.target.value = '';
      return;
    }

    setUploading(true);

    const timestamp = Date.now();
    const randomStr = crypto.randomUUID();
    const filePath = `${user.id}/avatar_${timestamp}_${randomStr}.png`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);

    if (uploadError) {
      toast({ title: "Error", description: uploadError.message, variant: "destructive" });
    } else {
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
      
      if (updateError) {
        toast({ title: "Error", description: updateError.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Avatar updated" });
        queryClient.invalidateQueries({ queryKey: ["profile", targetUserId] });
      }
    }
    setUploading(false);
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ 
        name, 
        title, 
        phone_number: phoneNumber, 
        tagline,
        teams: selectedTeams as any
      })
      .eq("user_id", user?.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Profile updated" });
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["profile", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    }
  };

  const toggleTeam = (team: string) => {
    setSelectedTeams((prev) =>
      prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]
    );
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // === DEAD SIMPLE EARLY RETURN PATTERN ===
  // Guard 1: Auth still loading OR waiting for user on own profile route
  // When visiting /profile (no userId param), we need user.id, so wait for it
  const needsCurrentUser = !userId; // /profile without param needs logged-in user
  const waitingForUser = needsCurrentUser && !user;
  
  if (authLoading || waitingForUser) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageContainer>
    );
  }

  // Guard 2: No user ID available after loading complete (truly not logged in)
  if (!targetUserId) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <p className="text-muted-foreground">Please log in to view profiles.</p>
          <Button onClick={() => navigate("/login")} variant="outline">Log In</Button>
        </div>
      </PageContainer>
    );
  }

  // Guard 3: Profile query is pending (isPending = no data yet, includes initial state)
  if (profilePending) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageContainer>
    );
  }

  // Guard 4: Error or no profile found
  if (profileError || !profile) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <p className="text-muted-foreground">
            {profileError ? "Could not load profile." : "Profile not found."}
          </p>
          <Button onClick={() => navigate(-1)} variant="outline">Go Back</Button>
        </div>
      </PageContainer>
    );
  }
  
  // At this point, profile is GUARANTEED to exist
  return (
    <PageContainer>
      <PageHeader
        title={isOwnProfile ? "My Profile" : profile.name || "Profile"}
        description={profile.title || "User profile and settings"}
        icon={User}
        actions={
          isOwnProfile && !editing ? (
            <Button onClick={() => setEditing(true)} variant="outline">
              Edit Profile
            </Button>
          ) : null
        }
      />

      {/* Profile Header Card */}
      <Card className="p-lg">
        <div className="flex flex-col md:flex-row gap-lg">
          <div className="flex flex-col items-center gap-md">
            <Avatar className="h-28 w-28 border-2 border-border">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl bg-muted">{profile.name?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <label>
                <Button variant="outline" size="sm" disabled={uploading} asChild className="rounded-full h-9 px-4 text-body-sm">
                  <span className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Uploading..." : "Upload Photo"}
                  </span>
                </Button>
                <input type="file" accept="image/png" onChange={handleAvatarUpload} className="hidden" />
              </label>
            )}
          </div>

          <div className="flex-1 space-y-md">
            {editing && isOwnProfile ? (
              <>
                <div>
                  <Label className="text-body-sm text-muted-foreground">Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-lg mt-sm" />
                </div>
                <div>
                  <Label className="text-body-sm text-muted-foreground">Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Senior Developer" className="h-10 rounded-lg mt-sm" />
                </div>
                <div>
                  <Label className="text-body-sm text-muted-foreground">Phone Number</Label>
                  <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="h-10 rounded-lg mt-sm" />
                </div>
                <div>
                  <Label className="text-body-sm text-muted-foreground">Tagline</Label>
                  <Textarea value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="A short bio..." className="rounded-lg mt-sm" />
                </div>
                <div>
                  <Label className="text-body-sm text-muted-foreground mb-sm block">Teams</Label>
                  <div className="space-y-sm">
                    {TEAMS.map((team) => (
                      <div key={team} className="flex items-center gap-sm">
                        <Checkbox
                          id={team}
                          checked={selectedTeams.includes(team)}
                          onCheckedChange={() => toggleTeam(team)}
                        />
                        <Label htmlFor={team} className="cursor-pointer text-body-sm">
                          {team}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-sm pt-sm">
                  <Button onClick={handleSave} className="rounded-full h-10 px-6 text-body-sm">Save Changes</Button>
                  <Button variant="outline" onClick={() => setEditing(false)} className="rounded-full h-10 px-6 text-body-sm">Cancel</Button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-heading-lg font-semibold text-foreground">{profile.name}</h2>
                {profile.title && <p className="text-body text-muted-foreground">{profile.title}</p>}
                {profile.tagline && <p className="text-body-sm text-foreground/80">{profile.tagline}</p>}
                {profile.phone_number && <p className="text-body-sm text-muted-foreground">{profile.phone_number}</p>}
                <p className="text-body-sm text-muted-foreground">{profile.email}</p>
                
                {profile.teams && profile.teams.length > 0 && (
                  <div className="flex flex-wrap gap-sm pt-sm">
                    {profile.teams.map((team: string) => (
                      <Badge key={team} variant="secondary" className="rounded-full px-sm py-xs text-body-sm">
                        {team}
                      </Badge>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Notification Preferences - Only for own profile */}
      {isOwnProfile && (
        <Card>
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="w-full">
              <div className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg px-lg py-md">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <h3 className="text-heading-sm font-medium text-foreground">Notification Preferences</h3>
                    <p className="text-body-sm text-muted-foreground mt-1">Manage your notification settings</p>
                  </div>
                  <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-lg pb-lg">
                <NotificationPreferences />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* KPIs Section */}
      {profileKPIs.length > 0 && (
        <Card className="p-lg">
          <h2 className="text-heading-md font-medium flex items-center gap-sm mb-5 text-foreground">
            <Target className="h-5 w-5 text-primary" />
            Key Performance Indicators ({profileKPIs.length})
          </h2>
          <div className="space-y-md">
            {profileKPIs.map((kpi) => {
              const assignment = kpi.assignments?.find(a => a.user_id === targetUserId);
              return (
                <div key={kpi.id} className="bg-muted/30 rounded-xl p-5 border border-border">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-body text-foreground">{kpi.title}</h3>
                      {kpi.description && <p className="text-body-sm text-muted-foreground mt-1">{kpi.description}</p>}
                      <div className="flex items-center gap-sm mt-sm flex-wrap">
                        <Badge variant="outline" className="rounded-full text-metadata">Target: {kpi.target}</Badge>
                        <Badge variant="outline" className="rounded-full text-metadata">{kpi.metric_type}</Badge>
                        {kpi.deadline && (
                          <Badge variant="outline" className="rounded-full text-metadata">
                            Due: {new Date(kpi.deadline).toLocaleDateString()}
                          </Badge>
                        )}
                        <Badge variant={assignment?.status === 'approved' ? 'default' : assignment?.status === 'pending' ? 'secondary' : 'destructive'} className="rounded-full text-metadata">
                          {assignment?.status || 'pending'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {kpi.targets && kpi.targets.length > 0 && (
                    <div className="space-y-sm mt-5">
                      <h4 className="font-medium text-body-sm text-muted-foreground">Targets</h4>
                      {kpi.targets.map((target) => {
                        const progress = target.target_value > 0 ? (target.current_value / target.target_value) * 100 : 0;
                        return (
                          <div key={target.id} className="space-y-sm">
                            <div className="flex items-center justify-between text-body-sm">
                              <span className="font-medium text-foreground">{target.target_name}</span>
                              <span className="text-muted-foreground">{target.current_value} / {target.target_value} {target.unit}</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <Badge variant="outline" className="text-metadata rounded-full">{target.target_type}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {assignment?.notes && (
                    <div className="mt-md">
                      <h4 className="font-medium text-body-sm text-muted-foreground mb-1">Assignment Notes</h4>
                      <p className="text-body-sm text-foreground/80">{assignment.notes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Team Members */}
      {teamMembers.length > 0 && (
        <Card className="p-lg">
          <h2 className="text-heading-md font-medium flex items-center gap-sm mb-5 text-foreground">
            <Users className="h-5 w-5 text-primary" />
            Team Members ({teamMembers.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
            {teamMembers.map((member) => (
              <div
                key={member.user_id}
                className="p-md bg-muted/30 rounded-xl border border-border hover:border-primary/30 hover:bg-card-hover transition-all cursor-pointer"
                onClick={() => navigate(`/profile/${member.user_id}`)}
              >
                <div className="flex items-center gap-sm">
                  <Avatar className="h-12 w-12 border border-border">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="bg-muted text-body-sm">{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-body-sm text-foreground truncate">{member.name}</h3>
                    {member.username && (
                      <p className="text-body-sm text-muted-foreground truncate">
                        @{member.username}
                      </p>
                    )}
                    {member.title && (
                      <p className="text-metadata text-muted-foreground truncate">
                        {member.title}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tasks Section */}
      <Card className="p-lg">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full max-w-3xl grid-cols-6 h-10 rounded-lg bg-muted/50 p-1">
            <TabsTrigger value="all" className="rounded-md text-body-sm">All ({tasks.all.length})</TabsTrigger>
            <TabsTrigger value="ongoing" className="rounded-md text-body-sm">Ongoing ({tasks.ongoing.length})</TabsTrigger>
            <TabsTrigger value="completed" className="rounded-md text-body-sm">Completed ({tasks.completed.length})</TabsTrigger>
            <TabsTrigger value="pending" className="rounded-md text-body-sm">Pending ({tasks.pending.length})</TabsTrigger>
            <TabsTrigger value="blocked" className="rounded-md text-body-sm">Blocked ({tasks.blocked.length})</TabsTrigger>
            <TabsTrigger value="failed" className="rounded-md text-body-sm">Failed ({tasks.failed.length})</TabsTrigger>
          </TabsList>

          {(["all", "ongoing", "completed", "pending", "blocked", "failed"] as const).map((status) => (
            <TabsContent key={status} value={status} className="mt-5 space-y-sm">
              {tasks[status].length > 0 ? (
                tasks[status].map((task: any) => (
                  <TaskCard
                    key={task.id}
                    task={{
                      id: task.id,
                      title: task.title,
                      description: task.description || "",
                      assignee: "Multi-assignee",
                      status: task.status,
                      priority: task.priority,
                      dueDate: task.due_at,
                      timeTracked: "0h 00m",
                      entity: task.entity || undefined,
                      recurrence: task.recurrence_rrule ? (task.recurrence_rrule.includes('DAILY') ? 'daily' : task.recurrence_rrule.includes('WEEKLY') ? 'weekly' : task.recurrence_rrule.includes('MONTHLY') ? 'monthly' : 'none') : 'none',
                    }}
                    onClick={() => {
                      openTaskDrawer(task.id, task);
                    }}
                  />
                ))
              ) : (
                <div className="p-lg text-center bg-muted/30 rounded-xl border border-border">
                  <p className="text-body-sm text-muted-foreground">No {status} tasks</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </Card>
    </PageContainer>
  );
}
