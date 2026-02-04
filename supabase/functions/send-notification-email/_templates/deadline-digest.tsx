import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Button,
  Hr,
} from "https://esm.sh/@react-email/components@0.0.22";
import React from "https://esm.sh/react@18.3.1";

interface DigestTask {
  id: string;
  title: string;
  due_at: string;
  category: "overdue" | "tomorrow" | "three_days";
  days_info: string;
}

interface DeadlineDigestEmailProps {
  tasks: DigestTask[];
  date: string;
  tasksUrl: string;
  preferencesUrl: string;
}

export const DeadlineDigestEmail = ({
  tasks,
  date,
  tasksUrl,
  preferencesUrl,
}: DeadlineDigestEmailProps) => {
  const overdueTasks = tasks.filter((t) => t.category === "overdue");
  const tomorrowTasks = tasks.filter((t) => t.category === "tomorrow");
  const threeDayTasks = tasks.filter((t) => t.category === "three_days");

  return (
    <Html>
      <Head />
      <Preview>Your task deadline summary - {date}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>NaviqX</Text>
          </Section>

          <Heading style={h1}>Your Task Deadline Summary</Heading>
          <Text style={dateText}>{date}</Text>

          {overdueTasks.length > 0 && (
            <Section style={overdueSection}>
              <Text style={sectionHeader}>
                ⚠️ OVERDUE ({overdueTasks.length} task{overdueTasks.length > 1 ? "s" : ""})
              </Text>
              {overdueTasks.map((task) => (
                <Text key={task.id} style={taskItem}>
                  • <Link href={`${tasksUrl}?task=${task.id}`} style={taskLink}>{task.title}</Link>
                  <span style={taskMeta}> — {task.days_info}</span>
                </Text>
              ))}
            </Section>
          )}

          {tomorrowTasks.length > 0 && (
            <Section style={tomorrowSection}>
              <Text style={sectionHeader}>
                📅 DUE TOMORROW ({tomorrowTasks.length} task{tomorrowTasks.length > 1 ? "s" : ""})
              </Text>
              {tomorrowTasks.map((task) => (
                <Text key={task.id} style={taskItem}>
                  • <Link href={`${tasksUrl}?task=${task.id}`} style={taskLink}>{task.title}</Link>
                </Text>
              ))}
            </Section>
          )}

          {threeDayTasks.length > 0 && (
            <Section style={threeDaySection}>
              <Text style={sectionHeader}>
                📆 DUE IN 3 DAYS ({threeDayTasks.length} task{threeDayTasks.length > 1 ? "s" : ""})
              </Text>
              {threeDayTasks.map((task) => (
                <Text key={task.id} style={taskItem}>
                  • <Link href={`${tasksUrl}?task=${task.id}`} style={taskLink}>{task.title}</Link>
                </Text>
              ))}
            </Section>
          )}

          <Section style={buttonSection}>
            <Button style={button} href={tasksUrl}>
              View All Tasks →
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            <Link href={preferencesUrl} style={footerLink}>
              Manage email preferences
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default DeadlineDigestEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  marginBottom: "64px",
  borderRadius: "8px",
  maxWidth: "580px",
};

const logoSection = {
  textAlign: "center" as const,
  marginBottom: "32px",
};

const logoText = {
  fontSize: "28px",
  fontWeight: "bold",
  color: "#1a1a2e",
  margin: "0",
};

const h1 = {
  color: "#1a1a2e",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "1.3",
  margin: "0 0 8px",
  textAlign: "center" as const,
};

const dateText = {
  color: "#64748b",
  fontSize: "14px",
  textAlign: "center" as const,
  margin: "0 0 32px",
};

const overdueSection = {
  backgroundColor: "#fef2f2",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "16px",
  borderLeft: "4px solid #ef4444",
};

const tomorrowSection = {
  backgroundColor: "#fefce8",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "16px",
  borderLeft: "4px solid #eab308",
};

const threeDaySection = {
  backgroundColor: "#f0f9ff",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "16px",
  borderLeft: "4px solid #3b82f6",
};

const sectionHeader = {
  color: "#1a1a2e",
  fontSize: "14px",
  fontWeight: "700",
  margin: "0 0 12px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const taskItem = {
  color: "#525f7f",
  fontSize: "14px",
  lineHeight: "1.8",
  margin: "0",
};

const taskLink = {
  color: "#1a1a2e",
  textDecoration: "none",
  fontWeight: "500",
};

const taskMeta = {
  color: "#94a3b8",
  fontSize: "12px",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "32px 0 24px",
};

const button = {
  backgroundColor: "#3b82f6",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "24px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  textAlign: "center" as const,
  margin: "0",
};

const footerLink = {
  color: "#8898aa",
  textDecoration: "underline",
};
