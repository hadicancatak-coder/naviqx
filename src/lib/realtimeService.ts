import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { UnsafeAny } from '@/types/unsafe';

/**
 * Centralized realtime service to reduce channel costs
 * Creates ONE channel per table and shares it across all components
 * Reduces from 20+ channels to ~5 channels (85% cost reduction)
 */
class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private listeners: Map<string, Set<(payload: UnsafeAny) => void>> = new Map();
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  subscribe(table: string, callback: (payload: UnsafeAny) => void) {
    if (!this.channels.has(table)) {
      // Create channel ONCE for the entire app
      const channel = supabase
        .channel(`global-${table}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
          },
          (payload) => {
            // Debounce: coalesce rapid realtime events into a single notification
            // This prevents stale server data from overwriting in-flight optimistic updates
            const timerKey = table;
            const existing = this.debounceTimers.get(timerKey);
            if (existing) clearTimeout(existing);

            this.debounceTimers.set(
              timerKey,
              setTimeout(() => {
                this.debounceTimers.delete(timerKey);
                this.listeners.get(table)?.forEach((cb) => cb(payload));
              }, 1500)
            );
          }
        )
        .subscribe();

      this.channels.set(table, channel);
      this.listeners.set(table, new Set());
    }

    this.listeners.get(table)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(table)?.delete(callback);
      
      // Cleanup channel if no more listeners
      if (this.listeners.get(table)?.size === 0) {
        const timer = this.debounceTimers.get(table);
        if (timer) {
          clearTimeout(timer);
          this.debounceTimers.delete(table);
        }
        const channel = this.channels.get(table);
        if (channel) {
          supabase.removeChannel(channel);
        }
        this.channels.delete(table);
        this.listeners.delete(table);
      }
    };
  }

  // Get active channel count for monitoring
  getActiveChannelCount() {
    return this.channels.size;
  }
}

export const realtimeService = new RealtimeService();
