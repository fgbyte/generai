import { env } from "cloudflare:workers";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendFeedbackNotification(
  userId: string,
  content: string,
): Promise<void> {
  const escapedContent = escapeHtml(content);
  const message = `💬 Nuevo feedback

👤 User ID: ${userId}
📝 Contenido:
${escapedContent}

🕐 ${new Date().toISOString()}`;

  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
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
