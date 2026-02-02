import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { logger } from "./logger";

type ErrorSeverity = 'critical' | 'warning' | 'info';
type ErrorType = 'database' | 'auth' | 'api' | 'edge_function' | 'frontend';

interface LogErrorParams {
  severity: ErrorSeverity;
  type: ErrorType;
  message: string;
  stack?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorFilters {
  severity?: ErrorSeverity;
  type?: ErrorType;
  resolved?: boolean;
  startDate?: Date;
  endDate?: Date;
  userId?: string;
}

class ErrorLogger {
  async logError({ severity, type, message, stack, metadata = {} }: LogErrorParams) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('error_logs')
        .insert([{
          severity,
          error_type: type,
          error_message: message,
          stack_trace: stack,
          user_id: user?.id,
          metadata: metadata as Json,
        }]);

      if (error) {
        logger.error('Failed to log error to database', error);
      }
    } catch (err) {
      logger.error('Error in errorLogger.logError', err);
    }
  }

  async getErrors(filters: ErrorFilters = {}) {
    try {
      let query = supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters.type) {
        query = query.eq('error_type', filters.type);
      }
      if (filters.resolved !== undefined) {
        query = query.eq('resolved', filters.resolved);
      }
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      const { data: errors, error } = await query;
      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set(errors?.map(e => e.user_id).filter(Boolean) || [])];
      
      if (userIds.length === 0) {
        return errors?.map(error => ({ ...error, profiles: null })) || [];
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, email, avatar_url')
        .in('user_id', userIds);

      const profilesMap: Record<string, unknown> = {};
      profiles?.forEach(p => profilesMap[p.user_id] = p);

      const enrichedErrors = errors?.map(error => ({
        ...error,
        profiles: profilesMap[error.user_id] || null
      })) || [];

      return enrichedErrors;
    } catch (err) {
      logger.error('Error fetching error logs', err);
      return [];
    }
  }

  async resolveError(errorId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('error_logs')
        .update({
          resolved: true,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', errorId);

      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('Error resolving error log', err);
      return false;
    }
  }

  async getErrorStats() {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('severity, error_type, resolved');

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        critical: data?.filter(e => e.severity === 'critical').length || 0,
        warning: data?.filter(e => e.severity === 'warning').length || 0,
        info: data?.filter(e => e.severity === 'info').length || 0,
        unresolved: data?.filter(e => !e.resolved).length || 0,
        resolved: data?.filter(e => e.resolved).length || 0,
        byType: {
          database: data?.filter(e => e.error_type === 'database').length || 0,
          auth: data?.filter(e => e.error_type === 'auth').length || 0,
          api: data?.filter(e => e.error_type === 'api').length || 0,
          edge_function: data?.filter(e => e.error_type === 'edge_function').length || 0,
          frontend: data?.filter(e => e.error_type === 'frontend').length || 0,
        },
      };

      return stats;
    } catch (err) {
      logger.error('Error fetching error stats', err);
      return null;
    }
  }

  async bulkResolveErrors(beforeDate: Date): Promise<{ count: number; success: boolean }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // First count how many will be affected
      const { count } = await supabase
        .from('error_logs')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false)
        .lt('created_at', beforeDate.toISOString());

      // Then update them
      const { error } = await supabase
        .from('error_logs')
        .update({
          resolved: true,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('resolved', false)
        .lt('created_at', beforeDate.toISOString());

      if (error) throw error;
      return { count: count || 0, success: true };
    } catch (err) {
      logger.error('Error bulk resolving errors', err);
      return { count: 0, success: false };
    }
  }
}

export const errorLogger = new ErrorLogger();
