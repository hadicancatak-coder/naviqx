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

interface MentionEmailProps {
  taskTitle: string;
  mentionerName: string;
  context: string;
  taskUrl: string;
  preferencesUrl: string;
}

export const MentionEmail = ({
  taskTitle,
  mentionerName,
  context,
  taskUrl,
  preferencesUrl,
}: MentionEmailProps) => (
  <Html>
    <Head />
    <Preview>{mentionerName} mentioned you in {taskTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>NaviqX</Text>
        </Section>

        <Heading style={h1}>You were mentioned</Heading>

        <Text style={text}>
          <strong>{mentionerName}</strong> mentioned you {context}:
        </Text>

        <Section style={taskBox}>
          <Text style={taskTitleStyle}>"{taskTitle}"</Text>
        </Section>

        <Section style={buttonSection}>
          <Button style={button} href={taskUrl}>
            View Task →
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

export default MentionEmail;

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
  margin: "0 0 24px",
  textAlign: "center" as const,
};

const text = {
  color: "#525f7f",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 16px",
};

const taskBox = {
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "24px",
  borderLeft: "4px solid #f59e0b",
};

const taskTitleStyle = {
  color: "#1a1a2e",
  fontSize: "18px",
  fontWeight: "600",
  margin: "0",
};

const buttonSection = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const button = {
  backgroundColor: "#f59e0b",
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
