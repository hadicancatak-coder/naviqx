import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

/**
 * Hook to track user site visits.
 * Records a visit once per hour per user to prevent duplicate counts.
 */
export function useVisitTracker(userId: string | null | undefined) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!userId || hasTracked.current) return;

    const trackVisit = async () => {
      try {
        // Generate visit_hour in UTC format matching the DB default
        const now = new Date();
        const visitHour = now.toISOString().slice(0, 13).replace("T", "-");

        // Attempt to insert - the unique constraint will prevent duplicates
        const { error } = await supabase.from("user_visits").insert({
          user_id: userId,
          visit_hour: visitHour,
        });

        // Ignore duplicate key errors (expected behavior)
        if (error && !error.message.includes("duplicate key")) {
          logger.error("Failed to track visit:", error.message);
        }

        hasTracked.current = true;
      } catch (err) {
        logger.error("Visit tracking error:", err);
      }
    };

    trackVisit();
  }, [userId]);
}
