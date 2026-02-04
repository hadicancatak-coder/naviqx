import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Bell, Mail } from "lucide-react";

// Notification types that support email
const EMAIL_SUPPORTED_TYPES = ["task_assigned", "mention", "deadline_digest"];

const NOTIFICATION_TYPES = [
  { id: "task_assigned", label: "Task assignments", description: "When you're assigned to a task", hasEmail: true },
  { id: "mention", label: "Mentions", description: "When someone mentions you", hasEmail: true },
  { id: "deadline_digest", label: "Deadline digest", description: "Daily summary of upcoming/overdue tasks", hasEmail: true },
  { id: "task_new_comment", label: "Task comments", description: "When someone comments on your tasks", hasEmail: false },
  { id: "task_deadline_changed", label: "Deadline changes", description: "When task due dates change", hasEmail: false },
  { id: "task_priority_changed", label: "Priority changes", description: "When task priority changes", hasEmail: false },
  { id: "task_status_changed", label: "Task status changes", description: "When task status updates", hasEmail: false },
  { id: "campaign_starting_soon", label: "Campaign reminders", description: "Campaign launching soon", hasEmail: false },
  { id: "campaign_status_changed", label: "Campaign status changes", description: "Launch Pad updates", hasEmail: false },
  { id: "blocker_resolved", label: "Blocker resolved", description: "When blockers are cleared", hasEmail: false },
  { id: "approval_pending", label: "Approval reminders", description: "Pending approval notifications", hasEmail: false },
  { id: "announcement", label: "Announcements", description: "System-wide announcements", hasEmail: false },
];

interface Preferences {
  [key: string]: {
    enabled: boolean;
    email_enabled: boolean;
  };
}

export function NotificationPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<Preferences>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreferences = async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("notification_type, enabled, email_enabled")
        .eq("user_id", user?.id);

      const prefs: Preferences = {};
      NOTIFICATION_TYPES.forEach((type) => {
        const pref = data?.find((p) => p.notification_type === type.id);
        prefs[type.id] = {
          enabled: pref ? pref.enabled : true,
          email_enabled: pref?.email_enabled ?? false,
        };
      });

      setPreferences(prefs);
      setLoading(false);
    };

    if (user) {
      loadPreferences();
    }
  }, [user]);

  const togglePreference = async (notificationType: string, field: "enabled" | "email_enabled") => {
    const currentValue = preferences[notificationType]?.[field] ?? (field === "enabled" ? true : false);
    const newValue = !currentValue;
    
    setPreferences({
      ...preferences,
      [notificationType]: {
        ...preferences[notificationType],
        [field]: newValue,
      },
    });

    const { error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: user?.id,
          notification_type: notificationType,
          [field]: newValue,
          // Preserve the other field's value
          ...(field === "enabled" 
            ? { email_enabled: preferences[notificationType]?.email_enabled ?? false }
            : { enabled: preferences[notificationType]?.enabled ?? true }
          ),
        },
        { onConflict: "user_id,notification_type" }
      );

    if (error) {
      setPreferences({
        ...preferences,
        [notificationType]: {
          ...preferences[notificationType],
          [field]: currentValue,
        },
      });
      toast({
        title: "Error",
        description: "Failed to update preference",
        variant: "destructive",
      });
    } else {
      const label = field === "enabled" ? "In-app" : "Email";
      toast({
        title: "Updated",
        description: `${label} notification ${newValue ? "enabled" : "disabled"}`,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      {/* Header row */}
      <div className="hidden sm:grid sm:grid-cols-[1fr,auto,auto] gap-md items-center pb-2 border-b border-border">
        <div />
        <div className="flex items-center gap-1.5 text-metadata text-muted-foreground font-medium w-16 justify-center">
          <Bell className="h-3.5 w-3.5" />
          <span>In-app</span>
        </div>
        <div className="flex items-center gap-1.5 text-metadata text-muted-foreground font-medium w-16 justify-center">
          <Mail className="h-3.5 w-3.5" />
          <span>Email</span>
        </div>
      </div>

      {NOTIFICATION_TYPES.map((type) => (
        <div 
          key={type.id} 
          className="grid grid-cols-1 sm:grid-cols-[1fr,auto,auto] gap-md items-center py-3 border-b border-subtle last:border-0"
        >
          <div className="flex-1">
            <Label htmlFor={`${type.id}-enabled`} className="font-medium cursor-pointer">
              {type.label}
            </Label>
            <p className="text-body-sm text-muted-foreground">{type.description}</p>
          </div>
          
          {/* Mobile labels */}
          <div className="flex sm:hidden items-center justify-between gap-md">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-body-sm text-muted-foreground">In-app</span>
              <Switch
                id={`${type.id}-enabled`}
                checked={preferences[type.id]?.enabled ?? true}
                onCheckedChange={() => togglePreference(type.id, "enabled")}
              />
            </div>
            {type.hasEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-body-sm text-muted-foreground">Email</span>
                <Switch
                  id={`${type.id}-email`}
                  checked={preferences[type.id]?.email_enabled ?? false}
                  onCheckedChange={() => togglePreference(type.id, "email_enabled")}
                />
              </div>
            )}
          </div>

          {/* Desktop switches */}
          <div className="hidden sm:flex justify-center w-16">
            <Switch
              id={`${type.id}-enabled-desktop`}
              checked={preferences[type.id]?.enabled ?? true}
              onCheckedChange={() => togglePreference(type.id, "enabled")}
            />
          </div>
          <div className="hidden sm:flex justify-center w-16">
            {type.hasEmail ? (
              <Switch
                id={`${type.id}-email-desktop`}
                checked={preferences[type.id]?.email_enabled ?? false}
                onCheckedChange={() => togglePreference(type.id, "email_enabled")}
              />
            ) : (
              <span className="text-metadata text-muted-foreground">—</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
