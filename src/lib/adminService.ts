import { supabase } from "@/integrations/supabase/client";
import { logger } from "./logger";

interface BulkUpdateParams {
  userIds: string[];
  updates: {
    role?: 'admin' | 'member';
    working_days?: string;
    teams?: string[];
  };
}

interface AdminActionParams {
  action: string;
  targetUserId?: string;
  changes?: Record<string, unknown>;
}

class AdminService {
  async bulkUpdateUsers({ userIds, updates }: BulkUpdateParams) {
    try {
      const results = [];

      for (const userId of userIds) {
        // Update profile if there are profile fields
        if (updates.working_days || updates.teams) {
          const profileUpdates: Record<string, unknown> = {};
          if (updates.working_days) profileUpdates.working_days = updates.working_days;
          if (updates.teams) profileUpdates.teams = updates.teams;

          const { error: profileError } = await supabase
            .from('profiles')
            .update(profileUpdates)
            .eq('user_id', userId);

          if (profileError) {
            logger.error(`Error updating profile for user ${userId}`, profileError);
            results.push({ userId, success: false, error: profileError.message });
            continue;
          }
        }

        // Update role if specified
        if (updates.role) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .update({ role: updates.role })
            .eq('user_id', userId);

          if (roleError) {
            logger.error(`Error updating role for user ${userId}`, roleError);
            results.push({ userId, success: false, error: roleError.message });
            continue;
          }
        }

        results.push({ userId, success: true });

        // Audit log
        await this.auditAdminAction({
          action: 'bulk_update_users',
          targetUserId: userId,
          changes: updates,
        });
      }

      return results;
    } catch (err) {
      logger.error('Error in bulkUpdateUsers', err);
      throw err;
    }
  }

  async bulkDeleteUsers(userIds: string[]) {
    try {
      const results = [];

      for (const userId of userIds) {
        const { error } = await supabase.functions.invoke('delete-user', {
          body: { userId },
        });

        if (error) {
          logger.error(`Error deleting user ${userId}`, error);
          results.push({ userId, success: false, error: error.message });
          continue;
        }

        results.push({ userId, success: true });

        // Audit log
        await this.auditAdminAction({
          action: 'bulk_delete_users',
          targetUserId: userId,
        });
      }

      return results;
    } catch (err) {
      logger.error('Error in bulkDeleteUsers', err);
      throw err;
    }
  }

  async getSystemHealth() {
    try {
      // Get counts of various entities
      const [
        { count: userCount },
        { count: taskCount },
        { count: errorCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('tasks').select('*', { count: 'exact', head: true }),
        supabase.from('error_logs').select('*', { count: 'exact', head: true }).eq('resolved', false),
      ]);

      return {
        users: userCount || 0,
        tasks: taskCount || 0,
        unresolvedErrors: errorCount || 0,
      };
    } catch (err) {
      logger.error('Error fetching system health', err);
      return null;
    }
  }

  async auditAdminAction({ action, targetUserId, changes = {} }: AdminActionParams) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('admin_audit_log').insert([{
        admin_id: user.id,
        action,
        target_user_id: targetUserId,
        changes: changes as unknown as import('@/integrations/supabase/types').Json,
      }]);
    } catch (err) {
      logger.error('Error auditing admin action', err);
    }
  }

  async getAuditLogs(filters: { adminId?: string; action?: string; startDate?: Date; endDate?: Date } = {}) {
    try {
      let query = supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.adminId) query = query.eq('admin_id', filters.adminId);
      if (filters.action) query = query.eq('action', filters.action);
      if (filters.startDate) query = query.gte('created_at', filters.startDate.toISOString());
      if (filters.endDate) query = query.lte('created_at', filters.endDate.toISOString());

      const { data: logs, error } = await query;
      if (error) throw error;

      // Fetch admin and target profiles separately
      const adminIds = [...new Set(logs?.map(log => log.admin_id) || [])];
      const targetIds = [...new Set(logs?.map(log => log.target_user_id).filter(Boolean) || [])];
      const allUserIds = [...new Set([...adminIds, ...targetIds])];

      if (allUserIds.length === 0) {
        return logs?.map(log => ({ ...log, admin: null, target: null })) || [];
      }

      // Define type for profile row
      interface ProfileRow {
        user_id: string;
        name: string | null;
        email: string | null;
        avatar_url: string | null;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, email, avatar_url')
        .in('user_id', allUserIds);

      const profilesMap: Record<string, ProfileRow> = {};
      profiles?.forEach(p => { profilesMap[p.user_id] = p; });

      const enrichedLogs = logs?.map(log => ({
        ...log,
        admin: profilesMap[log.admin_id] || null,
        target: profilesMap[log.target_user_id] || null
      })) || [];

      return enrichedLogs;
    } catch (err) {
      logger.error('Error fetching audit logs', err);
      return [];
    }
  }
}

export const adminService = new AdminService();
