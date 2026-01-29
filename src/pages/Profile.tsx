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
import { LoadingState } from "@/components/layout/LoadingState";
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
  
  // Use React Query hooks - get ALL status fields for debugging
  const { 
    data: profile, 
    status: profileStatus,
    fetchStatus,
    isError: profileError,
    error: profileErrorDetails,
    isFetching,
  } = useProfile(targetUserId);
  
  
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        teams: selectedTeams as ("PPC" | "PerMar" | "SocialUA")[]
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

  // === BULLETPROOF LOADING PATTERN ===
  // Uses BOTH status AND fetchStatus for complete coverage
  
  // Guard 1: Auth still loading
  if (authLoading) {
    return <LoadingState variant="section" withContainer />;
  }

  // Guard 2: Need current user but don't have it yet (visiting /profile without userId param)
  if (!userId && !user) {
    return <LoadingState variant="section" withContainer />;
  }

  // Guard 3: No target user ID (truly not logged in on /profile route)
  if (!targetUserId) {
    return (
      <PageContainer>
        <LoadingState
          variant="section"
          isError
          errorMessage="Please log in to view profiles."
          onBack={() => navigate("/auth")}
        />
      </PageContainer>
    );
  }

  // Guard 4: Query still loading
  // CRITICAL FIX: Only check fetchStatus === 'fetching', NOT profileStatus === 'pending'
  // When query is disabled, status is 'pending' but fetchStatus is 'idle' - that's not loading!
  const isActuallyFetching = fetchStatus === 'fetching';
  
  if (isActuallyFetching && !profile) {
    return <LoadingState variant="section" withContainer />;
  }

  // Guard 5: Query completed with error
  if (profileError) {
    return (
      <LoadingState
        variant="section"
        withContainer
        isError
        errorMessage="Could not load profile."
        onBack={() => navigate(-1)}
      />
    );
  }

  // Guard 6: Query completed but no profile found
  if (!profile) {
    return (
      <LoadingState
        variant="section"
        withContainer
        isError
        errorMessage="Profile not found."
        onBack={() => navigate(-1)}
      />
    );
  }
  
  // === PROFILE IS NOW GUARANTEED TO EXIST ===
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
              <AvatarFallback className="text-heading-lg bg-muted">{profile.name?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <label>
                <Button variant="outline" size="sm" disabled={uploading} asChild className="rounded-full h-9 px-md text-body-sm">
                  <span className="cursor-pointer flex items-center gap-xs">
                    <Upload className="h-4 w-4" />
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
                  <Button onClick={handleSave} className="rounded-full h-10 px-lg text-body-sm">Save Changes</Button>
                  <Button variant="outline" onClick={() => setEditing(false)} className="rounded-full h-10 px-lg text-body-sm">Cancel</Button>
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
                    <p className="text-body-sm text-muted-foreground mt-xs">Manage your notification settings</p>
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
          <h2 className="text-heading-md font-medium flex items-center gap-sm mb-md text-foreground">
            <Target className="h-5 w-5 text-primary" />
            Key Performance Indicators ({profileKPIs.length})
          </h2>
          <div className="space-y-md">
            {profileKPIs.map((kpi) => {
              const assignment = kpi.assignments?.find(a => a.user_id === targetUserId);
              return (
                <div key={kpi.id} className="bg-muted/30 rounded-xl p-md border border-border">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-body text-foreground">{kpi.title}</h3>
                      {kpi.description && <p className="text-body-sm text-muted-foreground mt-xs">{kpi.description}</p>}
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
                    <div className="space-y-sm mt-md">
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
                      <h4 className="font-medium text-body-sm text-muted-foreground mb-xs">Assignment Notes</h4>
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
          <h2 className="text-heading-md font-medium flex items-center gap-sm mb-md text-foreground">
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
          <TabsList className="grid w-full max-w-3xl grid-cols-6 h-10 rounded-lg bg-muted/50 p-xs">
            <TabsTrigger value="all" className="rounded-md text-body-sm">All ({tasks.all.length})</TabsTrigger>
            <TabsTrigger value="ongoing" className="rounded-md text-body-sm">Ongoing ({tasks.ongoing.length})</TabsTrigger>
            <TabsTrigger value="completed" className="rounded-md text-body-sm">Completed ({tasks.completed.length})</TabsTrigger>
            <TabsTrigger value="pending" className="rounded-md text-body-sm">Pending ({tasks.pending.length})</TabsTrigger>
            <TabsTrigger value="blocked" className="rounded-md text-body-sm">Blocked ({tasks.blocked.length})</TabsTrigger>
            <TabsTrigger value="failed" className="rounded-md text-body-sm">Failed ({tasks.failed.length})</TabsTrigger>
          </TabsList>

          {(["all", "ongoing", "completed", "pending", "blocked", "failed"] as const).map((status) => (
            <TabsContent key={status} value={status} className="mt-md space-y-sm">
              {tasks[status].length > 0 ? (
                tasks[status].map((task: { id: string; title: string; description?: string; status: string; priority: string; due_at?: string; entity?: string; recurrence_rrule?: string }) => (
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
