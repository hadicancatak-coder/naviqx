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

function calculateNextOccurrence(
  rule: RecurrenceRule,
  fromDate: Date,
  occurrenceCount: number = 0
): Date | null {
  if (rule.type === 'none') return null;

  // Check end conditions
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
        nextDate = findNextWeekday(startOfFromDate, rule.days_of_week, 1);
      } else {
        nextDate = addDays(startOfFromDate, rule.interval);
      }
      break;

    default:
      return null;
  }

  // Final end date check
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
    
    // Parse legacy RRULE
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
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

    const results = {
      processed: 0,
      created: 0,
      errors: [] as string[],
    };

    for (const template of templates || []) {
      try {
        const rule = parseRecurrenceRule(template.recurrence_rrule);
        if (!rule) {
          console.warn(`Template ${template.id} has invalid recurrence rule`);
          continue;
        }

        const occurrenceDate = new Date(template.next_run_at);
        const occurrenceDateStr = occurrenceDate.toISOString().split('T')[0];

        // Check if instance already exists for this date
        const { data: existing } = await supabase
          .from('tasks')
          .select('id')
          .eq('template_task_id', template.id)
          .eq('occurrence_date', occurrenceDateStr)
          .maybeSingle();

        if (existing) {
          console.log(`Instance already exists for template ${template.id} on ${occurrenceDateStr}`);
          // Still update next_run_at
        } else {
          // Create new task instance
          const { data: newTask, error: createError } = await supabase
            .from('tasks')
            .insert({
              title: template.title,
              description: template.description,
              priority: template.priority,
              status: 'Pending',
              due_at: template.next_run_at,
              entity: template.entity,
              project_id: template.project_id,
              labels: template.labels,
              created_by: template.created_by,
              template_task_id: template.id,
              occurrence_date: occurrenceDateStr,
              task_type: 'recurring_instance',
              // Copy other relevant fields
              jira_link: template.jira_link,
            })
            .select()
            .single();

          if (createError) {
            console.error(`Error creating instance for template ${template.id}:`, createError);
            results.errors.push(`Template ${template.id}: ${createError.message}`);
            continue;
          }

          console.log(`Created task instance ${newTask.id} for template ${template.id}`);

          // Copy assignees
          const assignees = template.task_assignees || [];
          if (assignees.length > 0) {
            const { error: assigneeError } = await supabase
              .from('task_assignees')
              .insert(
                assignees.map((a: { user_id: string }) => ({
                  task_id: newTask.id,
                  user_id: a.user_id,
                }))
              );

            if (assigneeError) {
              console.warn(`Error copying assignees for task ${newTask.id}:`, assigneeError);
            }
          }

          results.created++;
        }

        // Calculate next occurrence
        const newOccurrenceCount = (template.occurrence_count || 0) + 1;
        const nextRun = calculateNextOccurrence(rule, occurrenceDate, newOccurrenceCount);

        // Update template
        const { error: updateError } = await supabase
          .from('tasks')
          .update({
            next_run_at: nextRun?.toISOString() || null,
            occurrence_count: newOccurrenceCount,
          })
          .eq('id', template.id);

        if (updateError) {
          console.error(`Error updating template ${template.id}:`, updateError);
          results.errors.push(`Template update ${template.id}: ${updateError.message}`);
        }

        results.processed++;
      } catch (err: unknown) {
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
  } catch (error: unknown) {
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
