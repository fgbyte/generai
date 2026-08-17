import { env } from "@generai/env/server";

/**
 * Escape HTML special characters to prevent XSS.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "");
}

/**
 * Fire a Telegram message to the owner chat when a new user signs up.
 * Never throws — signup must not fail because of a notification.
 */
export async function notifySignup(user: {
  id: string;
  name: string;
  email: string;
}): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn("[auth] TELEGRAM bindings missing — skipping signup notification");
    return;
  }

  const message = `🚀 Nuevo signup

👤 Nombre: ${escapeHtml(user.name ?? "(sin nombre)")}
📧 Email: ${escapeHtml(user.email)}
🆔 User ID: ${user.id}
🕐 ${new Date().toISOString()}`;

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    },
  );

  if (!response.ok) {
    const body = (await response.json()) as { description?: string };
    throw new Error(
      `Telegram API error (${response.status}): ${body.description ?? "Unknown error"}`,
    );
  }
}