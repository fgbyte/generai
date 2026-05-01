import { env } from "@generai/env/server";
import * as postmark from "postmark";

function getRequiredPostmarkToken() {
  const token = env.POSTMARK_SERVER_TOKEN;

  if (!token) {
    throw new Error("Missing POSTMARK_SERVER_TOKEN binding");
  }

  return token;
}

function getDefaultFromAddress() {
  const fromAddress = env.POSTMARK_FROM_EMAIL;

  if (!fromAddress) {
    throw new Error("Missing POSTMARK_FROM_EMAIL binding");
  }

  return fromAddress;
}

function getClient() {
  return new postmark.ServerClient(getRequiredPostmarkToken());
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tag?: string;
  attachments?: Array<{
    name: string;
    content: string; // Base64 encoded content
    contentType: string;
    contentId?: string;
  }>;
}

/**
 * Send an email using Postmark
 * @see https://postmarkapp.com/developer/user-guide/send-email-with-api
 */
export async function sendEmail(options: SendEmailOptions) {
  const { to, subject, html, text, from, replyTo, tag, attachments } = options;

  const fromAddress = from || getDefaultFromAddress();
  const toAddresses = Array.isArray(to) ? to.join(", ") : to;

  try {
    const response = await getClient().sendEmail({
      From: fromAddress,
      To: toAddresses,
      Subject: subject,
      HtmlBody: html,
      TextBody: text,
      ReplyTo: replyTo,
      Tag: tag,
      Attachments: attachments?.map((a) => ({
        Name: a.name,
        Content: a.content,
        ContentType: a.contentType,
        ContentID: a.contentId ?? null,
      })),
    });

    console.info("[mail] email sent", {
      messageId: response.MessageID,
      to: toAddresses,
      subject,
      tag,
    });
    return { success: true, messageId: response.MessageID };
  } catch (error) {
    console.error("[mail] email sending error", {
      to: toAddresses,
      subject,
      tag,
      error,
    });
    throw error;
  }
}

/**
 * Send an email using a Postmark template
 * @see https://postmarkapp.com/developer/user-guide/send-email-with-templates
 */
export async function sendTemplateEmail(options: {
  to: string | string[];
  templateId: number;
  templateModel: Record<string, unknown>;
  from?: string;
  tag?: string;
}) {
  const { to, templateId, templateModel, from, tag } = options;

  const fromAddress = from || getDefaultFromAddress();
  const toAddresses = Array.isArray(to) ? to.join(", ") : to;

  try {
    const response = await getClient().sendEmailWithTemplate({
      From: fromAddress,
      To: toAddresses,
      TemplateId: templateId,
      TemplateModel: templateModel,
      Tag: tag,
    });

    console.info("[mail] template email sent", {
      messageId: response.MessageID,
      to: toAddresses,
      templateId,
      tag,
    });
    return { success: true, messageId: response.MessageID };
  } catch (error) {
    console.error("[mail] template email sending error", {
      to: toAddresses,
      templateId,
      tag,
      error,
    });
    throw error;
  }
}

/**
 * Send batch emails (up to 500 per batch)
 * @see https://postmarkapp.com/developer/user-guide/send-email-with-api#batch-emails
 */
export async function sendBatchEmails(
  emails: Array<{
    to: string;
    subject: string;
    html?: string;
    text?: string;
    from?: string;
    tag?: string;
  }>,
) {
  const fromAddress = getDefaultFromAddress();

  const messages = emails.map((email) => ({
    From: email.from || fromAddress,
    To: email.to,
    Subject: email.subject,
    HtmlBody: email.html,
    TextBody: email.text,
    Tag: email.tag,
  }));

  try {
    const responses = await getClient().sendEmailBatch(messages);
    console.info("[mail] batch email sent", {
      count: responses.length,
    });
    return {
      success: true,
      results: responses.map((r) => ({
        messageId: r.MessageID,
        errorCode: r.ErrorCode,
        message: r.Message,
      })),
    };
  } catch (error) {
    console.error("[mail] batch email sending error", {
      count: emails.length,
      error,
    });
    throw error;
  }
}

/**
 * Get the raw Postmark SDK client for advanced usage.
 *
 * Use this when the helpers from this package (`sendEmail`,
 * `sendTemplateEmail`, `sendBatchEmails`) are not enough and you want to work
 * directly with the Postmark SDK inside a webhook, job, or domain service.
 *
 * Cliente Pro de Postmark as a service para tu aplicacion :D
 *
 * @example
 * ```ts
 * import { getPostmarkClient } from "@generai/mail";
 *
 * const postmark = getPostmarkClient();
 *
 * await postmark.sendEmail({
 *   From: "noreply@tuapp.com",
 *   To: "user@example.com",
 *   Subject: "Welcome!",
 *   HtmlBody: "<h1>Hola</h1><p>Tu cuenta ya esta lista.</p>",
 *   TextBody: "Hola, tu cuenta ya esta lista.",
 *   Tag: "welcome-email",
 * });
 * ```
 *
 * @returns A configured `postmark.ServerClient` instance using the worker env bindings.
 */
export function getPostmarkClient() {
  return getClient();
}

export const client = {
  sendEmail: (...args: Parameters<postmark.ServerClient["sendEmail"]>) =>
    getClient().sendEmail(...args),
  sendEmailWithTemplate: (...args: Parameters<postmark.ServerClient["sendEmailWithTemplate"]>) =>
    getClient().sendEmailWithTemplate(...args),
  sendEmailBatch: (...args: Parameters<postmark.ServerClient["sendEmailBatch"]>) =>
    getClient().sendEmailBatch(...args),
};
