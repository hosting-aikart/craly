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

export interface EnquiryReceivedEmailInput {
  to: string;
  contractorName: string;
  businessName: string;
  categoryName?: string;
  workersRequired?: number;
  location?: string;
  enquiryUrl: string;
}

/** Sent to the contractor the moment a business submits a new enquiry. */
export async function sendEnquiryReceivedEmail(input: EnquiryReceivedEmailInput): Promise<void> {
  if (!resend) {
    throw new Error('Email is not configured (RESEND_API_KEY is missing)');
  }

  const details = [
    input.categoryName ? `<p><strong>Requirement:</strong> ${escapeHtml(input.categoryName)}</p>` : '',
    input.workersRequired != null ? `<p><strong>Workers:</strong> ${input.workersRequired}</p>` : '',
    input.location ? `<p><strong>Location:</strong> ${escapeHtml(input.location)}</p>` : '',
  ].filter(Boolean).join('\n');

  const { error } = await resend.emails.send({
    from: config.contactEmailFrom,
    to: input.to,
    subject: 'You received a new business enquiry on Craly',
    html: `
      <p>Hi ${escapeHtml(input.contractorName)},</p>
      <p><strong>${escapeHtml(input.businessName)}</strong> has sent you a new enquiry on Craly.</p>
      ${details}
      <p><a href="${input.enquiryUrl}">View Enquiry</a></p>
    `,
  });

  if (error) {
    throw new Error(`Resend failed to send email: ${error.message}`);
  }
}

export interface EnquiryReplyEmailInput {
  to: string;
  businessName: string;
  contractorName: string;
  conversationUrl: string;
}

/** Sent to the business the first time a contractor replies to their enquiry. */
export async function sendEnquiryReplyEmail(input: EnquiryReplyEmailInput): Promise<void> {
  if (!resend) {
    throw new Error('Email is not configured (RESEND_API_KEY is missing)');
  }

  const { error } = await resend.emails.send({
    from: config.contactEmailFrom,
    to: input.to,
    subject: 'A contractor replied to your Craly enquiry',
    html: `
      <p>Hi ${escapeHtml(input.businessName)},</p>
      <p><strong>${escapeHtml(input.contractorName)}</strong> has replied to your enquiry.</p>
      <p><a href="${input.conversationUrl}">View Conversation</a></p>
    `,
  });

  if (error) {
    throw new Error(`Resend failed to send email: ${error.message}`);
  }
}

export interface EnquiryAcceptedEmailInput {
  to: string;
  businessName: string;
  contractorName: string;
  conversationUrl: string;
}

/** Sent to the business when a contractor accepts their project enquiry. */
export async function sendEnquiryAcceptedEmail(input: EnquiryAcceptedEmailInput): Promise<void> {
  if (!resend) {
    throw new Error('Email is not configured (RESEND_API_KEY is missing)');
  }

  const { error } = await resend.emails.send({
    from: config.contactEmailFrom,
    to: input.to,
    subject: 'Your Craly enquiry was accepted',
    html: `
      <p>Hi ${escapeHtml(input.businessName)},</p>
      <p><strong>${escapeHtml(input.contractorName)}</strong> has accepted your project enquiry.</p>
      <p>You can now chat in realtime and discuss your project requirements.</p>
      <p><a href="${input.conversationUrl}">Open Conversation</a></p>
    `,
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
