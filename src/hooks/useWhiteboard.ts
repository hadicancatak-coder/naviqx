import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export type WhiteboardItemType = "sticky" | "text" | "task";

export interface WhiteboardItem {
  id: string;
  whiteboard_id: string;
  type: WhiteboardItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  content: string;
  metadata: Record<string, unknown>;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface WhiteboardConnector {
  id: string;
  whiteboard_id: string;
  from_item_id: string;
  to_item_id: string;
  color: string;
  stroke_width: number;
  created_at: string;
}

export interface Whiteboard {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CreateItemParams {
  type: WhiteboardItemType;
  x: number;
  y: number;
  color?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

interface UpdateItemParams {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  content?: string;
}

export function useWhiteboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: whiteboard, isLoading: isLoadingWhiteboard } = useQuery({
    queryKey: ["whiteboard", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: existing, error: fetchError } = await supabase
        .from("whiteboards")
        .select("*")
        .eq("created_by", user.id)
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (existing) return existing as Whiteboard;

      const { data: newBoard, error: createError } = await supabase
        .from("whiteboards")
        .insert({ name: "My Whiteboard", created_by: user.id })
        .select()
        .single();
      if (createError) throw createError;
      return newBoard as Whiteboard;
    },
    enabled: !!user?.id,
  });

  const { data: items = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ["whiteboard-items", whiteboard?.id],
    queryFn: async () => {
      if (!whiteboard?.id) return [];
      const { data, error } = await supabase
        .from("whiteboard_items")
        .select("*")
        .eq("whiteboard_id", whiteboard.id)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data || []) as WhiteboardItem[];
    },
    enabled: !!whiteboard?.id,
  });

  const { data: connectors = [], isLoading: isLoadingConnectors } = useQuery({
    queryKey: ["whiteboard-connectors", whiteboard?.id],
    queryFn: async () => {
      if (!whiteboard?.id) return [];
      const { data, error } = await supabase
        .from("whiteboard_connectors")
        .select("*")
        .eq("whiteboard_id", whiteboard.id);
      if (error) throw error;
      return (data || []) as WhiteboardConnector[];
    },
    enabled: !!whiteboard?.id,
  });

  const createItemMutation = useMutation({
    mutationFn: async (params: CreateItemParams) => {
      if (!whiteboard?.id) throw new Error("No whiteboard");
      const { data, error } = await supabase
        .from("whiteboard_items")
        .insert({
          whiteboard_id: whiteboard.id,
          type: params.type,
          x: params.x,
          y: params.y,
          width: params.type === "task" ? 280 : 200,
          height: params.type === "task" ? 120 : params.type === "sticky" ? 150 : 100,
          color: params.color ?? (params.type === "sticky" ? "#fef08a" : "transparent"),
          content: params.content ?? "",
          metadata: (params.metadata ?? {}) as Json,
          order_index: items.length,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiteboard-items", whiteboard?.id] });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (params: UpdateItemParams) => {
      const { id, ...updates } = params;
      const { error } = await supabase.from("whiteboard_items").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiteboard-items", whiteboard?.id] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whiteboard_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiteboard-items", whiteboard?.id] });
      queryClient.invalidateQueries({ queryKey: ["whiteboard-connectors", whiteboard?.id] });
    },
  });

  const createConnectorMutation = useMutation({
    mutationFn: async ({ fromItemId, toItemId }: { fromItemId: string; toItemId: string }) => {
      if (!whiteboard?.id) throw new Error("No whiteboard");
      const existing = connectors.find(
        c => (c.from_item_id === fromItemId && c.to_item_id === toItemId) ||
             (c.from_item_id === toItemId && c.to_item_id === fromItemId)
      );
      if (existing) { toast.info("Connection already exists"); return existing; }
      const { data, error } = await supabase
        .from("whiteboard_connectors")
        .insert({ whiteboard_id: whiteboard.id, from_item_id: fromItemId, to_item_id: toItemId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiteboard-connectors", whiteboard?.id] });
    },
  });

  const deleteConnectorMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whiteboard_connectors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiteboard-connectors", whiteboard?.id] });
    },
  });

  return {
    whiteboard,
    items,
    connectors,
    isLoading: isLoadingWhiteboard || isLoadingItems || isLoadingConnectors,
    createItem: createItemMutation.mutate,
    updateItem: updateItemMutation.mutate,
    saveItem: (_: { id: string }) => {},
    deleteItem: deleteItemMutation.mutate,
    createConnector: (fromItemId: string, toItemId: string) => createConnectorMutation.mutate({ fromItemId, toItemId }),
    deleteConnector: deleteConnectorMutation.mutate,
  };
}
