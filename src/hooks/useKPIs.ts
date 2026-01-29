import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { TeamKPI, KPITarget, KPIAssignment, KPIWithRelations } from "@/types/kpi";
import { logger } from "@/lib/logger";

export function useKPIs() {
  const queryClient = useQueryClient();

  const { data: kpis, isLoading, isError } = useQuery({
    queryKey: ["kpis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpis")
        .select(`
          *,
          targets:kpi_targets(*),
          assignments:kpi_assignments(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as KPIWithRelations[];
    },
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const createKPI = useMutation({
    mutationFn: async (kpi: Partial<TeamKPI> & { targets: Partial<KPITarget>[] }) => {
      const { targets, ...kpiData } = kpi;
      
      const { data: newKPI, error: kpiError } = await supabase
        .from("kpis")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase insert requires partial type cast
        .insert(kpiData as any)
        .select()
        .single();

      if (kpiError) throw kpiError;

      if (targets && targets.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase insert requires dynamic type
        const targetsData = targets.map(t => ({ ...t, kpi_id: (newKPI as any).id }));
        const { error: targetsError } = await supabase
          .from("kpi_targets")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase insert requires partial type cast
          .insert(targetsData as any);

        if (targetsError) throw targetsError;
      }

      return newKPI;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      toast({ title: "Success", description: "KPI created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateKPI = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TeamKPI> & { id: string }) => {
      const { error } = await supabase
        .from("kpis")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase update requires partial type cast
        .update(updates as any)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      toast({ title: "Success", description: "KPI updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteKPI = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("kpis")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      toast({ title: "Success", description: "KPI deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const assignKPI = useMutation({
    mutationFn: async (assignment: Partial<KPIAssignment>) => {
      try {
        // Get the profile ID for assigned_by (current user doing the assignment)
        const { data: assignedByProfile, error: assignerError } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", assignment.assigned_by!)
          .single();

        if (assignerError) {
          logger.error("Error fetching assigner profile:", assignerError);
          throw new Error("Could not find your profile. Please try logging out and back in.");
        }

        if (!assignedByProfile) {
          throw new Error("Your profile was not found. Please contact support.");
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic assignment object for Supabase
        const finalAssignment: any = {
          ...assignment,
          assigned_by: assignedByProfile.id,
        };

        // If assigning to a user (not a team), convert user_id to profile ID
        if (assignment.user_id) {
          const { data: assignedUserProfile, error: userError } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", assignment.user_id)
            .single();

          if (userError) {
            logger.error("Error fetching assigned user profile:", userError);
            throw new Error("Could not find the user you're trying to assign to. Please try again.");
          }

          if (!assignedUserProfile) {
            throw new Error("The selected user profile was not found.");
          }
          
          finalAssignment.user_id = assignedUserProfile.id;
          finalAssignment.team_name = null;
        } else if (assignment.team_name) {
          // Team assignment
          finalAssignment.user_id = null;
        } else {
          throw new Error("Please select either a user or a team to assign the KPI to.");
        }

        const { error: insertError } = await supabase
          .from("kpi_assignments")
          .insert(finalAssignment);

        if (insertError) {
          logger.error("Error inserting KPI assignment:", insertError);
          
          // Provide more specific error messages based on common issues
          if (insertError.message.includes("violates row-level security")) {
            throw new Error("You don't have permission to assign KPIs. Please contact an administrator.");
          } else if (insertError.message.includes("foreign key")) {
            throw new Error("Invalid KPI or user selected. Please refresh and try again.");
          } else if (insertError.message.includes("null value")) {
            throw new Error("Missing required information. Please fill in all required fields.");
          } else {
            throw new Error(`Failed to assign KPI: ${insertError.message}`);
          }
        }

        logger.debug("KPI assignment created successfully");
      } catch (error) {
        logger.error("KPI assignment error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      toast({ 
        title: "Success", 
        description: "KPI assigned successfully. The user will be notified.",
      });
    },
    onError: (error: Error) => {
      logger.error("KPI assignment mutation error:", error);
      toast({ 
        title: "Assignment Failed", 
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive" 
      });
    },
  });

  const updateAssignmentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("kpi_assignments")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase update requires partial type cast
        .update({ status } as any)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      toast({ title: "Success", description: "Assignment status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    kpis: kpis || [],
    isLoading,
    isError,
    createKPI,
    updateKPI,
    deleteKPI,
    assignKPI,
    updateAssignmentStatus,
  };
}
