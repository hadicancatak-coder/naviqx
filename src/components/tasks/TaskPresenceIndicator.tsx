import { useEffect, useState, useRef } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PresenceUser {
  user: string;
  timestamp: number;
  taskId: string;
}

interface TaskPresenceIndicatorProps {
  taskId: string;
  editMode: boolean;
}

// Shared presence channel for all task editing - reduces channel count
const SHARED_PRESENCE_CHANNEL = 'task-editing-presence';

export function TaskPresenceIndicator({ taskId, editMode }: TaskPresenceIndicatorProps) {
  const { user } = useAuth();
  const [editingUsers, setEditingUsers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!taskId || !user) return;

    // Use a single shared channel for all task presence
    const channel = supabase.channel(SHARED_PRESENCE_CHANNEL)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            // Only show users editing the same task
            if (presence.user && presence.timestamp && presence.taskId === taskId) {
              users.push({ 
                user: presence.user, 
                timestamp: presence.timestamp,
                taskId: presence.taskId
              });
            }
          });
        });
        setEditingUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && editMode) {
          await channel.track({ 
            user: user.email?.split('@')[0] || 'Unknown',
            timestamp: Date.now(),
            taskId // Include taskId in presence payload
          });
        }
      });

    channelRef.current = channel;

    return () => {
      // Untrack but don't remove channel (other components may use it)
      if (channelRef.current) {
        channelRef.current.untrack();
      }
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
