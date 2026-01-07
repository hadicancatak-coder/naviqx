import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GdnTargetList {
  id: string;
  name: string;
  entity: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GdnTargetItem {
  id: string;
  list_id: string;
  item_type: "website" | "youtube" | "app";
  url: string;
  name: string | null;
  ads_txt_has_google: boolean | null;
  ads_txt_checked_at: string | null;
  ads_txt_error: string | null;
  created_at: string;
}

export function useGdnTargetLists() {
  const queryClient = useQueryClient();

  // Fetch all target lists
  const { data: lists = [], isLoading: isLoadingLists } = useQuery({
    queryKey: ["gdn-target-lists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gdn_target_lists")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as GdnTargetList[];
    },
  });

  // Fetch all target items
  const { data: items = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ["gdn-target-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gdn_target_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as GdnTargetItem[];
    },
  });

  // Create target list
  const createList = useMutation({
    mutationFn: async (data: { name: string; entity: string; description?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data: result, error } = await supabase
        .from("gdn_target_lists")
        .insert({
          name: data.name,
          entity: data.entity,
          description: data.description || null,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gdn-target-lists"] });
      toast.success("Target list created");
    },
    onError: (error) => {
      toast.error("Failed to create target list");
      console.error(error);
    },
  });

  // Update target list
  const updateList = useMutation({
    mutationFn: async (data: { id: string; name?: string; entity?: string; description?: string }) => {
      const { id, ...updates } = data;
      const { error } = await supabase
        .from("gdn_target_lists")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gdn-target-lists"] });
      toast.success("Target list updated");
    },
    onError: (error) => {
      toast.error("Failed to update target list");
      console.error(error);
    },
  });

  // Delete target list
  const deleteList = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("gdn_target_lists")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gdn-target-lists"] });
      queryClient.invalidateQueries({ queryKey: ["gdn-target-items"] });
      toast.success("Target list deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete target list");
      console.error(error);
    },
  });

  // Add items to list
  const addItems = useMutation({
    mutationFn: async (data: { 
      listId: string; 
      items: Array<{ 
        item_type: string; 
        url: string; 
        name?: string;
        ads_txt_has_google?: boolean | null;
        ads_txt_checked_at?: string | null;
        ads_txt_error?: string | null;
      }> 
    }) => {
      const itemsToInsert = data.items.map((item) => ({
        list_id: data.listId,
        item_type: item.item_type,
        url: item.url,
        name: item.name || null,
        ads_txt_has_google: item.ads_txt_has_google ?? null,
        ads_txt_checked_at: item.ads_txt_checked_at ?? null,
        ads_txt_error: item.ads_txt_error ?? null,
      }));

      const { error } = await supabase
        .from("gdn_target_items")
        .insert(itemsToInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gdn-target-lists"] });
      queryClient.invalidateQueries({ queryKey: ["gdn-target-items"] });
      toast.success("Items added to list");
    },
    onError: (error) => {
      toast.error("Failed to add items");
      console.error(error);
    },
  });

  // Delete item
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("gdn_target_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gdn-target-items"] });
      toast.success("Item deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete item");
      console.error(error);
    },
  });

  // Update item (for saving ads.txt results)
  const updateItem = useMutation({
    mutationFn: async (data: { 
      id: string; 
      ads_txt_has_google?: boolean | null;
      ads_txt_checked_at?: string | null;
      ads_txt_error?: string | null;
    }) => {
      const { id, ...updates } = data;
      const { error } = await supabase
        .from("gdn_target_items")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gdn-target-items"] });
    },
    onError: (error) => {
      console.error("Failed to update item:", error);
    },
  });

  // Check ads.txt for a website
  const checkAdsTxt = useMutation({
    mutationFn: async (itemId: string) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) throw new Error("Item not found");

      const { data, error } = await supabase.functions.invoke("check-ads-txt", {
        body: { url: item.url, itemId: item.id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gdn-target-items"] });
    },
    onError: (error) => {
      toast.error("Failed to check ads.txt");
      console.error(error);
    },
  });

  // Get items for a specific list
  const getItemsByList = (listId: string) => {
    return items.filter((item) => item.list_id === listId);
  };

  // Get item counts by type for a list
  const getItemCounts = (listId: string) => {
    const listItems = getItemsByList(listId);
    return {
      websites: listItems.filter((i) => i.item_type === "website").length,
      youtube: listItems.filter((i) => i.item_type === "youtube").length,
      apps: listItems.filter((i) => i.item_type === "app").length,
      total: listItems.length,
    };
  };

  return {
    lists,
    items,
    isLoading: isLoadingLists || isLoadingItems,
    createList,
    updateList,
    deleteList,
    addItems,
    deleteItem,
    updateItem,
    checkAdsTxt,
    getItemsByList,
    getItemCounts,
  };
}
