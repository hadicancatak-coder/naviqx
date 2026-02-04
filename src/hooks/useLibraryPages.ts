import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export type LibraryCategory = 'service' | 'project' | 'knowledge' | 'rules' | 'process';

export interface LibraryPage {
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
  category: LibraryCategory;
  project_id?: string | null;
  children?: LibraryPage[];
}

export const LIBRARY_CATEGORIES: { value: LibraryCategory; label: string; icon: string; description: string }[] = [
  { value: 'knowledge', label: 'Knowledge', icon: 'book-open', description: 'Documentation and guides' },
  { value: 'service', label: 'Service', icon: 'server', description: 'Tools and services we use' },
  { value: 'project', label: 'Project', icon: 'folder-kanban', description: 'Project documentation' },
  { value: 'rules', label: 'Rules', icon: 'scale', description: 'Guidelines and policies' },
  { value: 'process', label: 'Process', icon: 'workflow', description: 'Workflows and procedures' },
];

export function useLibraryPages(category?: LibraryCategory | null) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: pages, isLoading, isError } = useQuery({
    queryKey: ["library-pages", category],
    queryFn: async () => {
      let query = supabase
        .from("knowledge_pages")
        .select("*")
        .order("order_index", { ascending: true });
      
      if (category) {
        query = query.eq("category", category);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as LibraryPage[];
    },
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Build tree structure from flat list
  const buildTree = (items: LibraryPage[]): LibraryPage[] => {
    const map = new Map<string, LibraryPage>();
    const roots: LibraryPage[] = [];

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
      category?: LibraryCategory;
      project_id?: string | null;
    }) => {
      const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const { data: newPage, error } = await supabase
        .from("knowledge_pages")
        .insert({
          title: data.title,
          slug,
          content: data.content || '',
          parent_id: data.parent_id || null,
          icon: data.icon || 'file-text',
          category: data.category || 'knowledge',
          project_id: data.project_id || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return newPage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["library-pages"] });
      toast({ title: "Page created" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create page", description: error.message, variant: "destructive" });
    },
  });

  const updatePage = useMutation({
    mutationFn: async ({ id, ...data }: { 
      id: string; 
      title?: string; 
      content?: string; 
      parent_id?: string | null; 
      icon?: string;
      category?: LibraryCategory;
      project_id?: string | null;
    }) => {
      const updateData: Record<string, unknown> = { ...data };
      if (data.title) {
        updateData.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
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
      queryClient.invalidateQueries({ queryKey: ["library-pages"] });
      toast({ title: "Page updated" });
    },
    onError: (error: Error) => {
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
      queryClient.invalidateQueries({ queryKey: ["library-pages"] });
      toast({ title: "Page deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete page", description: error.message, variant: "destructive" });
    },
  });

  const ensurePublicToken = useMutation({
    mutationFn: async (id: string) => {
      const { data: existingPage, error: fetchError } = await supabase
        .from("knowledge_pages")
        .select("public_token, is_public")
        .eq("id", id)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (existingPage?.public_token) {
        return existingPage;
      }
      
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
      queryClient.invalidateQueries({ queryKey: ["library-pages"] });
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
    ensurePublicToken,
  };
}
