import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Check, Trash2, Search, CheckCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTaskDrawer } from "@/contexts/TaskDrawerContext";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";
import { AnnouncementsSection } from "@/components/AnnouncementsSection";

export default function Notifications() {
  const { user, userRole, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { openTaskDrawer } = useTaskDrawer();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [enrichedData, setEnrichedData] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    // Real-time subscription
    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [notifications, readFilter, typeFilter, searchQuery]);

  const fetchNotifications = async () => {
    setDataLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNotifications(data || []);
      await enrichNotificationData(data);
    }
    setDataLoading(false);
  };

  const enrichNotificationData = async (notifs: any[]) => {
    const enriched = new Map();

    // Collect all unique IDs for batch fetching
    const commentIds = new Set<string>();
    const profileIds = new Set<string>();

    for (const notif of notifs) {
      const payload = notif.payload_json || {};
      if (notif.type === "comment_mention" && payload.comment_id) {
        commentIds.add(payload.comment_id);
      }
      if (payload.mentioned_by) {
        profileIds.add(payload.mentioned_by);
      }
      if (payload.assigned_by) {
        profileIds.add(payload.assigned_by);
      }
    }

    // Batch fetch all comments and profiles in parallel (2 queries instead of N)
    const [commentsResult, profilesResult] = await Promise.all([
      commentIds.size > 0
        ? supabase.from("comments").select("id, body").in("id", Array.from(commentIds))
        : Promise.resolve({ data: [] }),
      profileIds.size > 0
        ? supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", Array.from(profileIds))
        : Promise.resolve({ data: [] }),
    ]);

    // Create lookup maps
    const commentsMap = new Map((commentsResult.data || []).map((c: any) => [c.id, c]));
    const profilesMap = new Map((profilesResult.data || []).map((p: any) => [p.user_id, p]));

    // Enrich notifications using lookup maps (O(1) per notification)
    for (const notif of notifs) {
      const payload = notif.payload_json || {};
      const data: any = {};

      if (notif.type === "comment_mention" && payload.comment_id) {
        const comment = commentsMap.get(payload.comment_id);
        if (comment) {
          data.commentBody = comment.body;
        }
      }

      if (payload.mentioned_by) {
        const profile = profilesMap.get(payload.mentioned_by);
        if (profile) {
          data.mentionedByName = profile.name;
          data.mentionedByAvatar = profile.avatar_url;
        }
      }

      if (payload.assigned_by) {
        const profile = profilesMap.get(payload.assigned_by);
        if (profile) {
          data.assignedByName = profile.name;
          data.assignedByAvatar = profile.avatar_url;
        }
      }

      enriched.set(notif.id, data);
    }

    setEnrichedData(enriched);
  };

  const applyFilters = () => {
    let filtered = [...notifications];

    // Read/unread filter
    if (readFilter === "unread") {
      filtered = filtered.filter(n => !n.read_at);
    } else if (readFilter === "read") {
      filtered = filtered.filter(n => n.read_at);
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(n => n.type === typeFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(n => {
        const message = getNotificationMessage(n).toLowerCase();
        return message.includes(searchQuery.toLowerCase());
      });
    }

    setFilteredNotifications(filtered);
  };

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId);

    if (!error) {
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user?.id)
      .is("read_at", null);

    if (!error) {
      toast({ title: "All notifications marked as read" });
      fetchNotifications();
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (!error) {
      fetchNotifications();
    }
  };

  const deleteSelected = async () => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .in("id", selectedIds);

    if (!error) {
      toast({ title: `${selectedIds.length} notifications deleted` });
      setSelectedIds([]);
      fetchNotifications();
    }
  };

  const markSelectedAsRead = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", selectedIds);

    if (!error) {
      toast({ title: `${selectedIds.length} notifications marked as read` });
      setSelectedIds([]);
      fetchNotifications();
    }
  };

  const handleOpenTask = async (taskId: string) => {
    openTaskDrawer(taskId);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Combine title + context into one concise action-oriented message
  const getNotificationTitle = (notification: any) => {
    const payload = notification.payload_json || {};
    const data = enrichedData.get(notification.id) || {};
    const taskTitle = payload.task_title || payload.campaign_title || "";
    
    switch (notification.type) {
      case "task_assigned":
        return `Assigned: ${taskTitle}`;
      case "comment_mention":
        return `Mentioned in: ${taskTitle}`;
      case "task_new_comment":
        return `New comment on: ${taskTitle}`;
      case "task_updated":
        return `Updated: ${taskTitle}`;
      case "task_status_changed":
        return `${taskTitle} → ${payload.new_status}`;
      case "task_deadline_changed":
        return `Due date changed: ${taskTitle}`;
      case "task_priority_changed":
        return `Priority changed: ${taskTitle}`;
      case "deadline_reminder_3days":
        return `Due in 3 days: ${taskTitle}`;
      case "deadline_reminder_1day":
        return `Due tomorrow: ${taskTitle}`;
      case "deadline_reminder_overdue":
        return `Overdue: ${taskTitle}`;
      case "task_overdue":
        return `Overdue: ${taskTitle}`;
      case "blocker_resolved":
        return `Blocker resolved: ${taskTitle}`;
      case "blocker_created":
        return `Blocked: ${taskTitle}`;
      case "campaign_assigned":
        return `Campaign assigned: ${taskTitle}`;
      case "campaign_status_changed":
        return `${taskTitle} → ${payload.new_status}`;
      case "campaign_starting_soon":
        return `Launching soon: ${taskTitle}`;
      case "approval_pending":
        return `Needs approval: ${taskTitle}`;
      case "ad_status_changed":
        return `Ad ${payload.ad_name} → ${payload.new_status}`;
      case "ad_pending_review":
        return `Review needed: ${payload.ad_name}`;
      case "announcement":
        return payload.title || "Announcement";
      default:
        return taskTitle || "Notification";
    }
  };

  const getNotificationMessage = (notification: any) => {
    const payload = notification.payload_json || {};
    const data = enrichedData.get(notification.id) || {};
    
    switch (notification.type) {
      case "task_assigned":
        return data.assignedByName ? `by ${data.assignedByName}` : "";
      case "comment_mention":
        return data.mentionedByName ? `by ${data.mentionedByName}` : "";
      case "task_new_comment":
        return payload.commenter_name ? `by ${payload.commenter_name}` : "";
      case "task_status_changed":
        return payload.old_status ? `was ${payload.old_status}` : "";
      case "task_deadline_changed":
        const oldDate = payload.old_due_date ? new Date(payload.old_due_date).toLocaleDateString() : "None";
        const newDate = payload.new_due_date ? new Date(payload.new_due_date).toLocaleDateString() : "Removed";
        return `${oldDate} → ${newDate}`;
      case "task_priority_changed":
        return `${payload.old_priority} → ${payload.new_priority}`;
      case "deadline_reminder_overdue":
        return `${payload.days_overdue || 1} days overdue`;
      case "approval_pending":
        return `${payload.days_pending || 1} days waiting`;
      case "announcement":
        return payload.message || "";
      default:
        return "";
    }
  };

  const getTaskOrCampaignTitle = (notification: any) => {
    const payload = notification.payload_json;
    return payload.task_title || payload.campaign_title || null;
  };

  const getContentPreview = (notification: any) => {
    const data = enrichedData.get(notification.id) || {};
    
    if (notification.type === "comment_mention" && data.commentBody) {
      // Strip HTML and truncate
      const text = data.commentBody.replace(/<[^>]*>/g, '');
      return text.length > 120 ? text.substring(0, 120) + "..." : text;
    }
    
    return null;
  };

  const getPriorityBadge = (type: string) => {
    if (type.includes("overdue") || type.includes("blocker")) {
      return <Badge variant="destructive" className="text-metadata">Urgent</Badge>;
    }
    if (type.includes("1day") || type.includes("approval")) {
      return <Badge variant="default" className="text-metadata bg-orange-500">High</Badge>;
    }
    return null;
  };

  const groupByDate = (notifs: any[]) => {
    const groups: Record<string, any[]> = {
      Today: [],
      Yesterday: [],
      "This Week": [],
      Older: []
    };

    notifs.forEach(n => {
      const date = new Date(n.created_at);
      if (isToday(date)) {
        groups.Today.push(n);
      } else if (isYesterday(date)) {
        groups.Yesterday.push(n);
      } else if (isThisWeek(date, { weekStartsOn: 1 })) {
        groups["This Week"].push(n);
      } else {
        groups.Older.push(n);
      }
    });

    return groups;
  };

  const notificationTypes = Array.from(new Set(notifications.map(n => n.type)));
  const groupedNotifications = groupByDate(filteredNotifications);

  // Wait for auth to resolve first
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="px-md sm:px-lg lg:px-12 py-lg lg:py-8 space-y-lg lg:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md">
        <div>
          <h1 className="text-page-title">Notifications</h1>
          <p className="text-body text-muted-foreground">
            Stay updated with your tasks, mentions, and important updates
          </p>
        </div>
        <Badge variant="outline" className="text-metadata">
          {notifications.filter(n => !n.read_at).length} Unread
        </Badge>
      </div>

      <AnnouncementsSection />

      {/* Filters and Actions */}
      <div className="border border-border rounded p-md">
        <div className="flex flex-col md:flex-row gap-md">
          <Tabs value={readFilter} onValueChange={(v: any) => setReadFilter(v)} className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
              <TabsTrigger value="read">Read</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {notificationTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button onClick={markAllAsRead} variant="outline" size="sm">
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        </div>

        {selectedIds.length > 0 && (
          <div className="mt-md flex items-center gap-sm p-sm bg-muted rounded">
            <span className="text-body">{selectedIds.length} selected</span>
            <Button onClick={markSelectedAsRead} variant="outline" size="sm">
              <Check className="h-4 w-4 mr-2" />
              Mark Read
            </Button>
            <Button onClick={deleteSelected} variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button onClick={() => setSelectedIds([])} variant="ghost" size="sm">
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Grouped Notifications */}
      <div className="space-y-lg">
        {Object.entries(groupedNotifications).map(([group, notifs]) => (
          notifs.length > 0 && (
            <div key={group}>
              <h2 className="text-metadata uppercase tracking-wide mb-sm">{group}</h2>
              <div className="space-y-sm">
                {notifs.map((notification) => {
                  const taskTitle = getTaskOrCampaignTitle(notification);
                  const contentPreview = getContentPreview(notification);
                  
                  return (
                    <div
                      key={notification.id}
                      onClick={() => {
                        const taskId = notification.payload_json?.task_id;
                        if (taskId) {
                          markAsRead(notification.id);
                          handleOpenTask(taskId);
                        }
                      }}
                      className={`p-md border border-border rounded transition-smooth ${
                        notification.read_at ? "bg-background" : "bg-muted/30 border-l-4 border-l-primary"
                      } ${selectedIds.includes(notification.id) ? "ring-2 ring-primary" : ""} ${
                        notification.payload_json?.task_id ? "cursor-pointer hover:border-primary/50" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-md">
                        <div className="flex items-start gap-sm flex-1 min-w-0">
                          <Checkbox
                            checked={selectedIds.includes(notification.id)}
                            onCheckedChange={() => toggleSelect(notification.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0 space-y-sm">
                            {/* Title and type */}
                            <div className="flex items-center gap-sm flex-wrap">
                              <span className="text-heading-sm font-semibold text-foreground">
                                {getNotificationTitle(notification)}
                              </span>
                              {!notification.read_at && (
                                <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                                  New
                                </Badge>
                              )}
                              {getPriorityBadge(notification.type)}
                            </div>

                            {/* Task/Campaign title if available */}
                            {taskTitle && (
                              <div className="text-body font-medium text-foreground">
                                {taskTitle}
                              </div>
                            )}

                            {/* Message */}
                            <p className="text-body-sm text-muted-foreground">
                              {getNotificationMessage(notification)}
                            </p>

                            {/* Content preview (e.g., comment text) */}
                            {contentPreview && (
                              <div className="text-body-sm text-muted-foreground italic bg-muted/50 p-sm rounded border-l-2 border-border">
                                "{contentPreview}"
                              </div>
                            )}

                            {/* Metadata */}
                            <div className="flex items-center gap-3 text-metadata text-muted-foreground">
                              <span>{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</span>
                              <span>•</span>
                              <span className="capitalize">{notification.type.replace(/_/g, " ")}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {!notification.read_at && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markAsRead(notification.id)}
                              title="Mark as read"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {(userRole === "admin" || notification.user_id === user?.id) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteNotification(notification.id)}
                              className="hover:bg-destructive/10 hover:text-destructive"
                              title="Delete notification"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ))}

        {filteredNotifications.length === 0 && !dataLoading && (
          <div className="py-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-md" />
            <p className="text-body text-muted-foreground">
              {searchQuery || typeFilter !== "all" || readFilter !== "all"
                ? "No notifications match your filters"
                : "No notifications yet"}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
