import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type TicketStatus = "pending" | "update_needed" | "successful" | "failed";

export interface DevTicket {
  id: string;
  title: string;
  link: string | null;
  status: TicketStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  creator_name?: string;
}

const TICKETS_KEY = ["dev_tickets"] as const;

export function useTickets(filters?: { search?: string; status?: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...TICKETS_KEY, filters],
    queryFn: async () => {
      let q = supabase
        .from("dev_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        q = q.eq("status", filters.status);
      }
      if (filters?.search) {
        q = q.ilike("title", `%${filters.search}%`);
      }

      const { data, error } = await q;
      if (error) throw error;

      // Fetch creator names
      const userIds = [...new Set((data || []).map((t) => t.created_by).filter(Boolean))] as string[];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", userIds);
        profileMap = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = p.name || "Unknown";
          return acc;
        }, {} as Record<string, string>);
      }

      return (data || []).map((t) => ({
        ...t,
        status: t.status as TicketStatus,
        creator_name: t.created_by ? profileMap[t.created_by] || "Unknown" : "Unknown",
      })) as DevTicket[];
    },
    enabled: !!user,
  });

  const addTicket = useMutation({
    mutationFn: async (ticket: { title: string; link?: string; status?: TicketStatus }) => {
      const { error } = await supabase.from("dev_tickets").insert({
        title: ticket.title,
        link: ticket.link || null,
        status: ticket.status || "pending",
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKETS_KEY });
      toast.success("Ticket added");
    },
    onError: () => toast.error("Failed to add ticket"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TicketStatus }) => {
      const { error } = await supabase.from("dev_tickets").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKETS_KEY });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const deleteTicket = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dev_tickets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKETS_KEY });
      toast.success("Ticket deleted");
    },
    onError: () => toast.error("Failed to delete ticket"),
  });

  return { ...query, addTicket, updateStatus, deleteTicket };
}
