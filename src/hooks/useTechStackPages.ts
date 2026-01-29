import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export interface TechStackPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  parent_id: string | null;
  icon: string;
  order_index: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  integrated_at: string | null;
  status: 'active' | 'deprecated' | 'planned' | 'under_review' | null;
  owner_id: string | null;
  children?: TechStackPage[];
}

export function useTechStackPages() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: pages, isLoading, isError } = useQuery({
    queryKey: ["tech-stack-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tech_stack_pages")
        .select("*")
        .order("order_index", { ascending: true });
      
      if (error) throw error;
      return data as TechStackPage[];
    },
    staleTime: 60 * 1000, // 1 minute - data doesn't change frequently
    placeholderData: (previousData) => previousData, // Show cached data instantly
  });

  // Build tree structure from flat list
  const buildTree = (items: TechStackPage[]): TechStackPage[] => {
    const map = new Map<string, TechStackPage>();
    const roots: TechStackPage[] = [];

    items.forEach(item => {
      map.set(item.id, { ...item, children: [] });
    });

    items.forEach(item => {
      const node = map.get(item.id)!;
      if (item.parent_id && map.has(item.parent_id)) {
        map.get(item.parent_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const pageTree = pages ? buildTree(pages) : [];

  const createPage = useMutation({
    mutationFn: async (data: { 
      title: string; 
      content?: string; 
      parent_id?: string | null; 
      icon?: string;
      integrated_at?: string | null;
      status?: string | null;
      owner_id?: string | null;
    }) => {
      const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const { data: newPage, error } = await supabase
        .from("tech_stack_pages")
        .insert({
          title: data.title,
          slug,
          content: data.content || '',
          parent_id: data.parent_id || null,
          icon: data.icon || 'server',
          integrated_at: data.integrated_at || null,
          status: data.status || 'active',
          owner_id: data.owner_id || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return newPage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-stack-pages"] });
      toast({ title: "Tech stack item created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create item", description: error.message, variant: "destructive" });
    },
  });

  const updatePage = useMutation({
    mutationFn: async ({ id, ...data }: { 
      id: string; 
      title?: string; 
      content?: string; 
      parent_id?: string | null; 
      icon?: string;
      integrated_at?: string | null;
      status?: string | null;
      owner_id?: string | null;
    }) => {
      const updateData: Record<string, unknown> = { ...data };
      if (data.title) {
        updateData.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
      // Set updated_by to current user
      if (user?.id) {
        updateData.updated_by = user.id;
      }
      
      const { data: updated, error } = await supabase
        .from("tech_stack_pages")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-stack-pages"] });
      toast({ title: "Tech stack item updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update item", description: error.message, variant: "destructive" });
    },
  });

  const deletePage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tech_stack_pages")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-stack-pages"] });
      toast({ title: "Tech stack item deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete item", description: error.message, variant: "destructive" });
    },
  });

  return {
    pages,
    pageTree,
    isLoading,
    isError,
    createPage,
    updatePage,
    deletePage,
  };
}
