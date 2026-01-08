import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export interface ProjectTimeline {
  id: string;
  project_id: string;
  phase_name: string;
  start_date: string;
  end_date: string;
  description: string | null;
  color: string;
  order_index: number;
  progress: number;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  purpose: string | null;
  outcomes: string | null;
  icon: string;
  slug: string | null;
  order_index: number;
  parent_id: string | null;
  is_public: boolean;
  public_token: string | null;
  status: 'planning' | 'active' | 'on-hold' | 'completed';
  click_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  required_time: number | null;
  children?: Project[];
  timelines?: ProjectTimeline[];
}

export interface ProjectAssignee {
  id: string;
  project_id: string;
  user_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);
}

function buildTree(items: Project[]): Project[] {
  const map = new Map<string, Project>();
  const roots: Project[] = [];

  items.forEach((item) => {
    map.set(item.id, { ...item, children: [] });
  });

  items.forEach((item) => {
    const node = map.get(item.id)!;
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export function useProjects() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as Project[];
    },
  });

  const tree = projects ? buildTree(projects) : [];

  const createProject = useMutation({
    mutationFn: async (project: Partial<Project> & { name: string }) => {
      const slug = generateSlug(project.name);
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: project.name,
          description: project.description || null,
          purpose: project.purpose || null,
          outcomes: project.outcomes || null,
          icon: project.icon || "folder-kanban",
          slug,
          parent_id: project.parent_id || null,
          status: project.status || "planning",
          created_by: user?.id,
          due_date: project.due_date || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Project created successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to create project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.name) {
        updateData.slug = generateSlug(updates.name);
      }

      const { data, error } = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Project updated successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to update project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Project deleted successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const togglePublic = useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      const { error } = await supabase
        .from("projects")
        .update({ is_public: isPublic })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const ensurePublicToken = useMutation({
    mutationFn: async (id: string) => {
      const project = projects?.find((p) => p.id === id);
      if (project?.public_token) {
        return project.public_token;
      }

      const token = crypto.randomUUID();
      const { error } = await supabase
        .from("projects")
        .update({ public_token: token, is_public: true })
        .eq("id", id);

      if (error) throw error;
      return token;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  return {
    projects,
    tree,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
    togglePublic,
    ensurePublicToken,
  };
}

export function useProjectTimelines(projectId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: timelines, isLoading } = useQuery({
    queryKey: ["project-timelines", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_timelines")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as ProjectTimeline[];
    },
    enabled: !!projectId,
  });

  const createTimeline = useMutation({
    mutationFn: async (timeline: Partial<ProjectTimeline> & { project_id: string; phase_name: string }) => {
      const { data, error } = await supabase
        .from("project_timelines")
        .insert({
          project_id: timeline.project_id,
          phase_name: timeline.phase_name,
          start_date: timeline.start_date,
          end_date: timeline.end_date,
          description: timeline.description || null,
          color: timeline.color || "primary",
          progress: timeline.progress || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-timelines", projectId] });
      toast({ title: "Phase added" });
    },
    onError: (error) => {
      toast({ title: "Failed to add phase", description: error.message, variant: "destructive" });
    },
  });

  const updateTimeline = useMutation({
    mutationFn: async (timeline: Partial<ProjectTimeline> & { id: string }) => {
      // Only pass valid database columns
      const updates: Record<string, unknown> = {};
      if (timeline.phase_name !== undefined) updates.phase_name = timeline.phase_name;
      if (timeline.start_date !== undefined) updates.start_date = timeline.start_date;
      if (timeline.end_date !== undefined) updates.end_date = timeline.end_date;
      if (timeline.description !== undefined) updates.description = timeline.description;
      if (timeline.color !== undefined) updates.color = timeline.color;
      if (timeline.progress !== undefined) updates.progress = timeline.progress;
      if (timeline.order_index !== undefined) updates.order_index = timeline.order_index;

      const { data, error } = await supabase
        .from("project_timelines")
        .update(updates)
        .eq("id", timeline.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-timelines", projectId] });
      toast({ title: "Phase updated" });
    },
    onError: (error) => {
      toast({ title: "Failed to update phase", description: error.message, variant: "destructive" });
    },
  });

  const deleteTimeline = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_timelines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-timelines", projectId] });
      toast({ title: "Phase removed" });
    },
  });

  return {
    timelines,
    isLoading,
    createTimeline,
    updateTimeline,
    deleteTimeline,
  };
}

export function useProjectAssignees(projectId: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: assignees, isLoading } = useQuery({
    queryKey: ["project-assignees", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_assignees")
        .select(`
          id,
          project_id,
          user_id,
          assigned_at,
          assigned_by,
          profiles:user_id (id, name, email, avatar_url)
        `)
        .eq("project_id", projectId);

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const updateAssignees = useMutation({
    mutationFn: async (userIds: string[]) => {
      if (!projectId) throw new Error("No project ID");

      // Delete existing assignees
      await supabase.from("project_assignees").delete().eq("project_id", projectId);

      // Insert new assignees
      if (userIds.length > 0) {
        const { error } = await supabase.from("project_assignees").insert(
          userIds.map((userId) => ({
            project_id: projectId,
            user_id: userId,
            assigned_by: user?.id,
          }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-assignees", projectId] });
    },
  });

  return {
    assignees,
    isLoading,
    updateAssignees,
  };
}

export function useProjectTasks(projectId: string | null) {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["project-tasks", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  return { tasks, isLoading };
}
