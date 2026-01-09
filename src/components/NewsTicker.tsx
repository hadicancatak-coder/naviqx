import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, X } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { realtimeService } from "@/lib/realtimeService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function NewsTicker() {
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null);
  const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 5000, stopOnInteraction: false })]);
  const queryClient = useQueryClient();

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    staleTime: 60 * 1000, // 1 minute cache
  });

  // Use centralized realtime service
  useEffect(() => {
    const unsubscribe = realtimeService.subscribe("announcements", () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    });
    return unsubscribe;
  }, [queryClient]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-destructive text-destructive-foreground";
      case "high":
        return "bg-warning text-warning-foreground";
      case "normal":
        return "bg-primary text-primary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (announcements.length === 0) return null;

  return (
    <>
      <div className="bg-muted border border-border rounded overflow-hidden">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {announcements.map((announcement) => (
              <div 
                key={announcement.id} 
                className="flex-[0_0_100%] min-w-0 p-sm cursor-pointer hover:bg-muted/80 transition-smooth"
                onClick={() => setSelectedAnnouncement(announcement)}
              >
                <div className="flex items-center justify-center gap-sm">
                  <Megaphone className="h-4 w-4 text-primary flex-shrink-0" />
                  <Badge className={getPriorityColor(announcement.priority)}>
                    {announcement.priority}
                  </Badge>
                  <span className="font-medium text-foreground">{announcement.title}</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="text-body text-muted-foreground truncate">{announcement.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!selectedAnnouncement} onOpenChange={(open) => !open && setSelectedAnnouncement(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-sm">
              <Megaphone className="h-5 w-5 text-primary" />
              {selectedAnnouncement?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-md">
            <div className="flex items-center gap-sm">
              <Badge className={getPriorityColor(selectedAnnouncement?.priority)}>
                {selectedAnnouncement?.priority}
              </Badge>
              <span className="text-metadata text-muted-foreground">
                {selectedAnnouncement?.created_at && new Date(selectedAnnouncement.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-body text-foreground whitespace-pre-wrap">
              {selectedAnnouncement?.message}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
