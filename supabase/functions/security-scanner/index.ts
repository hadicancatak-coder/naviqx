import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SecurityFinding {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: Record<string, unknown>;
  count?: number;
}

interface MfaAttempt {
  user_id: string;
  success: boolean;
  ip_address: string;
}

interface UserSession {
  user_id: string;
  ip_address: string;
}

interface UserProfile {
  user_id: string;
  email: string;
  name: string;
}

interface SuspiciousActivity {
  id: string;
  activity_type: string;
  severity: string;
  created_at: string;
}

interface UserAggregation {
  count: number;
  ips: Set<string>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting security scan...');

    // Create scan record
    const { data: scanRecord, error: scanError } = await supabase
      .from('security_scan_results')
      .insert({
        scan_type: 'daily_security_scan',
        scan_status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (scanError) {
      console.error('Failed to create scan record');
      throw scanError;
    }

    const findings: SecurityFinding[] = [];

    // 1. Check for expired MFA sessions
    console.log('Checking for expired MFA sessions...');
    const { data: expiredSessions } = await supabase
      .from('mfa_sessions')
      .select('id, user_id, expires_at')
      .lt('expires_at', new Date().toISOString());

    if (expiredSessions && expiredSessions.length > 0) {
      findings.push({
        type: 'expired_mfa_sessions',
        severity: 'low',
        description: 'Found expired MFA sessions that should be cleaned up',
        details: { count: expiredSessions.length },
        count: expiredSessions.length
      });

      // Cleanup expired sessions
      await supabase
        .from('mfa_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString());
      
      console.log(`Cleaned up ${expiredSessions.length} expired MFA sessions`);
    }

    // 2. Check for suspicious MFA failure patterns (>5 failures in 24 hours per user)
    console.log('Checking for suspicious MFA failure patterns...');
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: mfaFailuresRaw } = await supabase
      .from('mfa_verification_attempts')
      .select('user_id, success, ip_address')
      .eq('success', false)
      .gte('attempt_time', twentyFourHoursAgo);

    const mfaFailures = (mfaFailuresRaw ?? []) as MfaAttempt[];

    // Group by user and count failures
    const failuresByUser: Record<string, UserAggregation> = {};
    for (const attempt of mfaFailures) {
      const userId = attempt.user_id;
      if (!failuresByUser[userId]) {
        failuresByUser[userId] = { count: 0, ips: new Set() };
      }
      failuresByUser[userId].count++;
      failuresByUser[userId].ips.add(attempt.ip_address);
    }

    for (const [userId, userData] of Object.entries(failuresByUser)) {
      if (userData.count > 5) {
        findings.push({
          type: 'excessive_mfa_failures',
          severity: userData.count > 10 ? 'high' : 'medium',
          description: 'User has excessive MFA verification failures',
          details: {
            user_id: userId,
            failure_count: userData.count,
            unique_ips: userData.ips.size,
            time_window: '24 hours'
          }
        });

        // Log suspicious activity
        await supabase
          .from('suspicious_activities')
          .insert({
            user_id: userId,
            activity_type: 'excessive_mfa_failures',
            severity: userData.count > 10 ? 'high' : 'medium',
            details: {
              failure_count: userData.count,
              unique_ips: userData.ips.size
            }
          });
      }
    }

    // 3. Check for accounts with MFA disabled (security risk)
    console.log('Checking for accounts without MFA enabled...');
    const { data: noMfaUsersRaw } = await supabase
      .from('profiles')
      .select('user_id, email, name')
      .eq('mfa_enabled', false);

    const noMfaUsers = (noMfaUsersRaw ?? []) as UserProfile[];

    if (noMfaUsers.length > 0) {
      findings.push({
        type: 'mfa_not_enabled',
        severity: 'medium',
        description: 'Users without MFA enabled detected',
        details: {
          count: noMfaUsers.length,
          users: noMfaUsers.map((u) => ({ email: u.email, name: u.name }))
        },
        count: noMfaUsers.length
      });
    }

    // 4. Check for unused MFA sessions (valid but not used in 30 days)
    console.log('Checking for stale MFA sessions...');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: staleSessions } = await supabase
      .from('mfa_sessions')
      .select('id, user_id, verified_at')
      .lt('verified_at', thirtyDaysAgo)
      .gt('expires_at', new Date().toISOString());

    if (staleSessions && staleSessions.length > 0) {
      findings.push({
        type: 'stale_mfa_sessions',
        severity: 'low',
        description: 'MFA sessions verified over 30 days ago but still valid',
        details: { count: staleSessions.length },
        count: staleSessions.length
      });
    }

    // 5. Check for multiple active sessions per user (potential account sharing)
    console.log('Checking for multiple active sessions per user...');
    const { data: activeSessionsRaw } = await supabase
      .from('mfa_sessions')
      .select('user_id, ip_address')
      .gt('expires_at', new Date().toISOString());

    const activeSessions = (activeSessionsRaw ?? []) as UserSession[];

    const sessionsByUser: Record<string, UserAggregation> = {};
    for (const session of activeSessions) {
      const userId = session.user_id;
      if (!sessionsByUser[userId]) {
        sessionsByUser[userId] = { count: 0, ips: new Set() };
      }
      sessionsByUser[userId].count++;
      sessionsByUser[userId].ips.add(session.ip_address);
    }

    for (const [userId, userData] of Object.entries(sessionsByUser)) {
      if (userData.count > 3 || userData.ips.size > 3) {
        findings.push({
          type: 'multiple_active_sessions',
          severity: 'medium',
          description: 'User has multiple active MFA sessions from different IPs',
          details: {
            user_id: userId,
            session_count: userData.count,
            unique_ips: userData.ips.size
          }
        });

        await supabase
          .from('suspicious_activities')
          .insert({
            user_id: userId,
            activity_type: 'multiple_active_sessions',
            severity: 'medium',
            details: {
              session_count: userData.count,
              unique_ips: userData.ips.size
            }
          });
      }
    }

    // 6. Check for old unresolved suspicious activities
    console.log('Checking for unresolved suspicious activities...');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: unresolvedActivitiesRaw } = await supabase
      .from('suspicious_activities')
      .select('id, activity_type, severity, created_at')
      .eq('resolved', false)
      .lt('created_at', sevenDaysAgo);

    const unresolvedActivities = (unresolvedActivitiesRaw ?? []) as SuspiciousActivity[];

    if (unresolvedActivities.length > 0) {
      findings.push({
        type: 'unresolved_suspicious_activities',
        severity: 'high',
        description: 'Suspicious activities remain unresolved for over 7 days',
        details: {
          count: unresolvedActivities.length,
          activities: unresolvedActivities.map((a) => ({
            type: a.activity_type,
            severity: a.severity,
            age_days: Math.floor((Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24))
          }))
        },
        count: unresolvedActivities.length
      });
    }

    // Prepare summary
    const summary = {
      total_findings: findings.length,
      by_severity: {
        critical: findings.filter(f => f.severity === 'critical').length,
        high: findings.filter(f => f.severity === 'high').length,
        medium: findings.filter(f => f.severity === 'medium').length,
        low: findings.filter(f => f.severity === 'low').length
      },
      scan_duration_ms: Date.now() - new Date(scanRecord.started_at).getTime()
    };

    console.log('Scan summary:', summary);

    // Update scan record with results
    await supabase
      .from('security_scan_results')
      .update({
        scan_status: 'completed',
        findings: findings,
        summary: summary,
        completed_at: new Date().toISOString()
      })
      .eq('id', scanRecord.id);

    // Notify admins if critical or high severity findings
    const criticalFindings = findings.filter(f => f.severity === 'critical' || f.severity === 'high');
    
    if (criticalFindings.length > 0) {
      console.log('Critical findings detected, notifying admins...');
      
      const { data: adminUsers } = await supabase.rpc('get_admin_user_ids');
      
      if (adminUsers) {
        for (const admin of adminUsers as { user_id: string }[]) {
          await supabase
            .from('notifications')
            .insert({
              user_id: admin.user_id,
              type: 'security_alert',
              payload_json: {
                scan_id: scanRecord.id,
                critical_count: criticalFindings.length,
                total_findings: findings.length,
                summary: summary,
                top_findings: criticalFindings.slice(0, 3).map(f => ({
                  type: f.type,
                  severity: f.severity,
                  description: f.description
                }))
              }
            });
        }
      }
    }

    console.log('Security scan completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        scan_id: scanRecord.id,
        summary: summary,
        findings: findings
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in security-scanner:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
