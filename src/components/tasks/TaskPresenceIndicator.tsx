import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PresenceUser {
  user: string;
  timestamp: number;
}

interface TaskPresenceIndicatorProps {
  taskId: string;
  editMode: boolean;
}

export function TaskPresenceIndicator({ taskId, editMode }: TaskPresenceIndicatorProps) {
  const { user } = useAuth();
  const [editingUsers, setEditingUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!taskId || !user) return;

    const channel = supabase.channel(`task-editing-${taskId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.user && presence.timestamp) {
              users.push({ user: presence.user, timestamp: presence.timestamp });
            }
          });
        });
        setEditingUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && editMode) {
          await channel.track({ 
            user: user.email?.split('@')[0] || 'Unknown',
            timestamp: Date.now() 
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, editMode, user]);

  const otherUsers = editingUsers.filter(u => u.user !== user?.email?.split('@')[0]);

  if (otherUsers.length === 0) return null;

  return (
    <Alert variant="default" className="mb-md border-primary/50 bg-primary/5">
      <Users className="h-4 w-4" />
      <AlertDescription>
        <strong>{otherUsers.map(u => u.user).join(', ')}</strong> {otherUsers.length === 1 ? 'is' : 'are'} currently editing this task
      </AlertDescription>
    </Alert>
  );
}
