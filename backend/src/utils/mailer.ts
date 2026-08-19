import { Resend } from 'resend';
import config from '../config/index';

const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

export interface ContactEmailInput {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message: string;
}

/**
 * Sends the "someone submitted the contact form" notification to
 * config.contactEmailTo. Uses Resend (HTTPS API — no SMTP ports, so it
 * isn't affected by hosts that block outbound SMTP for serverless/edge
 * deployments the way Nodemailer+SMTP can be).
 */
export async function sendContactNotification(input: ContactEmailInput): Promise<void> {
  if (!resend) {
    throw new Error('Email is not configured (RESEND_API_KEY is missing)');
  }

  const lines = [
    `<p><strong>Name:</strong> ${escapeHtml(input.name)}</p>`,
    `<p><strong>Email:</strong> ${escapeHtml(input.email)}</p>`,
    input.phone ? `<p><strong>Phone:</strong> ${escapeHtml(input.phone)}</p>` : '',
    input.company ? `<p><strong>Company:</strong> ${escapeHtml(input.company)}</p>` : '',
    `<p><strong>Message:</strong></p><p>${escapeHtml(input.message).replace(/\n/g, '<br/>')}</p>`,
  ].filter(Boolean);

  const { error } = await resend.emails.send({
    from: config.contactEmailFrom,
    to: config.contactEmailTo,
    replyTo: input.email,
    subject: `New Craly contact form submission from ${input.name}`,
    html: lines.join('\n'),
  });

  if (error) {
    throw new Error(`Resend failed to send email: ${error.message}`);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
