import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, X } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { realtimeService } from "@/lib/realtimeService";

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: string;
  created_at: string;
}

export function NewsTicker() {
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [emblaRef] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: true, stopOnMouseEnter: true })
  ]);
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
      return (data || []) as Announcement[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - realtime handles updates
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

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
              <button 
                key={announcement.id} 
                type="button"
                className="flex-[0_0_100%] min-w-0 p-sm cursor-pointer hover:bg-muted/80 transition-smooth text-left w-full"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedAnnouncement(announcement);
                }}
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
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom modal without Dialog component */}
      {selectedAnnouncement && (
        <div 
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 9999 }}
        >
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setSelectedAnnouncement(null)}
          />
          
          {/* Content */}
          <div 
            className="relative bg-card border border-border rounded-2xl p-lg max-w-2xl w-full mx-md shadow-2xl"
            style={{ zIndex: 10000 }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setSelectedAnnouncement(null)}
              className="absolute right-md top-md rounded-sm opacity-70 hover:opacity-100 transition-smooth"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>

            {/* Header */}
            <div className="flex items-center gap-sm mb-md pr-lg">
              <Megaphone className="h-5 w-5 text-primary" />
              <h2 className="text-heading-md font-semibold">{selectedAnnouncement.title}</h2>
            </div>

            {/* Content */}
            <div className="space-y-md">
              <div className="flex items-center gap-sm">
                <Badge className={getPriorityColor(selectedAnnouncement.priority)}>
                  {selectedAnnouncement.priority}
                </Badge>
                <span className="text-metadata text-muted-foreground">
                  {new Date(selectedAnnouncement.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-body text-foreground whitespace-pre-wrap">
                {selectedAnnouncement.message}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
