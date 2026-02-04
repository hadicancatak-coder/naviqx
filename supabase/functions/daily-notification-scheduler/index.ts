import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Type definitions for Supabase query results
interface TaskAssigneeProfile {
  user_id: string;
}

interface TaskAssignee {
  user_id: string;
  profiles: TaskAssigneeProfile | null;
}

interface TaskWithAssignees {
  id: string;
  title: string;
  due_at: string;
  approval_requested_at?: string;
  task_assignees: TaskAssignee[];
}

interface CampaignAssignee {
  user_id: string;
  profiles: TaskAssigneeProfile | null;
}

interface CampaignWithAssignees {
  id: string;
  title: string;
  launch_date: string;
  launch_campaign_assignees: CampaignAssignee[];
}

interface DigestTask {
  id: string;
  title: string;
  due_at: string;
  category: "overdue" | "tomorrow" | "three_days";
  days_info: string;
}

interface UserDigestData {
  user_id: string;
  tasks: DigestTask[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Security: Verify cron secret header
    const cronSecret = req.headers.get('X-Cron-Secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    
    if (!expectedSecret || cronSecret !== expectedSecret) {
      console.error('Unauthorized daily notification scheduler attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (Sunday) to 6 (Saturday)

    // Skip recurring task generation on weekends (Saturday and Sunday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Fetch all active recurring tasks
      const { data: recurringTasks, error: recurringTasksError } = await supabase
        .from("recurring_tasks")
        .select("*")
        .eq("is_active", true);

      if (recurringTasksError) {
        console.error("Error fetching recurring tasks:", recurringTasksError);
        throw recurringTasksError;
      }

      // Generate tasks for each recurring task
      for (const recurringTask of recurringTasks ?? []) {
        const { error: taskGenerationError } = await supabase.rpc("generate_recurring_task", {
          recurring_task_id: recurringTask.id,
        });

        if (taskGenerationError) {
          console.error("Error generating task:", taskGenerationError);
        }
      }
    }

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // ========== COLLECT ALL DEADLINE TASKS FOR EMAIL DIGEST ==========
    const userDigestMap = new Map<string, UserDigestData>();

    // Helper to add task to user's digest
    const addToDigest = (userId: string, task: DigestTask) => {
      if (!userDigestMap.has(userId)) {
        userDigestMap.set(userId, { user_id: userId, tasks: [] });
      }
      userDigestMap.get(userId)!.tasks.push(task);
    };

    // ========== 1. DEADLINE REMINDERS (3 days) ==========
    const { data: tasks3DaysRaw } = await supabase
      .from("tasks")
      .select(
        `
        id, title, due_at,
        task_assignees!inner(user_id, profiles!inner(user_id))
      `
      )
      .gte("due_at", threeDaysFromNow.toISOString().split("T")[0])
      .lt("due_at", new Date(threeDaysFromNow.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      .in("status", ["Backlog", "Ongoing"]);

    const tasks3Days = (tasks3DaysRaw ?? []) as unknown as TaskWithAssignees[];
    
    for (const task of tasks3Days) {
      for (const assignee of task.task_assignees) {
        const userId = assignee.profiles?.user_id;
        if (userId) {
          // In-app notification
          await supabase.rpc("send_notification", {
            p_user_id: userId,
            p_type: "deadline_reminder_3days",
            p_payload_json: {
              task_id: task.id,
              task_title: task.title,
              due_at: task.due_at,
              days_remaining: 3,
            },
          });
          
          // Add to email digest
          addToDigest(userId, {
            id: task.id,
            title: task.title,
            due_at: task.due_at,
            category: "three_days",
            days_info: "in 3 days",
          });
        }
      }
    }

    // ========== 2. DEADLINE REMINDERS (1 day) ==========
    const { data: tasks1DayRaw } = await supabase
      .from("tasks")
      .select(
        `
        id, title, due_at,
        task_assignees!inner(user_id, profiles!inner(user_id))
      `
      )
      .gte("due_at", oneDayFromNow.toISOString().split("T")[0])
      .lt("due_at", new Date(oneDayFromNow.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      .in("status", ["Backlog", "Ongoing"]);

    const tasks1Day = (tasks1DayRaw ?? []) as unknown as TaskWithAssignees[];
    
    for (const task of tasks1Day) {
      for (const assignee of task.task_assignees) {
        const userId = assignee.profiles?.user_id;
        if (userId) {
          // In-app notification
          await supabase.rpc("send_notification", {
            p_user_id: userId,
            p_type: "deadline_reminder_1day",
            p_payload_json: {
              task_id: task.id,
              task_title: task.title,
              due_at: task.due_at,
              days_remaining: 1,
            },
          });
          
          // Add to email digest
          addToDigest(userId, {
            id: task.id,
            title: task.title,
            due_at: task.due_at,
            category: "tomorrow",
            days_info: "tomorrow",
          });
        }
      }
    }

    // ========== 3. OVERDUE TASK REMINDERS ==========
    const { data: overdueTasksRaw } = await supabase
      .from("tasks")
      .select(
        `
        id, title, due_at,
        task_assignees!inner(user_id, profiles!inner(user_id))
      `
      )
      .lt("due_at", now.toISOString())
      .in("status", ["Backlog", "Ongoing"]);

    const overdueTasks = (overdueTasksRaw ?? []) as unknown as TaskWithAssignees[];
    
    for (const task of overdueTasks) {
      const daysOverdue = Math.floor((now.getTime() - new Date(task.due_at).getTime()) / (24 * 60 * 60 * 1000));
      
      for (const assignee of task.task_assignees) {
        const userId = assignee.profiles?.user_id;
        if (userId) {
          // In-app notification
          await supabase.rpc("send_notification", {
            p_user_id: userId,
            p_type: "deadline_reminder_overdue",
            p_payload_json: {
              task_id: task.id,
              task_title: task.title,
              due_at: task.due_at,
              days_overdue: daysOverdue,
            },
          });
          
          // Add to email digest
          addToDigest(userId, {
            id: task.id,
            title: task.title,
            due_at: task.due_at,
            category: "overdue",
            days_info: daysOverdue === 1 ? "1 day overdue" : `${daysOverdue} days overdue`,
          });
        }
      }
    }

    // ========== SEND EMAIL DIGESTS ==========
    let emailsSent = 0;
    let emailsSkipped = 0;

    for (const [userId, digestData] of userDigestMap) {
      if (digestData.tasks.length === 0) continue;

      // Check if user has email digest enabled
      const { data: prefData } = await supabase
        .from("notification_preferences")
        .select("email_enabled")
        .eq("user_id", userId)
        .eq("notification_type", "deadline_digest")
        .single();

      if (!prefData?.email_enabled) {
        emailsSkipped++;
        continue;
      }

      // Call the email function
      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            type: "deadline_digest",
            user_id: userId,
            payload: {
              tasks: digestData.tasks,
            },
          }),
        });

        if (emailResponse.ok) {
          emailsSent++;
          console.log(`Digest email sent to user ${userId} with ${digestData.tasks.length} tasks`);
        } else {
          const errorText = await emailResponse.text();
          console.error(`Failed to send digest email to ${userId}:`, errorText);
        }
      } catch (emailError) {
        console.error(`Error sending digest email to ${userId}:`, emailError);
      }
    }

    // ========== 4. CAMPAIGN LAUNCH REMINDERS (3 days) ==========
    const { data: upcomingCampaignsRaw } = await supabase
      .from("launch_pad_campaigns")
      .select(
        `
        id, title, launch_date,
        launch_campaign_assignees!inner(user_id, profiles!inner(user_id))
      `
      )
      .gte("launch_date", threeDaysFromNow.toISOString().split("T")[0])
      .lt("launch_date", new Date(threeDaysFromNow.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      .in("status", ["orbit", "ready"]);

    const upcomingCampaigns = (upcomingCampaignsRaw ?? []) as unknown as CampaignWithAssignees[];
    
    for (const campaign of upcomingCampaigns) {
      for (const assignee of campaign.launch_campaign_assignees) {
        await supabase.rpc("send_notification", {
          p_user_id: assignee.profiles?.user_id,
          p_type: "campaign_starting_soon",
          p_payload_json: {
            campaign_id: campaign.id,
            campaign_title: campaign.title,
            launch_date: campaign.launch_date,
            days_remaining: 3,
          },
        });
      }
    }

    // ========== 5. PENDING APPROVAL REMINDERS ==========
    const { data: pendingApprovalsRaw } = await supabase
      .from("tasks")
      .select(
        `
        id, title, approval_requested_at,
        task_assignees!inner(user_id, profiles!inner(user_id))
      `
      )
      .eq("pending_approval", true)
      .not("approval_requested_at", "is", null);

    const pendingApprovals = (pendingApprovalsRaw ?? []) as unknown as TaskWithAssignees[];
    
    for (const task of pendingApprovals) {
      const daysPending = Math.floor(
        (now.getTime() - new Date(task.approval_requested_at!).getTime()) / (24 * 60 * 60 * 1000)
      );

      if (daysPending >= 2) {
        for (const assignee of task.task_assignees) {
          await supabase.rpc("send_notification", {
            p_user_id: assignee.profiles?.user_id,
            p_type: "approval_pending",
            p_payload_json: {
              task_id: task.id,
              task_title: task.title,
              days_pending: daysPending,
            },
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notifications sent successfully",
        stats: {
          deadline_3days: tasks3Days.length,
          deadline_1day: tasks1Day.length,
          overdue: overdueTasks.length,
          campaigns: upcomingCampaigns.length,
          approvals: pendingApprovals.length,
          digest_emails_sent: emailsSent,
          digest_emails_skipped: emailsSkipped,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in daily-notification-scheduler:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
