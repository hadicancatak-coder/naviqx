import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useCallback, useRef } from "react";
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
  width?: number;
  height?: number;
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
  metadata?: Record<string, unknown>;
}

const DEFAULT_COLORS: Record<WhiteboardItemType, string> = {
  sticky: "#fef08a", // yellow
  text: "transparent",
  task: "#dbeafe", // blue
};

const DEFAULT_SIZES: Record<WhiteboardItemType, { width: number; height: number }> = {
  sticky: { width: 200, height: 150 },
  text: { width: 200, height: 60 },
  task: { width: 280, height: 100 },
};

export function useWhiteboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch user's whiteboard (create if doesn't exist)
  const { data: whiteboard, isLoading: isLoadingWhiteboard } = useQuery({
    queryKey: ["whiteboard", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Try to get existing whiteboard
      const { data: existing, error: fetchError } = await supabase
        .from("whiteboards")
        .select("*")
        .eq("created_by", user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) return existing as Whiteboard;

      // Create new whiteboard if none exists
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

  // Fetch whiteboard items
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

  // Create item mutation
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
          width: params.width ?? DEFAULT_SIZES[params.type].width,
          height: params.height ?? DEFAULT_SIZES[params.type].height,
          color: params.color ?? DEFAULT_COLORS[params.type],
          content: params.content ?? "",
          metadata: (params.metadata ?? {}) as Json,
          order_index: items.length,
        })
        .select()
        .single();

      if (error) throw error;
      return data as WhiteboardItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiteboard-items", whiteboard?.id] });
    },
    onError: (error) => {
      toast.error("Failed to create item", { description: error.message });
    },
  });

  // Update item mutation (debounced)
  const updateItemMutation = useMutation({
    mutationFn: async (params: UpdateItemParams) => {
      const { id, metadata, ...otherUpdates } = params;
      const updates: Record<string, unknown> = { ...otherUpdates };
      if (metadata !== undefined) {
        updates.metadata = metadata as Json;
      }
      const { error } = await supabase
        .from("whiteboard_items")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onError: (error) => {
      toast.error("Failed to save changes", { description: error.message });
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whiteboard_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiteboard-items", whiteboard?.id] });
    },
    onError: (error) => {
      toast.error("Failed to delete item", { description: error.message });
    },
  });

  // Debounced save function
  const debouncedSave = useCallback((params: UpdateItemParams) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      updateItemMutation.mutate(params);
    }, 500);
  }, [updateItemMutation]);

  // Immediate save (for final position after drag)
  const saveItem = useCallback((params: UpdateItemParams) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    updateItemMutation.mutate(params);
  }, [updateItemMutation]);

  return {
    whiteboard,
    items,
    isLoading: isLoadingWhiteboard || isLoadingItems,
    createItem: createItemMutation.mutate,
    updateItem: debouncedSave,
    saveItem,
    deleteItem: deleteItemMutation.mutate,
    isCreating: createItemMutation.isPending,
    isSaving: updateItemMutation.isPending,
  };
}
