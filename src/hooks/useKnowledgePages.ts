import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export interface KnowledgePage {
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
  is_public?: boolean;
  public_token?: string;
  children?: KnowledgePage[];
}

export function useKnowledgePages() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: pages, isLoading, isError } = useQuery({
    queryKey: ["knowledge-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_pages")
        .select("*")
        .order("order_index", { ascending: true });
      
      if (error) throw error;
      return data as KnowledgePage[];
    },
    staleTime: 60 * 1000, // 1 minute - data doesn't change frequently
    placeholderData: (previousData) => previousData, // Show cached data instantly
  });

  // Build tree structure from flat list
  const buildTree = (items: KnowledgePage[]): KnowledgePage[] => {
    const map = new Map<string, KnowledgePage>();
    const roots: KnowledgePage[] = [];

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
    mutationFn: async (data: { title: string; content?: string; parent_id?: string | null; icon?: string }) => {
      const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const { data: newPage, error } = await supabase
        .from("knowledge_pages")
        .insert({
          title: data.title,
          slug,
          content: data.content || '',
          parent_id: data.parent_id || null,
          icon: data.icon || 'file-text',
        })
        .select()
        .single();
      
      if (error) throw error;
      return newPage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-pages"] });
      toast({ title: "Page created" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create page", description: error.message, variant: "destructive" });
    },
  });

  const updatePage = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; content?: string; parent_id?: string | null; icon?: string }) => {
      const updateData: any = { ...data };
      if (data.title) {
        updateData.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
      // Set updated_by to current user
      if (user?.id) {
        updateData.updated_by = user.id;
      }
      
      const { data: updated, error } = await supabase
        .from("knowledge_pages")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-pages"] });
      toast({ title: "Page updated" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update page", description: error.message, variant: "destructive" });
    },
  });

  const deletePage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("knowledge_pages")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-pages"] });
      toast({ title: "Page deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete page", description: error.message, variant: "destructive" });
    },
  });

  const togglePublic = useMutation({
    mutationFn: async ({ id, is_public }: { id: string; is_public: boolean }) => {
      const { data, error } = await supabase
        .from("knowledge_pages")
        .update({ is_public })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-pages"] });
      toast({ 
        title: data.is_public ? "Page is now public" : "Page is now private",
        description: data.is_public ? "Anyone with the link can view this page" : "Only authenticated users can view this page"
      });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update sharing", description: error.message, variant: "destructive" });
    },
  });

  // Ensures a page has a public token (generates one if missing)
  const ensurePublicToken = useMutation({
    mutationFn: async (id: string) => {
      // First check if page already has a token
      const { data: existingPage, error: fetchError } = await supabase
        .from("knowledge_pages")
        .select("public_token, is_public")
        .eq("id", id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // If already has token, return the page data
      if (existingPage?.public_token) {
        return existingPage;
      }
      
      // Generate new token and mark as public
      const newToken = crypto.randomUUID();
      const { data, error } = await supabase
        .from("knowledge_pages")
        .update({ 
          public_token: newToken,
          is_public: true 
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-pages"] });
    },
    onError: (error: any) => {
      console.error("Failed to generate public token:", error);
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
    togglePublic,
    ensurePublicToken,
  };
}
