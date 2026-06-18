import { env } from "@generai/env/server";
import * as postmark from "postmark";

function getPostmarkToken() {
  const token = env.POSTMARK_SERVER_TOKEN;
  if (!token) throw new Error("Missing POSTMARK_SERVER_TOKEN binding");
  return token;
}

function getDefaultFromAddress() {
  const fromAddress = env.POSTMARK_FROM_EMAIL;
  if (!fromAddress) throw new Error("Missing POSTMARK_FROM_EMAIL binding");
  return fromAddress;
}

function getClient() {
  return new postmark.ServerClient(getPostmarkToken());
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
    content: string;
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

  return getClient().sendEmail({
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
}
