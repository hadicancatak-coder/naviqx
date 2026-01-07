import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useTaskDrawer } from "@/contexts/TaskDrawerContext";

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openTaskDrawer } = useTaskDrawer();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel("notification-bell")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user?.id)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(5);

    // Fast path: set notifications immediately, enrich async for comment types only
    const notifications = data || [];
    setNotifications(notifications);
    setUnreadCount(notifications.length);

    // Only enrich comment_mention types (batched)
    const commentIds = notifications
      .filter(n => n.type === "comment_mention" && (n.payload_json as any)?.comment_id)
      .map(n => (n.payload_json as any).comment_id);

    if (commentIds.length > 0) {
      const { data: comments } = await supabase
        .from("comments")
        .select("id, body")
        .in("id", commentIds);

      if (comments) {
        const commentMap = new Map(comments.map(c => [c.id, c.body?.substring(0, 60) || ""]));
        setNotifications(prev => prev.map(n => {
          const commentId = (n.payload_json as any)?.comment_id;
          if (n.type === "comment_mention" && commentId && commentMap.has(commentId)) {
            return { ...n, commentPreview: commentMap.get(commentId) };
          }
          return n;
        }));
      }
    }
  };

  const markAllRead = async () => {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user?.id)
      .is("read_at", null);
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleNotificationClick = async (notification: any) => {
    // Mark as read first
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notification.id);
    
    const payload = notification.payload_json || {};
    
    // If has task_id, open task drawer
    if (payload.task_id) {
      openTaskDrawer(payload.task_id);
      setPopoverOpen(false);
      return;
    }
    
    // If has campaign_id, navigate to campaigns
    if (payload.campaign_id) {
      setPopoverOpen(false);
      navigate("/campaigns");
      return;
    }
    
    // Otherwise go to notifications page
    setPopoverOpen(false);
    navigate("/notifications");
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task_assigned": return "📋";
      case "campaign_assigned": return "🚀";
      case "mention":
      case "comment_mention": 
      case "task_new_comment": return "💬";
      case "deadline_reminder_3days": return "⏰";
      case "deadline_reminder_1day": return "🔔";
      case "deadline_reminder_overdue": return "❗";
      case "blocker_resolved": return "✅";
      case "task_status_changed": return "🔄";
      case "campaign_status_changed": return "🔄";
      case "task_deadline_changed": return "📅";
      case "task_priority_changed": return "⚡";
      case "ad_status_changed": return "📢";
      case "ad_pending_review": return "👀";
      case "announcement": return "📢";
      default: return "🔔";
    }
  };

  const getNotificationMessage = (notification: any) => {
    const payload = notification.payload_json || {};
    const taskTitle = payload.task_title || payload.campaign_title || "";
    
    switch (notification.type) {
      case "task_assigned":
        return <span className="font-medium">Assigned: {taskTitle}</span>;
      case "comment_mention":
        return (
          <div>
            <span className="font-medium">Mentioned in: {taskTitle}</span>
            {notification.commentPreview && (
              <p className="text-muted-foreground text-metadata mt-1 italic">"{notification.commentPreview}..."</p>
            )}
          </div>
        );
      case "task_new_comment":
        return (
          <div>
            <span className="font-medium">Comment on: {taskTitle}</span>
            {payload.comment_preview && (
              <p className="text-muted-foreground text-metadata mt-1 italic">"{payload.comment_preview}..."</p>
            )}
          </div>
        );
      case "task_status_changed":
        return <span className="font-medium">{taskTitle} → {payload.new_status}</span>;
      case "task_deadline_changed":
        return <span className="font-medium">Due date: {taskTitle}</span>;
      case "task_priority_changed":
        return <span className="font-medium">Priority: {taskTitle} → {payload.new_priority}</span>;
      case "deadline_reminder_3days":
        return <span className="font-medium">Due in 3 days: {taskTitle}</span>;
      case "deadline_reminder_1day":
        return <span className="font-medium text-warning">Due tomorrow: {taskTitle}</span>;
      case "deadline_reminder_overdue":
        return <span className="font-medium text-destructive">Overdue: {taskTitle}</span>;
      case "blocker_resolved":
        return <span className="font-medium text-success">Unblocked: {taskTitle}</span>;
      case "campaign_assigned":
        return <span className="font-medium">Campaign: {taskTitle}</span>;
      case "campaign_status_changed":
        return <span className="font-medium">{taskTitle} → {payload.new_status}</span>;
      case "ad_status_changed":
        return <span className="font-medium">Ad: {payload.ad_name} → {payload.new_status}</span>;
      case "ad_pending_review":
        return <span className="font-medium">Review: {payload.ad_name}</span>;
      case "announcement":
        return (
          <div>
            <span className="font-medium">📢 {payload.title || "Announcement"}</span>
            {payload.message && (
              <p className="text-muted-foreground text-metadata mt-1 line-clamp-2">{payload.message}</p>
            )}
          </div>
        );
      default:
        return <span>{taskTitle || "New notification"}</span>;
    }
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-destructive text-destructive-foreground">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 overflow-hidden" align="end" sideOffset={8}>
        <div className="flex items-center justify-between p-md border-b border-border">
          <h3 className="text-heading-sm font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <>
                <Button variant="ghost" size="sm" onClick={markAllRead} className="text-metadata h-7 px-2">
                  Clear All
                </Button>
                <Badge variant="secondary">{unreadCount}</Badge>
              </>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-md text-center text-muted-foreground">
              No new notifications
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full p-sm hover:bg-card-hover transition-colors text-left flex gap-sm items-start"
                >
                  <div className="text-xl flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-body-sm">
                      {getNotificationMessage(notification)}
                    </div>
                    <div className="text-metadata text-muted-foreground mt-1">
                      {new Date(notification.created_at).toLocaleDateString()} at{" "}
                      {new Date(notification.created_at).toLocaleTimeString([], { 
                        hour: "2-digit", 
                        minute: "2-digit" 
                      })}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-sm border-t border-border">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setPopoverOpen(false);
              navigate("/notifications");
            }}
          >
            View All Notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
