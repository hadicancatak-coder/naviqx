import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export type WhiteboardItemType = "sticky" | "text" | "task" | "shape";

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

export type ConnectorLineStyle = "solid" | "dashed" | "dotted";

export interface WhiteboardConnector {
  id: string;
  whiteboard_id: string;
  from_item_id: string;
  to_item_id: string;
  color: string;
  stroke_width: number;
  label: string;
  line_style: ConnectorLineStyle;
  created_at: string;
}

export interface Whiteboard {
  id: string;
  name: string;
  description: string;
  project_id: string | null;
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

interface UpdateConnectorParams {
  id: string;
  label?: string;
  line_style?: ConnectorLineStyle;
  color?: string;
}

interface UpdateWhiteboardParams {
  id?: string;
  name?: string;
  description?: string;
  project_id?: string | null;
}

export function useWhiteboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all whiteboards for the user
  const { data: allWhiteboards = [], isLoading: isLoadingAllWhiteboards } = useQuery({
    queryKey: ["whiteboards", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("whiteboards")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Whiteboard[];
    },
    enabled: !!user?.id,
  });

  const { data: whiteboard, isLoading: isLoadingWhiteboard } = useQuery({
    queryKey: ["whiteboard", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: existing, error: fetchError } = await supabase
        .from("whiteboards")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
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
      return (data || []).map(c => ({
        ...c,
        label: c.label || "",
        line_style: (c.line_style || "solid") as ConnectorLineStyle,
      })) as WhiteboardConnector[];
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

  // Optimistic update for items to prevent lag
  const updateItemMutation = useMutation({
    mutationFn: async (params: UpdateItemParams) => {
      const { id, ...updates } = params;
      const { error } = await supabase.from("whiteboard_items").update(updates).eq("id", id);
      if (error) throw error;
      return params;
    },
    onMutate: async (params) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["whiteboard-items", whiteboard?.id] });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData<WhiteboardItem[]>(["whiteboard-items", whiteboard?.id]);

      // Optimistically update to the new value
      if (previousItems) {
        queryClient.setQueryData<WhiteboardItem[]>(
          ["whiteboard-items", whiteboard?.id],
          previousItems.map(item =>
            item.id === params.id ? { ...item, ...params } : item
          )
        );
      }

      return { previousItems };
    },
    onError: (err, params, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(["whiteboard-items", whiteboard?.id], context.previousItems);
      }
      toast.error("Failed to update item");
    },
    // Don't invalidate on success - optimistic update is already applied
    onSettled: () => {
      // Optionally refetch in background after a delay
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["whiteboard-items", whiteboard?.id] });
      }, 2000);
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

  const updateConnectorMutation = useMutation({
    mutationFn: async (params: UpdateConnectorParams) => {
      const { id, ...updates } = params;
      const { error } = await supabase.from("whiteboard_connectors").update(updates).eq("id", id);
      if (error) throw error;
      return params;
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: ["whiteboard-connectors", whiteboard?.id] });
      const previousConnectors = queryClient.getQueryData<WhiteboardConnector[]>(["whiteboard-connectors", whiteboard?.id]);
      if (previousConnectors) {
        queryClient.setQueryData<WhiteboardConnector[]>(
          ["whiteboard-connectors", whiteboard?.id],
          previousConnectors.map(c =>
            c.id === params.id ? { ...c, ...params } : c
          )
        );
      }
      return { previousConnectors };
    },
    onError: (err, params, context) => {
      if (context?.previousConnectors) {
        queryClient.setQueryData(["whiteboard-connectors", whiteboard?.id], context.previousConnectors);
      }
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

  // Whiteboard CRUD
  const updateWhiteboardMutation = useMutation({
    mutationFn: async (params: UpdateWhiteboardParams) => {
      const targetId = params.id || whiteboard?.id;
      if (!targetId) throw new Error("No whiteboard");
      const { id, ...updates } = params;
      const { error } = await supabase.from("whiteboards").update(updates).eq("id", targetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiteboard", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["whiteboards", user?.id] });
    },
  });

  const createWhiteboardMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!user?.id) throw new Error("No user");
      const { data, error } = await supabase
        .from("whiteboards")
        .insert({ name, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Whiteboard;
    },
    onSuccess: (newBoard) => {
      queryClient.invalidateQueries({ queryKey: ["whiteboards", user?.id] });
      // Auto-switch to new board
      queryClient.setQueryData(["whiteboard", user?.id], newBoard);
    },
  });

  const deleteWhiteboardMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whiteboards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiteboards", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["whiteboard", user?.id] });
    },
  });

  const switchWhiteboardMutation = useMutation({
    mutationFn: async (whiteboardId: string) => {
      return whiteboardId;
    },
    onSuccess: (whiteboardId) => {
      const selectedBoard = allWhiteboards.find(w => w.id === whiteboardId);
      if (selectedBoard) {
        queryClient.setQueryData(["whiteboard", user?.id], selectedBoard);
        queryClient.invalidateQueries({ queryKey: ["whiteboard-items", whiteboardId] });
        queryClient.invalidateQueries({ queryKey: ["whiteboard-connectors", whiteboardId] });
      }
    },
  });

  return {
    whiteboard,
    allWhiteboards,
    items,
    connectors,
    isLoading: isLoadingWhiteboard || isLoadingItems || isLoadingConnectors || isLoadingAllWhiteboards,
    createItem: createItemMutation.mutate,
    updateItem: updateItemMutation.mutate,
    saveItem: (_: { id: string }) => {},
    deleteItem: deleteItemMutation.mutate,
    createConnector: (fromItemId: string, toItemId: string) => createConnectorMutation.mutate({ fromItemId, toItemId }),
    updateConnector: updateConnectorMutation.mutate,
    deleteConnector: deleteConnectorMutation.mutate,
    updateWhiteboard: updateWhiteboardMutation.mutate,
    createWhiteboard: createWhiteboardMutation.mutate,
    deleteWhiteboard: deleteWhiteboardMutation.mutate,
    switchWhiteboard: switchWhiteboardMutation.mutate,
    clearSelection: () => queryClient.setQueryData(["whiteboard", user?.id], null),
  };
}
