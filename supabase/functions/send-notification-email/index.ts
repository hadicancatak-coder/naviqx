import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { render } from "https://esm.sh/@react-email/render@0.0.12";
import React from "https://esm.sh/react@18.3.1";
import { TaskAssignedEmail } from "./_templates/task-assigned.tsx";
import { MentionEmail } from "./_templates/mention.tsx";
import { DeadlineDigestEmail } from "./_templates/deadline-digest.tsx";

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
        html = render(
          React.createElement(TaskAssignedEmail, {
            taskTitle,
            assignerName,
            dueDate,
            taskUrl: `${APP_URL}/tasks?task=${taskId}`,
            preferencesUrl: `${APP_URL}/settings/notifications`,
          })
        );
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
        html = render(
          React.createElement(MentionEmail, {
            taskTitle,
            mentionerName,
            context,
            taskUrl: `${APP_URL}/tasks?task=${taskId}`,
            preferencesUrl: `${APP_URL}/settings/notifications`,
          })
        );
        break;
      }

      case "deadline_digest": {
        const tasks = payload.tasks as Array<{
          id: string;
          title: string;
          due_at: string;
          category: "overdue" | "tomorrow" | "three_days";
          days_info: string;
        }>;
        const date = new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        subject = `Your task deadline summary - ${date}`;
        html = render(
          React.createElement(DeadlineDigestEmail, {
            tasks,
            date,
            tasksUrl: `${APP_URL}/tasks`,
            preferencesUrl: `${APP_URL}/settings/notifications`,
          })
        );
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
