import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecurrenceRule {
  type: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
  interval: number;
  days_of_week?: string[];
  day_of_month?: number;
  end_condition: 'never' | 'after_n' | 'until_date';
  end_value?: number | string;
}

const DAY_MAP: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
};

const DAY_NUMBER_TO_NAME: Record<number, string> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat'
};

// Max days to generate catch-up instances for
const MAX_CATCHUP_DAYS = 7;
// Max instances to generate per template in a single run
const MAX_INSTANCES_PER_TEMPLATE = 14;

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((b.getTime() - a.getTime()) / msPerDay);
}

function calculateNextOccurrence(
  rule: RecurrenceRule,
  fromDate: Date,
  occurrenceCount: number = 0
): Date | null {
  if (rule.type === 'none') return null;

  if (rule.end_condition === 'after_n' && typeof rule.end_value === 'number') {
    if (occurrenceCount >= rule.end_value) return null;
  }
  if (rule.end_condition === 'until_date' && typeof rule.end_value === 'string') {
    const endDate = new Date(rule.end_value);
    if (fromDate > endDate) return null;
  }

  const startOfFromDate = startOfDay(fromDate);
  let nextDate: Date;

  switch (rule.type) {
    case 'daily':
      nextDate = addDays(startOfFromDate, rule.interval);
      break;

    case 'weekly':
      if (rule.days_of_week && rule.days_of_week.length > 0) {
        nextDate = findNextWeekday(startOfFromDate, rule.days_of_week, rule.interval);
      } else {
        nextDate = addWeeks(startOfFromDate, rule.interval);
      }
      break;

    case 'monthly':
      nextDate = addMonths(startOfFromDate, rule.interval);
      if (rule.day_of_month) {
        const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        const targetDay = Math.min(rule.day_of_month, maxDay);
        nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), targetDay);
      }
      break;

    case 'custom':
      if (rule.days_of_week && rule.days_of_week.length > 0) {
        nextDate = findNextWeekday(startOfFromDate, rule.days_of_week, rule.interval);
      } else {
        nextDate = addDays(startOfFromDate, rule.interval);
      }
      break;

    default:
      return null;
  }

  if (rule.end_condition === 'until_date' && typeof rule.end_value === 'string') {
    const endDate = new Date(rule.end_value);
    if (nextDate > endDate) return null;
  }

  return nextDate;
}

function findNextWeekday(fromDate: Date, daysOfWeek: string[], weekInterval: number): Date {
  const currentDayIndex = fromDate.getDay();
  const targetDays = daysOfWeek.map(d => DAY_MAP[d.toLowerCase()]).sort((a, b) => a - b);
  
  for (const targetDay of targetDays) {
    if (targetDay > currentDayIndex) {
      return addDays(fromDate, targetDay - currentDayIndex);
    }
  }
  
  const daysUntilNextWeek = 7 - currentDayIndex + targetDays[0];
  const additionalWeeks = (weekInterval - 1) * 7;
  return addDays(fromDate, daysUntilNextWeek + additionalWeeks);
}

function parseRecurrenceRule(rrule: string | object | null): RecurrenceRule | null {
  if (!rrule) return null;
  
  try {
    if (typeof rrule === 'object') {
      return rrule as RecurrenceRule;
    }
    
    if (rrule.startsWith('{')) {
      return JSON.parse(rrule) as RecurrenceRule;
    }
    
    const parts = rrule.split(';').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const freq = parts.FREQ?.toLowerCase();
    const interval = parseInt(parts.INTERVAL || '1', 10);
    const byDay = parts.BYDAY?.split(',').map(d => {
      const dayMap: Record<string, string> = { MO: 'mon', TU: 'tue', WE: 'wed', TH: 'thu', FR: 'fri', SA: 'sat', SU: 'sun' };
      return dayMap[d] || d.toLowerCase();
    });

    return {
      type: (freq as RecurrenceRule['type']) || 'daily',
      interval,
      days_of_week: byDay,
      end_condition: 'never',
    };
  } catch {
    return null;
  }
}

function isWorkingDayForAssignees(
  date: Date,
  assigneeWorkingDays: Map<string, string[]>
): boolean {
  if (assigneeWorkingDays.size === 0) return true;

  const dayName = DAY_NUMBER_TO_NAME[date.getDay()];
  
  for (const [, workingDays] of assigneeWorkingDays) {
    if (!workingDays || workingDays.length === 0) return true;
    if (workingDays.some(wd => wd.toLowerCase() === dayName)) return true;
  }

  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Security: Verify cron secret, service role JWT, or authenticated user JWT
    const cronSecret = req.headers.get('X-Cron-Secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const hasCronSecret = expectedSecret && cronSecret === expectedSecret;
    const hasServiceRole = serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`;

    let hasValidUserJwt = false;
    if (!hasCronSecret && !hasServiceRole && authHeader?.startsWith('Bearer ')) {
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data, error } = await userClient.auth.getUser();
      hasValidUserJwt = !error && !!data?.user;
    }

    if (!hasCronSecret && !hasServiceRole && !hasValidUserJwt) {
      console.error('Unauthorized generate-recurring-tasks attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const today = startOfDay(now);
    console.log(`[generate-recurring-tasks] Running at ${now.toISOString()}`);

    // Find all templates that are due for generation
    const { data: templates, error: fetchError } = await supabase
      .from('tasks')
      .select(`
        *,
        task_assignees(user_id)
      `)
      .eq('is_recurrence_template', true)
      .not('next_run_at', 'is', null)
      .lte('next_run_at', now.toISOString());

    if (fetchError) {
      console.error('Error fetching templates:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${templates?.length || 0} templates due for generation`);

    // Fetch working_days for all assignees
    const allUserIds = new Set<string>();
    for (const template of templates || []) {
      for (const assignee of template.task_assignees || []) {
        allUserIds.add(assignee.user_id);
      }
    }

    const userWorkingDaysMap = new Map<string, string[]>();
    if (allUserIds.size > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, working_days')
        .in('user_id', Array.from(allUserIds));

      if (profilesError) {
        console.warn('Error fetching profiles for working_days:', profilesError);
      } else {
        for (const profile of profiles || []) {
          if (profile.working_days) {
            userWorkingDaysMap.set(profile.user_id, profile.working_days);
          }
        }
      }
    }

    const results = {
      processed: 0,
      created: 0,
      skipped_duplicate: 0,
      skipped_non_working_day: 0,
      fast_forwarded: 0,
      errors: [] as string[],
    };

    for (const template of templates || []) {
      try {
        const rule = parseRecurrenceRule(template.recurrence_rrule);
        if (!rule) {
          console.warn(`Template ${template.id} has invalid recurrence rule`);
          continue;
        }

        // Build working days map for this template's assignees
        const templateAssigneeWorkingDays = new Map<string, string[]>();
        for (const assignee of template.task_assignees || []) {
          const workingDays = userWorkingDaysMap.get(assignee.user_id);
          if (workingDays) {
            templateAssigneeWorkingDays.set(assignee.user_id, workingDays);
          }
        }

        let currentNextRun = new Date(template.next_run_at);
        let occurrenceCount = template.occurrence_count || 0;
        let instancesCreated = 0;

        // ===== BATCH CATCH-UP LOOP =====
        // Generate ALL overdue instances up to MAX_CATCHUP_DAYS old
        // Fast-forward anything older than that
        while (currentNextRun <= today && instancesCreated < MAX_INSTANCES_PER_TEMPLATE) {
          const daysOverdue = daysBetween(currentNextRun, today);

          // If more than MAX_CATCHUP_DAYS overdue, fast-forward to today
          if (daysOverdue > MAX_CATCHUP_DAYS) {
            console.log(`Template ${template.id}: fast-forwarding from ${currentNextRun.toISOString()} to today (${daysOverdue} days overdue)`);
            
            // Calculate next occurrence from today instead
            const nextFromToday = calculateNextOccurrence(rule, today, occurrenceCount);
            if (nextFromToday) {
              await supabase
                .from('tasks')
                .update({ 
                  next_run_at: nextFromToday.toISOString(), 
                  occurrence_count: occurrenceCount 
                })
                .eq('id', template.id);
            } else {
              await supabase
                .from('tasks')
                .update({ next_run_at: null, occurrence_count: occurrenceCount })
                .eq('id', template.id);
            }
            results.fast_forwarded++;
            break;
          }

          const occurrenceDateStr = currentNextRun.toISOString().split('T')[0];

          // Check working day
          const isWorkingDay = isWorkingDayForAssignees(currentNextRun, templateAssigneeWorkingDays);
          if (!isWorkingDay) {
            results.skipped_non_working_day++;
            const nextRun = calculateNextOccurrence(rule, currentNextRun, occurrenceCount);
            if (!nextRun) {
              await supabase
                .from('tasks')
                .update({ next_run_at: null, occurrence_count: occurrenceCount })
                .eq('id', template.id);
              break;
            }
            currentNextRun = nextRun;
            continue;
          }

          // Insert task instance — relies on unique constraint
          // idx_unique_template_occurrence to prevent duplicates.
          // No pre-check needed; ON CONFLICT is handled via error code.
          try {
            const { data: newTask, error: createError } = await supabase
              .from('tasks')
              .insert({
                title: template.title,
                description: template.description,
                priority: template.priority,
                status: template.status || 'Backlog',
                due_at: currentNextRun.toISOString(),
                entity: template.entity,
                project_id: template.project_id,
                labels: template.labels,
                created_by: template.created_by,
                template_task_id: template.id,
                occurrence_date: occurrenceDateStr,
                task_type: 'recurring',
                jira_link: template.jira_link,
                is_collaborative: template.is_collaborative ?? false,
                estimated_hours: template.estimated_hours,
                teams: template.teams,
              })
              .select()
              .single();

            if (createError) {
              // Unique constraint violation = already created by trigger or prior run
              if (createError.code === '23505') {
                console.debug(`[dedup] Skipped existing instance: template ${template.id} on ${occurrenceDateStr}`);
                results.skipped_duplicate++;
              } else {
                console.error(`Error creating instance for template ${template.id}:`, createError);
                results.errors.push(`Template ${template.id}: ${createError.message}`);
                break;
              }
            } else if (newTask) {
              // Copy assignees only if insert succeeded
              const assignees = template.task_assignees || [];
              if (assignees.length > 0) {
                await supabase
                  .from('task_assignees')
                  .insert(
                    assignees.map((a: { user_id: string }) => ({
                      task_id: newTask.id,
                      user_id: a.user_id,
                    }))
                  );
              }

              instancesCreated++;
              results.created++;
              console.log(`Created instance ${newTask.id} for template ${template.id} on ${occurrenceDateStr}`);
            }
          } catch (insertErr) {
            console.debug(`[dedup] Insert conflict for template ${template.id} on ${occurrenceDateStr}, skipping`);
            results.skipped_duplicate++;
          }

          // Advance to next occurrence
          occurrenceCount++;
          const nextRun = calculateNextOccurrence(rule, currentNextRun, occurrenceCount);
          if (!nextRun) {
            await supabase
              .from('tasks')
              .update({ next_run_at: null, occurrence_count: occurrenceCount })
              .eq('id', template.id);
            break;
          }
          currentNextRun = nextRun;

          // If we've caught up to the future, update template and stop
          if (currentNextRun > today) {
            await supabase
              .from('tasks')
              .update({ 
                next_run_at: currentNextRun.toISOString(), 
                occurrence_count: occurrenceCount 
              })
              .eq('id', template.id);
            break;
          }
        }

        // If the loop exited because of the instance cap with schedule still in the past,
        // force-advance next_run_at to break the stuck loop
        if (currentNextRun <= today && instancesCreated >= MAX_INSTANCES_PER_TEMPLATE) {
          console.warn(`Template ${template.id} hit instance cap — force-advancing next_run_at from today.`);
          const nextFromToday = calculateNextOccurrence(rule, today, occurrenceCount);
          await supabase
            .from('tasks')
            .update({
              next_run_at: nextFromToday ? nextFromToday.toISOString() : null,
              occurrence_count: occurrenceCount,
            })
            .eq('id', template.id);
          results.fast_forwarded++;
        }

        results.processed++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Error processing template ${template.id}:`, err);
        results.errors.push(`Template ${template.id}: ${errorMessage}`);
      }
    }

    console.log(`[generate-recurring-tasks] Complete:`, results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in generate-recurring-tasks:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
