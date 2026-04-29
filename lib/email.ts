import { sendEmailViaResend } from "@/lib/email/resend";
import { sendEmailViaGmail } from "@/lib/email/gmail";

type Provider = "gmail" | "resend";

function pickProvider(): Provider {
  const explicit = process.env.EMAIL_PROVIDER?.toLowerCase();
  if (explicit === "gmail" || explicit === "resend") return explicit;

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) return "gmail";
  if (process.env.RESEND_API_KEY) return "resend";

  throw new Error(
    "No email provider configured: set EMAIL_PROVIDER=gmail|resend and provide its credentials"
  );
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const provider = pickProvider();
  if (provider === "gmail") {
    await sendEmailViaGmail(params);
  } else {
    await sendEmailViaResend(params);
  }
}
