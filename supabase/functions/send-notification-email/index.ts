import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Change this to your verified domain when ready
const EMAIL_FROM = "NaviqX <onboarding@resend.dev>";
const APP_URL = "https://naviqx.lovable.app";

interface EmailRequest {
  type: "task_assigned" | "mention" | "comment_mention" | "description_mention" | "deadline_digest";
  user_id: string;
  payload: Record<string, unknown>;
}

// HTML Email Templates using template literals
function taskAssignedEmail(props: {
  taskTitle: string;
  assignerName: string;
  dueDate?: string;
  taskUrl: string;
  preferencesUrl: string;
}): string {
  const dueDateHtml = props.dueDate 
    ? `<p style="color:#64748b;font-size:14px;margin:0">📅 Due: ${props.dueDate}</p>`
    : '';
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:40px 0">
  <div style="background-color:#ffffff;margin:0 auto;padding:40px 20px;max-width:580px;border-radius:8px">
    <div style="text-align:center;margin-bottom:32px">
      <p style="font-size:28px;font-weight:bold;color:#1a1a2e;margin:0">NaviqX</p>
    </div>
    <h1 style="color:#1a1a2e;font-size:24px;font-weight:600;text-align:center;margin:0 0 24px">New Task Assignment</h1>
    <p style="color:#525f7f;font-size:16px;margin:0 0 16px"><strong>${props.assignerName}</strong> assigned you to:</p>
    <div style="background-color:#f0f9ff;border-radius:8px;padding:20px;margin-bottom:24px;border-left:4px solid #3b82f6">
      <p style="color:#1a1a2e;font-size:18px;font-weight:600;margin:0 0 8px">"${props.taskTitle}"</p>
      ${dueDateHtml}
    </div>
    <div style="text-align:center;margin-bottom:24px">
      <a href="${props.taskUrl}" style="background-color:#3b82f6;border-radius:6px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;display:inline-block;padding:12px 24px">View Task →</a>
    </div>
    <hr style="border:none;border-top:1px solid #e6ebf1;margin:24px 0">
    <p style="color:#8898aa;font-size:12px;text-align:center;margin:0">
      <a href="${props.preferencesUrl}" style="color:#8898aa;text-decoration:underline">Manage email preferences</a>
    </p>
  </div>
</body>
</html>`;
}

function mentionEmail(props: {
  taskTitle: string;
  mentionerName: string;
  context: string;
  taskUrl: string;
  preferencesUrl: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:40px 0">
  <div style="background-color:#ffffff;margin:0 auto;padding:40px 20px;max-width:580px;border-radius:8px">
    <div style="text-align:center;margin-bottom:32px">
      <p style="font-size:28px;font-weight:bold;color:#1a1a2e;margin:0">NaviqX</p>
    </div>
    <h1 style="color:#1a1a2e;font-size:24px;font-weight:600;text-align:center;margin:0 0 24px">You were mentioned</h1>
    <p style="color:#525f7f;font-size:16px;margin:0 0 16px"><strong>${props.mentionerName}</strong> mentioned you ${props.context}:</p>
    <div style="background-color:#fef3c7;border-radius:8px;padding:20px;margin-bottom:24px;border-left:4px solid #f59e0b">
      <p style="color:#1a1a2e;font-size:18px;font-weight:600;margin:0">"${props.taskTitle}"</p>
    </div>
    <div style="text-align:center;margin-bottom:24px">
      <a href="${props.taskUrl}" style="background-color:#f59e0b;border-radius:6px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;display:inline-block;padding:12px 24px">View Task →</a>
    </div>
    <hr style="border:none;border-top:1px solid #e6ebf1;margin:24px 0">
    <p style="color:#8898aa;font-size:12px;text-align:center;margin:0">
      <a href="${props.preferencesUrl}" style="color:#8898aa;text-decoration:underline">Manage email preferences</a>
    </p>
  </div>
</body>
</html>`;
}

interface DigestTask {
  id: string;
  title: string;
  due_at: string;
  category: "overdue" | "tomorrow" | "three_days";
  days_info: string;
}

function deadlineDigestEmail(props: {
  tasks: DigestTask[];
  date: string;
  tasksUrl: string;
  preferencesUrl: string;
}): string {
  const overdueTasks = props.tasks.filter(t => t.category === "overdue");
  const tomorrowTasks = props.tasks.filter(t => t.category === "tomorrow");
  const threeDayTasks = props.tasks.filter(t => t.category === "three_days");
  
  let sectionsHtml = '';
  
  if (overdueTasks.length > 0) {
    sectionsHtml += `
    <div style="margin-bottom:24px">
      <p style="color:#dc2626;font-size:14px;font-weight:600;margin:0 0 8px;text-transform:uppercase">⚠️ OVERDUE (${overdueTasks.length} ${overdueTasks.length === 1 ? 'task' : 'tasks'})</p>
      ${overdueTasks.map(t => `<p style="color:#374151;font-size:15px;margin:4px 0;padding-left:8px">• ${t.title} - ${t.days_info}</p>`).join('')}
    </div>`;
  }
  
  if (tomorrowTasks.length > 0) {
    sectionsHtml += `
    <div style="margin-bottom:24px">
      <p style="color:#d97706;font-size:14px;font-weight:600;margin:0 0 8px;text-transform:uppercase">📅 DUE TOMORROW (${tomorrowTasks.length} ${tomorrowTasks.length === 1 ? 'task' : 'tasks'})</p>
      ${tomorrowTasks.map(t => `<p style="color:#374151;font-size:15px;margin:4px 0;padding-left:8px">• ${t.title}</p>`).join('')}
    </div>`;
  }
  
  if (threeDayTasks.length > 0) {
    sectionsHtml += `
    <div style="margin-bottom:24px">
      <p style="color:#2563eb;font-size:14px;font-weight:600;margin:0 0 8px;text-transform:uppercase">📆 DUE IN 3 DAYS (${threeDayTasks.length} ${threeDayTasks.length === 1 ? 'task' : 'tasks'})</p>
      ${threeDayTasks.map(t => `<p style="color:#374151;font-size:15px;margin:4px 0;padding-left:8px">• ${t.title}</p>`).join('')}
    </div>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:40px 0">
  <div style="background-color:#ffffff;margin:0 auto;padding:40px 20px;max-width:580px;border-radius:8px">
    <div style="text-align:center;margin-bottom:32px">
      <p style="font-size:28px;font-weight:bold;color:#1a1a2e;margin:0">NaviqX</p>
    </div>
    <h1 style="color:#1a1a2e;font-size:24px;font-weight:600;text-align:center;margin:0">Task Deadline Summary</h1>
    <p style="color:#64748b;font-size:14px;text-align:center;margin:8px 0 24px">${props.date}</p>
    ${sectionsHtml}
    <div style="text-align:center;margin-top:32px;margin-bottom:24px">
      <a href="${props.tasksUrl}" style="background-color:#3b82f6;border-radius:6px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;display:inline-block;padding:12px 24px">View All Tasks →</a>
    </div>
    <hr style="border:none;border-top:1px solid #e6ebf1;margin:24px 0">
    <p style="color:#8898aa;font-size:12px;text-align:center;margin:0">
      <a href="${props.preferencesUrl}" style="color:#8898aa;text-decoration:underline">Manage email preferences</a>
    </p>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: EmailRequest = await req.json();
    const { type, user_id, payload } = body;

    console.log(`Processing email request: type=${type}, user_id=${user_id}`);

    // Check if email notifications are enabled for this user and type
    const notificationType = type === "comment_mention" || type === "description_mention" ? "mention" : type;
    
    const { data: prefData } = await supabase
      .from("notification_preferences")
      .select("email_enabled")
      .eq("user_id", user_id)
      .eq("notification_type", notificationType)
      .single();

    if (!prefData?.email_enabled) {
      console.log(`Email notifications disabled for user ${user_id}, type ${notificationType}`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "email_disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's email from profiles
    const { data: profileData } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("user_id", user_id)
      .single();

    if (!profileData?.email) {
      console.error(`No email found for user ${user_id}`);
      return new Response(
        JSON.stringify({ success: false, error: "No email found for user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let html: string;
    let subject: string;

    // Render the appropriate template
    switch (type) {
      case "task_assigned": {
        const taskTitle = payload.task_title as string || "Untitled Task";
        const assignerName = payload.assigner_name as string || "Someone";
        const dueDate = payload.due_date as string | undefined;
        const taskId = payload.task_id as string;

        subject = `You've been assigned to: ${taskTitle}`;
        html = taskAssignedEmail({
          taskTitle,
          assignerName,
          dueDate,
          taskUrl: `${APP_URL}/tasks?task=${taskId}`,
          preferencesUrl: `${APP_URL}/settings/notifications`,
        });
        break;
      }

      case "mention":
      case "comment_mention":
      case "description_mention": {
        const taskTitle = payload.task_title as string || "a task";
        const mentionerName = payload.mentioner_name as string || payload.commenter_name as string || "Someone";
        const taskId = payload.task_id as string;
        const context = type === "comment_mention" ? "in a comment" : "in the description";

        subject = `${mentionerName} mentioned you in ${taskTitle}`;
        html = mentionEmail({
          taskTitle,
          mentionerName,
          context,
          taskUrl: `${APP_URL}/tasks?task=${taskId}`,
          preferencesUrl: `${APP_URL}/settings/notifications`,
        });
        break;
      }

      case "deadline_digest": {
        const tasks = payload.tasks as DigestTask[];
        const date = new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        subject = `Your task deadline summary - ${date}`;
        html = deadlineDigestEmail({
          tasks,
          date,
          tasksUrl: `${APP_URL}/tasks`,
          preferencesUrl: `${APP_URL}/settings/notifications`,
        });
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown email type: ${type}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Send email via Resend
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [profileData.email],
      subject,
      html,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return new Response(
        JSON.stringify({ success: false, error: emailError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Email sent successfully to ${profileData.email}:`, emailResult);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-notification-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
