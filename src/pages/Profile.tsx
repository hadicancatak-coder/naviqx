import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
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
import { UnifiedTaskDialog } from "@/components/UnifiedTaskDialog";
import { Upload, Users, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useKPIs } from "@/hooks/useKPIs";
import { Progress } from "@/components/ui/progress";

const TEAMS = ["SocialUA", "PPC", "PerMar"];

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const isOwnProfile = !userId || userId === user?.id;
  
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [tagline, setTagline] = useState("");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any>({ 
    all: [], 
    ongoing: [], 
    completed: [], 
    pending: [], 
    blocked: [], 
    failed: [] 
  });
  const [uploading, setUploading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const { kpis } = useKPIs();
  
  // Filter KPIs for the profile being viewed
  const profileKPIs = kpis?.filter(kpi => 
    kpi.assignments?.some(a => a.user_id === (userId || user?.id))
  ) || [];

  useEffect(() => {
    if (!user) return;
    fetchProfile();
    fetchTasks();
    fetchTeamMembers();
  }, [userId, user?.id]);

  const fetchProfile = async () => {
    const targetUserId = userId || user?.id;
    const { data } = await supabase.from("profiles").select("*").eq("user_id", targetUserId).single();
    
    if (data) {
      setProfile(data);
      setName(data.name || "");
      setTitle(data.title || "");
      setPhoneNumber(data.phone_number || "");
      setTagline(data.tagline || "");
      setSelectedTeams((data.teams as string[]) || []);
    }
  };

  const fetchTeamMembers = async () => {
    const targetUserId = userId || user?.id;
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("teams")
      .eq("user_id", targetUserId)
      .single();

    if (currentProfile?.teams && currentProfile.teams.length > 0) {
      const { data } = await supabase
        .from("public_profiles")
        .select("user_id, name, username, avatar_url, title")
        .contains("teams", currentProfile.teams);

      setTeamMembers(data || []);
    }
  };

  const fetchTasks = async () => {
    const targetUserId = userId || user?.id;
    
    console.log('🔍 Profile fetchTasks - targetUserId:', targetUserId);
    
    // Get the profile for the target user (with teams)
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("id, user_id, teams")
      .eq("user_id", targetUserId)
      .single();
    
    console.log('🔍 Profile fetchTasks - targetProfile:', targetProfile);
    
    if (!targetProfile) {
      console.log('❌ No target profile found');
      return;
    }

    // Fetch all tasks with assignees (EXACT match to useTasks.ts)
    const { data: allTasksData, error } = await supabase
      .from("tasks")
      .select(`
        *,
        task_assignees(
          user_id,
          profiles!task_assignees_user_id_fkey(id, user_id, name, avatar_url, teams)
        ),
        task_comment_counts(comment_count)
      `)
      .order("created_at", { ascending: false });

    console.log('🔍 Profile fetchTasks - allTasksData count:', allTasksData?.length, 'error:', error);

    if (!allTasksData) return;

    // Map tasks and apply visibility filtering (same logic as useTasks.ts)
    const mappedTasks = allTasksData.map((task: any) => ({
      ...task,
      assignees: task.task_assignees?.map((ta: any) => ta.profiles).filter(Boolean) || []
    }));

    console.log('🔍 Profile fetchTasks - mappedTasks sample:', mappedTasks[0]);

    // PHASE 1 FIX: Profile page shows ONLY assigned tasks
    const visibleTasks = mappedTasks.filter((task: any) => {
      // Direct assignee check
      const isDirectAssignee = task.assignees?.some((a: any) => a.user_id === targetUserId);

      // Team membership check
      const userTeams = targetProfile.teams || [];
      const taskTeams = Array.isArray(task.teams) 
        ? task.teams 
        : (typeof task.teams === 'string' ? JSON.parse(task.teams) : []);
      const isTeamMember = userTeams.some((team: string) => taskTeams.includes(team));

      // ✅ PROFILE PAGE RULE: Only show tasks where user is involved
      // This fixes the bug where ALL global tasks were showing
      if (!isDirectAssignee && !isTeamMember) {
        return false; // User is NOT involved - don't show
      }

      // Apply visibility rules for private tasks
      if (task.visibility === 'private' && !isDirectAssignee && !isTeamMember) {
        return false;
      }

      return true; // User IS involved - show the task
    });

    setTasks({
      all: visibleTasks,
      ongoing: visibleTasks.filter(t => t.status === "Ongoing"),
      completed: visibleTasks.filter(t => t.status === "Completed"),
      pending: visibleTasks.filter(t => t.status === "Pending"),
      blocked: visibleTasks.filter(t => t.status === "Blocked"),
      failed: visibleTasks.filter(t => t.status === "Failed"),
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type (only PNG)
    if (file.type !== 'image/png') {
      toast({
        title: "Invalid file type",
        description: "Only PNG images are allowed",
        variant: "destructive"
      });
      e.target.value = ''; // Reset input
      return;
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Avatar must be under 2MB",
        variant: "destructive"
      });
      e.target.value = ''; // Reset input
      return;
    }

    setUploading(true);

    // Generate cryptographically safe filename
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
        fetchProfile();
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
      fetchProfile();
      fetchTeamMembers();
    }
  };

  const toggleTeam = (team: string) => {
    setSelectedTeams((prev) =>
      prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]
    );
  };


  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!profile) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="min-h-screen bg-background pt-8 pb-8 px-8 lg:px-12">
      <div className="max-w-[1280px] mx-auto space-y-lg">
        {/* Profile Header Card */}
        <div className="bg-card rounded-xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2),0_4px_16px_rgba(0,0,0,0.15)] p-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex flex-col items-center gap-md">
              <Avatar className="h-28 w-28 border-2 border-border">
                <AvatarImage src={profile.avatar_url} />
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
                  <h1 className="text-heading-lg font-semibold text-foreground">{profile.name}</h1>
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
                  
                  {isOwnProfile && (
                    <Button onClick={() => setEditing(true)} variant="outline" className="rounded-full h-10 px-6 text-body-sm mt-sm">
                      Edit Profile
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Notification Preferences - Only for own profile */}
        {isOwnProfile && (
          <Collapsible defaultOpen={false}>
            <div className="bg-card rounded-xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2),0_4px_16px_rgba(0,0,0,0.15)]">
              <CollapsibleTrigger className="w-full">
                <div className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-xl px-6 py-5">
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
                <div className="px-6 pb-6">
                  <NotificationPreferences />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        {/* KPIs Section */}
        {profileKPIs.length > 0 && (
          <div className="bg-card rounded-xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2),0_4px_16px_rgba(0,0,0,0.15)] p-lg">
            <h2 className="text-heading-md font-medium flex items-center gap-sm mb-5 text-foreground">
              <Target className="h-5 w-5 text-primary" />
              Key Performance Indicators ({profileKPIs.length})
            </h2>
            <div className="space-y-md">
              {profileKPIs.map((kpi) => {
                const assignment = kpi.assignments?.find(a => a.user_id === (userId || user?.id));
                return (
                  <div key={kpi.id} className="bg-muted/30 rounded-xl p-5 border border-border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-body text-foreground">{kpi.name}</h3>
                        {kpi.description && <p className="text-body-sm text-muted-foreground mt-1">{kpi.description}</p>}
                        <div className="flex items-center gap-sm mt-sm flex-wrap">
                          <Badge variant="outline" className="rounded-full text-metadata">Weight: {kpi.weight}%</Badge>
                          <Badge variant="outline" className="rounded-full text-metadata">{kpi.type}</Badge>
                          <Badge variant="outline" className="rounded-full text-metadata">{kpi.period}</Badge>
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
          </div>
        )}

        {/* Team Members */}
        {teamMembers.length > 0 && (
          <div className="bg-card rounded-xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2),0_4px_16px_rgba(0,0,0,0.15)] p-lg">
            <h2 className="text-heading-md font-medium flex items-center gap-sm mb-5 text-foreground">
              <Users className="h-5 w-5 text-primary" />
              Team Members ({teamMembers.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
              {teamMembers.map((member) => (
                <div
                  key={member.user_id}
                  className="p-md bg-muted/30 rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate(`/profile/${member.user_id}`)}
                >
                  <div className="flex items-center gap-sm">
                    <Avatar className="h-12 w-12 border border-border">
                      <AvatarImage src={member.avatar_url} />
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
          </div>
        )}

        {/* Tasks Section */}
        <div className="bg-card rounded-xl border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2),0_4px_16px_rgba(0,0,0,0.15)] p-lg">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full max-w-3xl grid-cols-6 h-10 rounded-lg bg-muted/50 p-1">
              <TabsTrigger value="all" className="rounded-md text-body-sm">All ({tasks.all.length})</TabsTrigger>
              <TabsTrigger value="ongoing" className="rounded-md text-body-sm">Ongoing ({tasks.ongoing.length})</TabsTrigger>
              <TabsTrigger value="completed" className="rounded-md text-body-sm">Completed ({tasks.completed.length})</TabsTrigger>
              <TabsTrigger value="pending" className="rounded-md text-body-sm">Pending ({tasks.pending.length})</TabsTrigger>
              <TabsTrigger value="blocked" className="rounded-md text-body-sm">Blocked ({tasks.blocked.length})</TabsTrigger>
              <TabsTrigger value="failed" className="rounded-md text-body-sm">Failed ({tasks.failed.length})</TabsTrigger>
            </TabsList>

            {["all", "ongoing", "completed", "pending", "blocked", "failed"].map((status) => (
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
                        setSelectedTask(task);
                        setSelectedTaskId(task.id);
                        setTaskDialogOpen(true);
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
        </div>

        {selectedTaskId && (
          <UnifiedTaskDialog
            open={taskDialogOpen}
            onOpenChange={setTaskDialogOpen}
            mode="view"
            taskId={selectedTaskId}
            task={selectedTask}
          />
        )}
      </div>
    </div>
  );
}
