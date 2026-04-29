import nodemailer from "nodemailer";

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (cachedTransporter) return cachedTransporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");

  if (!user || !pass) {
    throw new Error(
      "Gmail SMTP not configured: GMAIL_USER and GMAIL_APP_PASSWORD must be set"
    );
  }

  cachedTransporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass },
  });

  return cachedTransporter;
}

export async function sendEmailViaGmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const transporter = getTransporter();
  const from = process.env.GMAIL_USER!;

  await transporter.sendMail({
    from: `Sadhana <${from}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
