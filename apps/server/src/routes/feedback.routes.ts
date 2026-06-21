import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware, type HonoEnv } from "../middlewares/auth-middleware";
import { sendFeedbackNotification } from "../lib/telegram";

const feedbackBodySchema = z.object({
  content: z.string().min(1).max(2000).trim(),
});

export const feedbackRoutes = new Hono<HonoEnv>()
  .use("*", authMiddleware)

  .post("/api/feedback", async (c) => {
    const user = c.get("user");

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const parsed = feedbackBodySchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: "Invalid request body", details: parsed.error.flatten() }, 400);
    }

    try {
      await sendFeedbackNotification(user.id, parsed.data.content);
      return c.json({ success: true }, 200);
    } catch {
      return c.json({ error: "Failed to send feedback" }, 500);
    }
  });
