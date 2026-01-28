import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { realtimeService } from "@/lib/realtimeService";

interface User {
  id: string;
  user_id: string;
  name: string;
  username?: string;
  avatar_url?: string;
  working_days?: string | null;
}

type EntityType = "task" | "project" | "campaign" | "blocker";

const TABLE_MAP: Record<EntityType, string> = {
  task: "task_assignees",
  project: "project_assignees",
  campaign: "campaign_assignees",
  blocker: "blocker_assignees",
};

const ENTITY_ID_COLUMN: Record<EntityType, string> = {
  task: "task_id",
  project: "project_id",
  campaign: "campaign_id",
  blocker: "blocker_id",
};

export function useRealtimeAssignees(entityType: EntityType, entityId: string) {
  const [assignees, setAssignees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const tableName = TABLE_MAP[entityType];
  const idColumn = ENTITY_ID_COLUMN[entityType];

  const fetchAssignees = useCallback(async () => {
    if (!entityId || entityId === '') {
      setAssignees([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from(tableName as any)
        .select("user_id")
        .eq(idColumn, entityId);

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = data.map((d: any) => d.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, user_id, name, username, avatar_url, working_days")
          .in("id", userIds);

        setAssignees((profiles as User[]) || []);
      } else {
        setAssignees([]);
      }
    } catch (err) {
      console.error(`Error fetching ${entityType} assignees:`, err);
    } finally {
      setLoading(false);
    }
  }, [entityId, tableName, idColumn, entityType]);

  useEffect(() => {
    if (!entityId || entityId === '') {
      setAssignees([]);
      setLoading(false);
      return;
    }

    fetchAssignees();

    // Use centralized realtime service - subscribe to table changes
    // Filter by entity ID in callback to avoid creating per-entity channels
    const unsubscribe = realtimeService.subscribe(tableName, (payload) => {
      // Only refetch if the change is for our entity
      if (payload.new?.[idColumn] === entityId || payload.old?.[idColumn] === entityId) {
        fetchAssignees();
      }
    });

    return unsubscribe;
  }, [fetchAssignees, tableName, idColumn, entityId]);

  return { assignees, loading, refetch: fetchAssignees };
}